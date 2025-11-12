/**
 * DeepScanCoordinator.js - Hybrid Scan Coordinator
 * Manages coordination between Deep Scan and Live Scan
 */

class DeepScanCoordinator {
    constructor(storage) {
        this.storage = storage;
        this.scanSystem = null;
        this.dbHandler = null;
        this.hybridSessions = new Map();
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        console.log('🚀 Initializing DeepScanCoordinator...');

        try {
            // Initialize dependencies
            if (typeof ScanSystem !== 'undefined') {
                this.scanSystem = new ScanSystem(this.storage);
                await this.scanSystem.init();
            }

            if (typeof DBHandler !== 'undefined') {
                this.dbHandler = new DBHandler();
                await this.dbHandler.init();
            }

            this.isInitialized = true;
            console.log('✅ DeepScanCoordinator initialized');

        } catch (error) {
            console.error('❌ DeepScanCoordinator initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start hybrid scanning session
     */
    async startHybridSession(tab) {
        if (!this.isInitialized) {
            throw new Error('DeepScanCoordinator not initialized');
        }

        console.log('🔄 DeepScanCoordinator: Starting hybrid session...');

        try {
            const sessionId = this.createHybridSession(tab);

            // Step 1: Perform initial Deep Scan
            console.log('🎯 Step 1: Performing initial Deep Scan...');
            const deepScanResult = await this.scanSystem.executeDeepScan(tab);
            
            // Step 2: Start Live Scan
            console.log('🔴 Step 2: Starting Live Scan...');
            const liveScanResult = await this.scanSystem.startLiveScan(tab);

            // Update session with initial data
            const session = this.hybridSessions.get(tab.id);
            session.deepScanId = deepScanResult.id;
            session.liveScanStarted = true;
            session.initialMessageCount = deepScanResult.messageCount;

            console.log(`✅ Hybrid session started: ${sessionId}`);
            console.log(`   - Deep Scan: ${deepScanResult.messageCount} messages`);
            console.log(`   - Live Scan: ${liveScanResult.success ? 'Active' : 'Failed'}`);

            return {
                sessionId: sessionId,
                deepScan: deepScanResult,
                liveScan: liveScanResult,
                message: 'Hybrid scanning session started'
            };

        } catch (error) {
            console.error('❌ Hybrid session start failed:', error);
            this.cleanupHybridSession(tab.id);
            throw error;
        }
    }

    /**
     * Stop hybrid scanning session and merge results
     */
    async stopHybridSession(tab) {
        if (!this.isInitialized) {
            throw new Error('DeepScanCoordinator not initialized');
        }

        console.log('⏹️ DeepScanCoordinator: Stopping hybrid session...');

        try {
            const session = this.hybridSessions.get(tab.id);
            if (!session) {
                throw new Error('No active hybrid session found');
            }

            // Step 1: Stop Live Scan
            console.log('🔴 Step 1: Stopping Live Scan...');
            await this.scanSystem.stopLiveScan(tab);

            // Step 2: Get Live Scan data
            console.log('📊 Step 2: Collecting Live Scan data...');
            const liveData = await this.collectLiveScanData(session);

            // Step 3: Merge with Deep Scan
            console.log('🔗 Step 3: Merging scan data...');
            const mergedResult = await this.mergeScanData(session, liveData);

            // Step 4: Cleanup session
            this.cleanupHybridSession(tab.id);

            console.log(`✅ Hybrid session stopped and merged`);
            console.log(`   - Initial messages: ${session.initialMessageCount}`);
            console.log(`   - Live messages: ${liveData.messageCount}`);
            console.log(`   - Total messages: ${mergedResult.statistics.totalMessages}`);

            return mergedResult;

        } catch (error) {
            console.error('❌ Hybrid session stop failed:', error);
            throw error;
        }
    }

    /**
     * Create hybrid scanning session
     */
    createHybridSession(tab) {
        const sessionId = `hybrid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const session = {
            sessionId: sessionId,
            tabId: tab.id,
            startTime: Date.now(),
            deepScanId: null,
            liveScanStarted: false,
            initialMessageCount: 0,
            liveMessageCount: 0,
            status: 'active'
        };

        this.hybridSessions.set(tab.id, session);
        
        console.log(`📝 DeepScanCoordinator: Created hybrid session ${sessionId} for tab ${tab.id}`);
        return sessionId;
    }

    /**
     * Collect Live Scan data for session
     */
    async collectLiveScanData(session) {
        if (!this.dbHandler) {
            throw new Error('DBHandler not available for data collection');
        }

        try {
            // Get live messages for this session
            const liveMessages = await this.dbHandler.getLiveSessionMessages(session.sessionId);
            
            // Get live session info
            const liveSession = await this.dbHandler.getLiveSession(session.sessionId);

            return {
                sessionId: session.sessionId,
                messageCount: liveMessages.length,
                messages: liveMessages,
                sessionInfo: liveSession,
                collectionTime: Date.now()
            };

        } catch (error) {
            console.error('❌ Failed to collect Live Scan data:', error);
            return {
                sessionId: session.sessionId,
                messageCount: 0,
                messages: [],
                sessionInfo: null,
                collectionTime: Date.now()
            };
        }
    }

    /**
     * Merge Deep Scan and Live Scan data
     */
    async mergeScanData(session, liveData) {
        if (!this.dbHandler) {
            throw new Error('DBHandler not available for data merging');
        }

        try {
            // Get Deep Scan data
            const deepScan = await this.dbHandler.getDeepScan(session.deepScanId);
            if (!deepScan) {
                throw new Error('Deep Scan data not found');
            }

            // Create merged result
            const mergedResult = {
                mergeId: `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                sessionId: session.sessionId,
                mergedAt: new Date().toISOString(),
                deepScan: deepScan,
                liveData: liveData,
                statistics: {
                    totalMessages: deepScan.messageCount + liveData.messageCount,
                    deepMessages: deepScan.messageCount,
                    liveMessages: liveData.messageCount,
                    timeRange: {
                        start: deepScan.timestamp,
                        end: new Date().toISOString(),
                        duration: Date.now() - deepScan.timestamp
                    },
                    efficiency: this.calculateEfficiency(deepScan.messageCount, liveData.messageCount)
                },
                metadata: {
                    tabId: session.tabId,
                    platform: deepScan.platform,
                    url: deepScan.url
                }
            };

            // Save merged result
            await this.dbHandler.saveMergedScan(mergedResult);

            return mergedResult;

        } catch (error) {
            console.error('❌ Scan data merge failed:', error);
            throw error;
        }
    }

    /**
     * Calculate scanning efficiency
     */
    calculateEfficiency(deepMessages, liveMessages) {
        const total = deepMessages + liveMessages;
        if (total === 0) return 0;

        // Efficiency formula: live messages should complement deep messages
        // Higher efficiency when live messages provide substantial additional data
        const efficiency = (liveMessages / total) * 100;
        return Math.min(efficiency, 100); // Cap at 100%
    }

    /**
     * Get hybrid session status
     */
    getHybridSessionStatus(tabId) {
        const session = this.hybridSessions.get(tabId);
        if (!session) return null;

        const now = Date.now();
        const duration = now - session.startTime;

        return {
            sessionId: session.sessionId,
            tabId: tabId,
            startTime: session.startTime,
            duration: duration,
            status: session.status,
            deepScanCompleted: !!session.deepScanId,
            liveScanActive: session.liveScanStarted,
            initialMessageCount: session.initialMessageCount,
            currentLiveMessageCount: session.liveMessageCount
        };
    }

    /**
     * Handle incoming live scan message
     */
    async handleLiveScanMessage(message, tabId) {
        const session = this.hybridSessions.get(tabId);
        if (!session || session.status !== 'active') return;

        // Update live message count
        session.liveMessageCount++;

        // Store message in session context
        if (this.dbHandler) {
            try {
                await this.dbHandler.storeLiveMessage({
                    ...message,
                    sessionId: session.sessionId,
                    metadata: {
                        ...message.metadata,
                        hybridSession: true,
                        tabId: tabId
                    }
                });
            } catch (error) {
                console.warn('⚠️ Failed to store live message in hybrid session:', error);
            }
        }
    }

    /**
     * Cleanup hybrid session
     */
    cleanupHybridSession(tabId) {
        const session = this.hybridSessions.get(tabId);
        if (session) {
            session.status = 'completed';
            session.endTime = Date.now();
            
            // Remove from active sessions after a delay
            setTimeout(() => {
                this.hybridSessions.delete(tabId);
                console.log(`🧹 DeepScanCoordinator: Removed completed session for tab ${tabId}`);
            }, 5000); // Keep for 5 seconds for any final operations
            
            console.log(`✅ DeepScanCoordinator: Session ${session.sessionId} marked as completed`);
        }
    }

    /**
     * Get all active hybrid sessions
     */
    getAllActiveSessions() {
        const sessions = [];
        
        this.hybridSessions.forEach((session, tabId) => {
            if (session.status === 'active') {
                sessions.push(this.getHybridSessionStatus(tabId));
            }
        });
        
        return sessions;
    }

    /**
     * Analyze scanning patterns and suggest optimizations
     */
    async analyzeScanningPatterns() {
        if (!this.dbHandler) {
            throw new Error('DBHandler not available for pattern analysis');
        }

        try {
            // Get recent scans
            const deepScans = await this.dbHandler.getAllDeepScans({ limit: 100 });
            const liveSessions = await this.dbHandler.getAllLiveSessions();

            const analysis = {
                totalScans: deepScans.length + liveSessions.length,
                deepScanStats: this.analyzeDeepScans(deepScans),
                liveScanStats: this.analyzeLiveSessions(liveSessions),
                recommendations: [],
                patterns: this.identifyPatterns(deepScans, liveSessions)
            };

            // Generate recommendations
            analysis.recommendations = this.generateRecommendations(analysis);

            return analysis;

        } catch (error) {
            console.error('❌ Pattern analysis failed:', error);
            throw error;
        }
    }

    /**
     * Analyze Deep Scan patterns
     */
    analyzeDeepScans(deepScans) {
        if (deepScans.length === 0) {
            return { total: 0, averageMessages: 0, platforms: {} };
        }

        const totalMessages = deepScans.reduce((sum, scan) => sum + (scan.messageCount || 0), 0);
        const platforms = {};
        
        deepScans.forEach(scan => {
            const platform = scan.platform || 'unknown';
            platforms[platform] = (platforms[platform] || 0) + 1;
        });

        return {
            total: deepScans.length,
            averageMessages: totalMessages / deepScans.length,
            platforms: platforms,
            messageEfficiency: this.calculateMessageEfficiency(deepScans)
        };
    }

    /**
     * Analyze Live Scan patterns
     */
    analyzeLiveSessions(liveSessions) {
        if (liveSessions.length === 0) {
            return { total: 0, averageDuration: 0, active: 0 };
        }

        const activeSessions = liveSessions.filter(s => s.status === 'active');
        const completedSessions = liveSessions.filter(s => s.status === 'completed');
        
        const totalDuration = completedSessions.reduce((sum, session) => {
            const duration = (session.endTime || Date.now()) - session.startTime;
            return sum + duration;
        }, 0);

        return {
            total: liveSessions.length,
            active: activeSessions.length,
            completed: completedSessions.length,
            averageDuration: completedSessions.length > 0 ? totalDuration / completedSessions.length : 0,
            totalMessages: liveSessions.reduce((sum, session) => sum + (session.messageCount || 0), 0)
        };
    }

    /**
     * Calculate message efficiency for Deep Scans
     */
    calculateMessageEfficiency(deepScans) {
        if (deepScans.length === 0) return 0;

        const efficiencies = deepScans.map(scan => {
            const data = scan.data;
            if (!data || !data.domSnapshot) return 0;
            
            // Simple efficiency: message count vs elements processed
            const elements = data.domSnapshot.totalElements || 1;
            return (scan.messageCount || 0) / elements;
        });

        return efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
    }

    /**
     * Identify scanning patterns
     */
    identifyPatterns(deepScans, liveSessions) {
        const patterns = {
            frequentPlatforms: this.getFrequentPlatforms(deepScans),
            optimalScanTimes: this.findOptimalScanTimes(deepScans),
            hybridEffectiveness: this.calculateHybridEffectiveness(deepScans, liveSessions)
        };

        return patterns;
    }

    /**
     * Get frequently scanned platforms
     */
    getFrequentPlatforms(deepScans) {
        const platforms = {};
        
        deepScans.forEach(scan => {
            const platform = scan.platform || 'unknown';
            platforms[platform] = (platforms[platform] || 0) + 1;
        });

        // Sort by frequency
        return Object.entries(platforms)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([platform, count]) => ({ platform, count }));
    }

    /**
     * Find optimal scan times
     */
    findOptimalScanTimes(deepScans) {
        const hourCounts = new Array(24).fill(0);
        
        deepScans.forEach(scan => {
            const hour = new Date(scan.timestamp).getHours();
            hourCounts[hour]++;
        });

        const maxCount = Math.max(...hourCounts);
        const optimalHours = hourCounts
            .map((count, hour) => ({ hour, count, efficiency: count / maxCount }))
            .filter(item => item.efficiency > 0.7)
            .sort((a, b) => b.count - a.count);

        return optimalHours;
    }

    /**
     * Calculate hybrid scanning effectiveness
     */
    calculateHybridEffectiveness(deepScans, liveSessions) {
        // This would require tracking which sessions were hybrid
        // For now, return a placeholder calculation
        const totalSessions = deepScans.length + liveSessions.length;
        if (totalSessions === 0) return 0;

        // Simple effectiveness metric
        return Math.min((liveSessions.length / totalSessions) * 100, 100);
    }

    /**
     * Generate optimization recommendations
     */
    generateRecommendations(analysis) {
        const recommendations = [];

        // Deep Scan recommendations
        if (analysis.deepScanStats.averageMessages < 10) {
            recommendations.push({
                type: 'deep_scan',
                priority: 'high',
                message: 'Low message yield in Deep Scans. Consider scanning more active chat pages.',
                suggestion: 'Focus on pages with visible chat activity for better results.'
            });
        }

        // Live Scan recommendations
        if (analysis.liveScanStats.averageDuration < 30000) { // 30 seconds
            recommendations.push({
                type: 'live_scan',
                priority: 'medium',
                message: 'Live Scan sessions are very short. Longer sessions capture more messages.',
                suggestion: 'Keep Live Scan active during active conversations.'
            });
        }

        // Hybrid recommendations
        if (analysis.patterns.hybridEffectiveness < 50) {
            recommendations.push({
                type: 'hybrid',
                priority: 'low',
                message: 'Consider using hybrid scanning for comprehensive coverage.',
                suggestion: 'Start with Deep Scan, then enable Live Scan for continuous monitoring.'
            });
        }

        return recommendations;
    }

    // Utility methods
    isInitialized() {
        return this.isInitialized;
    }

    getActiveSessionCount() {
        let count = 0;
        this.hybridSessions.forEach(session => {
            if (session.status === 'active') count++;
        });
        return count;
    }

    getSessionStatistics() {
        const stats = {
            totalSessions: this.hybridSessions.size,
            activeSessions: this.getActiveSessionCount(),
            completedSessions: Array.from(this.hybridSessions.values()).filter(s => s.status === 'completed').length
        };

        return stats;
    }
}

// Global registration
if (typeof self !== 'undefined') {
    self.DeepScanCoordinator = DeepScanCoordinator;
}

console.log('✅ DeepScanCoordinator class loaded');