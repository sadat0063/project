/**
 * LiveScanManager.js - Real-time Chat Monitoring with MutationObserver
 * Handles continuous scanning and streaming data
 */

class LiveScanManager {
    constructor(storage) {
        this.storage = storage;
        this.observers = new Map();
        this.sessions = new Map();
        this.messageBuffer = new Map();
        this.bufferSize = 10;
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            scanInterval: 1000,
            maxBufferSize: 50,
            debounceTime: 500,
            includeMetadata: true,
            trackUserActivity: true
        };
    }

    async init() {
        if (this.isInitialized) return;

        console.log('🚀 Initializing LiveScanManager...');

        try {
            // Load configuration from storage
            const savedConfig = await this.storage.getItem('liveScanConfig');
            if (savedConfig) {
                this.config = { ...this.config, ...savedConfig };
            }

            // Restore active sessions
            await this.restoreSessions();

            this.isInitialized = true;
            console.log('✅ LiveScanManager initialized');

        } catch (error) {
            console.error('❌ LiveScanManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start monitoring a tab for real-time changes
     */
    async startMonitoring(tab) {
        if (!this.isInitialized) {
            throw new Error('LiveScanManager not initialized');
        }

        console.log(`🔄 LiveScanManager: Starting monitoring for tab ${tab.id}`);

        try {
            // Create session
            const sessionId = this.createSession(tab);
            
            // Inject content script if not already done
            await this.ensureContentScriptInjected(tab.id);
            
            // Start monitoring via content script
            const response = await this.sendMessageToTab(tab.id, {
                action: 'START_LIVE_SCAN',
                sessionId: sessionId,
                config: this.config
            });

            if (response && response.success) {
                // Store session
                this.sessions.set(tab.id, {
                    sessionId: sessionId,
                    startTime: Date.now(),
                    tab: tab,
                    messageCount: 0,
                    lastActivity: Date.now(),
                    status: 'active'
                });

                // Initialize message buffer
                this.messageBuffer.set(tab.id, []);

                console.log(`✅ LiveScanManager: Monitoring started for tab ${tab.id}`);
                return { success: true, sessionId: sessionId };
            } else {
                throw new Error(response?.error || 'Failed to start monitoring');
            }

        } catch (error) {
            console.error(`❌ LiveScanManager: Failed to start monitoring for tab ${tab.id}:`, error);
            this.cleanupSession(tab.id);
            throw error;
        }
    }

    /**
     * Stop monitoring a tab
     */
    async stopMonitoring(tab) {
        if (!this.isInitialized) {
            throw new Error('LiveScanManager not initialized');
        }

        console.log(`⏹️ LiveScanManager: Stopping monitoring for tab ${tab.id}`);

        try {
            // Send stop command to content script
            const response = await this.sendMessageToTab(tab.id, {
                action: 'STOP_LIVE_SCAN'
            });

            // Cleanup session
            this.cleanupSession(tab.id);

            console.log(`✅ LiveScanManager: Monitoring stopped for tab ${tab.id}`);
            return { success: true };

        } catch (error) {
            console.error(`❌ LiveScanManager: Failed to stop monitoring for tab ${tab.id}:`, error);
            throw error;
        }
    }

    /**
     * Handle incoming live scan data
     */
    async handleLiveScanData(data, tabId) {
        if (!this.isInitialized) return;

        const session = this.sessions.get(tabId);
        if (!session || session.status !== 'active') {
            console.warn(`⚠️ LiveScanManager: Received data for inactive session, tab ${tabId}`);
            return;
        }

        try {
            // Update session activity
            session.lastActivity = Date.now();
            session.messageCount += data.messages?.length || 0;

            // Buffer messages
            this.bufferMessages(tabId, data);

            // Process data
            await this.processLiveData(data, session);

            // Save session state periodically
            if (session.messageCount % 10 === 0) {
                await this.saveSessionState(session);
            }

        } catch (error) {
            console.error(`❌ LiveScanManager: Failed to process live data for tab ${tabId}:`, error);
        }
    }

    /**
     * Handle individual live scan message
     */
    async handleLiveScanMessage(message, tabId) {
        if (!this.isInitialized) return;

        const session = this.sessions.get(tabId);
        if (!session) return;

        try {
            // Create message record
            const messageRecord = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                sessionId: session.sessionId,
                timestamp: message.timestamp || Date.now(),
                type: message.type || 'message',
                content: message.text || message.content,
                metadata: {
                    tabId: tabId,
                    url: session.tab.url,
                    platform: this.detectPlatform(session.tab.url)
                }
            };

            // Store message
            await this.storeMessage(messageRecord);

            // Update session
            session.messageCount++;
            session.lastActivity = Date.now();

            // Broadcast to popups for real-time updates
            this.broadcastMessageUpdate(messageRecord);

        } catch (error) {
            console.error(`❌ LiveScanManager: Failed to handle live message for tab ${tabId}:`, error);
        }
    }

    /**
     * Check if a tab is being monitored
     */
    isMonitoring(tabId) {
        const session = this.sessions.get(tabId);
        return !!(session && session.status === 'active');
    }

    /**
     * Get message count for a session
     */
    getMessageCount(tabId) {
        const session = this.sessions.get(tabId);
        return session ? session.messageCount : 0;
    }

    /**
     * Get session statistics
     */
    getSessionStats(tabId) {
        const session = this.sessions.get(tabId);
        if (!session) return null;

        const now = Date.now();
        const duration = now - session.startTime;

        return {
            sessionId: session.sessionId,
            tabId: tabId,
            startTime: session.startTime,
            duration: duration,
            messageCount: session.messageCount,
            lastActivity: session.lastActivity,
            status: session.status,
            messageRate: duration > 0 ? (session.messageCount / (duration / 1000)) : 0 // messages per second
        };
    }

    /**
     * Get all active sessions
     */
    getAllSessions() {
        const sessions = [];
        
        this.sessions.forEach((session, tabId) => {
            if (session.status === 'active') {
                sessions.push(this.getSessionStats(tabId));
            }
        });
        
        return sessions;
    }

    /**
     * Cleanup inactive sessions
     */
    async cleanupInactiveSessions(maxInactiveTime = 5 * 60 * 1000) { // 5 minutes
        const now = Date.now();
        let cleanedCount = 0;

        this.sessions.forEach((session, tabId) => {
            if (session.status === 'active' && (now - session.lastActivity) > maxInactiveTime) {
                console.log(`🧹 LiveScanManager: Cleaning up inactive session for tab ${tabId}`);
                this.cleanupSession(tabId);
                cleanedCount++;
            }
        });

        if (cleanedCount > 0) {
            console.log(`✅ LiveScanManager: Cleaned up ${cleanedCount} inactive sessions`);
        }

        return { cleanedCount };
    }

    /**
     * Update configuration
     */
    async updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Save to storage
        await this.storage.setItem('liveScanConfig', this.config);
        
        // Broadcast config update to all active sessions
        this.broadcastConfigUpdate();
        
        console.log('✅ LiveScanManager: Configuration updated');
        return this.config;
    }

    // Internal methods
    createSession(tab) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`📝 LiveScanManager: Created session ${sessionId} for tab ${tab.id}`);
        return sessionId;
    }

    async ensureContentScriptInjected(tabId) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, { action: 'PING' }, (response) => {
                if (chrome.runtime.lastError) {
                    // Content script not injected, but we'll rely on the manual injection
                    console.log(`⚠️ LiveScanManager: Content script not ready for tab ${tabId}, will use manual injection`);
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    sendMessageToTab(tabId, message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    bufferMessages(tabId, data) {
        if (!this.messageBuffer.has(tabId)) {
            this.messageBuffer.set(tabId, []);
        }

        const buffer = this.messageBuffer.get(tabId);
        buffer.push(...(data.messages || []));

        // Flush buffer if it exceeds max size
        if (buffer.length >= this.config.maxBufferSize) {
            this.flushBuffer(tabId);
        }
    }

    flushBuffer(tabId) {
        const buffer = this.messageBuffer.get(tabId);
        if (!buffer || buffer.length === 0) return;

        const session = this.sessions.get(tabId);
        if (!session) return;

        // Process buffered messages
        const chunk = {
            sessionId: session.sessionId,
            timestamp: Date.now(),
            messages: [...buffer],
            metadata: {
                tabId: tabId,
                url: session.tab.url,
                platform: this.detectPlatform(session.tab.url),
                chunkSize: buffer.length
            }
        };

        // Store chunk
        this.storeChunk(chunk);

        // Clear buffer
        this.messageBuffer.set(tabId, []);

        console.log(`💾 LiveScanManager: Flushed buffer for tab ${tabId}, ${buffer.length} messages`);
    }

    async processLiveData(data, session) {
        // Add session metadata to data
        const enhancedData = {
            ...data,
            sessionId: session.sessionId,
            tabId: session.tab.id,
            url: session.tab.url,
            platform: this.detectPlatform(session.tab.url),
            processedAt: Date.now()
        };

        // Store in database if available
        if (typeof DBHandler !== 'undefined') {
            try {
                const dbHandler = new DBHandler();
                await dbHandler.storeLiveScanData(enhancedData);
            } catch (error) {
                console.warn('⚠️ LiveScanManager: DBHandler not available, using fallback storage');
            }
        }

        // Fallback to local storage
        await this.storeInFallbackStorage(enhancedData);
    }

    async storeMessage(message) {
        // Store in database if available
        if (typeof DBHandler !== 'undefined') {
            try {
                const dbHandler = new DBHandler();
                await dbHandler.storeLiveMessage(message);
                return;
            } catch (error) {
                // Fall through to fallback storage
            }
        }

        // Fallback to local storage
        await this.storeMessageInFallback(message);
    }

    async storeChunk(chunk) {
        // Store in database if available
        if (typeof DBHandler !== 'undefined') {
            try {
                const dbHandler = new DBHandler();
                await dbHandler.storeLiveChunk(chunk);
                return;
            } catch (error) {
                // Fall through to fallback storage
            }
        }

        // Fallback to local storage
        await this.storeChunkInFallback(chunk);
    }

    async storeInFallbackStorage(data) {
        try {
            let liveData = await this.storage.getItem('liveScanData') || [];
            if (!Array.isArray(liveData)) liveData = [];

            liveData.push({
                id: `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...data,
                storedAt: Date.now()
            });

            // Keep only recent data
            if (liveData.length > 1000) {
                liveData = liveData.slice(-1000);
            }

            await this.storage.setItem('liveScanData', liveData);

        } catch (error) {
            console.error('❌ LiveScanManager: Failed to store data in fallback storage:', error);
        }
    }

    async storeMessageInFallback(message) {
        try {
            let messages = await this.storage.getItem('liveScanMessages') || [];
            if (!Array.isArray(messages)) messages = [];

            messages.push(message);

            // Keep only recent messages
            if (messages.length > 2000) {
                messages = messages.slice(-2000);
            }

            await this.storage.setItem('liveScanMessages', messages);

        } catch (error) {
            console.error('❌ LiveScanManager: Failed to store message in fallback storage:', error);
        }
    }

    async storeChunkInFallback(chunk) {
        try {
            let chunks = await this.storage.getItem('liveScanChunks') || [];
            if (!Array.isArray(chunks)) chunks = [];

            chunks.push(chunk);

            // Keep only recent chunks
            if (chunks.length > 100) {
                chunks = chunks.slice(-100);
            }

            await this.storage.setItem('liveScanChunks', chunks);

        } catch (error) {
            console.error('❌ LiveScanManager: Failed to store chunk in fallback storage:', error);
        }
    }

    async saveSessionState(session) {
        try {
            let sessions = await this.storage.getItem('liveScanSessions') || {};
            
            sessions[session.tab.id] = {
                sessionId: session.sessionId,
                startTime: session.startTime,
                tab: session.tab,
                messageCount: session.messageCount,
                lastActivity: session.lastActivity,
                status: session.status
            };

            await this.storage.setItem('liveScanSessions', sessions);

        } catch (error) {
            console.error('❌ LiveScanManager: Failed to save session state:', error);
        }
    }

    async restoreSessions() {
        try {
            const sessions = await this.storage.getItem('liveScanSessions') || {};
            
            for (const [tabId, sessionData] of Object.entries(sessions)) {
                if (sessionData.status === 'active') {
                    // Check if session is still valid (less than 1 hour old)
                    const sessionAge = Date.now() - sessionData.lastActivity;
                    if (sessionAge < 60 * 60 * 1000) { // 1 hour
                        this.sessions.set(parseInt(tabId), sessionData);
                        this.messageBuffer.set(parseInt(tabId), []);
                        console.log(`♻️ LiveScanManager: Restored session for tab ${tabId}`);
                    } else {
                        // Session is too old, mark as expired
                        sessionData.status = 'expired';
                    }
                }
            }

            // Save updated sessions
            await this.storage.setItem('liveScanSessions', sessions);

        } catch (error) {
            console.error('❌ LiveScanManager: Failed to restore sessions:', error);
        }
    }

    cleanupSession(tabId) {
        const session = this.sessions.get(tabId);
        if (session) {
            // Flush any remaining buffer
            this.flushBuffer(tabId);
            
            // Update session status
            session.status = 'stopped';
            session.endTime = Date.now();
            
            // Save final session state
            this.saveSessionState(session);
            
            // Remove from active sessions
            this.sessions.delete(tabId);
            this.messageBuffer.delete(tabId);
            
            console.log(`🧹 LiveScanManager: Cleaned up session for tab ${tabId}`);
        }
    }

    broadcastMessageUpdate(message) {
        // This would typically send to all connected popups
        // For now, we'll just log it
        console.log('📢 LiveScanManager: New message update', message);
    }

    broadcastConfigUpdate() {
        // Broadcast config changes to all active sessions
        this.sessions.forEach((session, tabId) => {
            if (session.status === 'active') {
                this.sendMessageToTab(tabId, {
                    action: 'UPDATE_CONFIG',
                    config: this.config
                }).catch(error => {
                    console.warn(`⚠️ LiveScanManager: Failed to update config for tab ${tabId}:`, error);
                });
            }
        });
    }

    detectPlatform(url) {
        if (!url) return 'unknown';
        
        const urlLower = url.toLowerCase();
        if (urlLower.includes('web.telegram.org')) return 'Telegram';
        if (urlLower.includes('web.whatsapp.com')) return 'WhatsApp';
        if (urlLower.includes('messenger.com')) return 'Messenger';
        if (urlLower.includes('discord.com')) return 'Discord';
        if (urlLower.includes('chat.openai.com')) return 'ChatGPT';
        if (urlLower.includes('chat.deepseek.com')) return 'DeepSeek';
        if (urlLower.includes('slack.com')) return 'Slack';
        
        return 'Web';
    }

    // Utility methods
    getConfig() {
        return { ...this.config };
    }

    getActiveSessionCount() {
        let count = 0;
        this.sessions.forEach(session => {
            if (session.status === 'active') count++;
        });
        return count;
    }

    getTotalMessageCount() {
        let total = 0;
        this.sessions.forEach(session => {
            total += session.messageCount;
        });
        return total;
    }

    isInitialized() {
        return this.isInitialized;
    }
}

// Global registration
if (typeof self !== 'undefined') {
    self.LiveScanManager = LiveScanManager;
}

console.log('✅ LiveScanManager class loaded');