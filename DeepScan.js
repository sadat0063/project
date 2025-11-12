/**
 * DeepScan.js - Comprehensive DOM Snapshot Scanner
 * Advanced scanning with checksum and structure analysis
 */

class DeepScan {
    constructor() {
        this.version = '2.0.0';
        this.scanConfig = {
            maxElements: 1000,
            textLengthLimit: 500,
            includeMetadata: true,
            generateChecksum: true,
            analyzeStructure: true
        };
    }

    /**
     * Perform comprehensive deep scan
     */
    async performDeepScan(tab) {
        console.log('🎯 DeepScan: Starting comprehensive scan...');

        const scanStartTime = Date.now();
        
        try {
            // Capture DOM snapshot
            const domSnapshot = await this.captureDOMSnapshot();
            
            // Analyze chat structure
            const structureAnalysis = this.analyzeChatStructure();
            
            // Extract content
            const contentExtraction = this.extractContent();
            
            // Generate metadata
            const metadata = this.generateMetadata(tab, scanStartTime);

            const result = {
                scanType: 'deep',
                timestamp: scanStartTime,
                url: tab?.url || window.location.href,
                title: tab?.title || document.title,
                platform: this.detectPlatform(),
                metadata: metadata,
                domSnapshot: domSnapshot,
                structureAnalysis: structureAnalysis,
                content: contentExtraction,
                messageCount: contentExtraction.messages.length,
                checksum: this.generateChecksum(domSnapshot),
                performance: {
                    scanDuration: Date.now() - scanStartTime,
                    elementsProcessed: domSnapshot.totalElements
                }
            };

            console.log(`✅ DeepScan completed: ${result.messageCount} messages, ${result.performance.scanDuration}ms`);
            return result;

        } catch (error) {
            console.error('❌ DeepScan failed:', error);
            throw error;
        }
    }

    /**
     * Capture comprehensive DOM snapshot
     */
    captureDOMSnapshot() {
        const snapshot = {
            timestamp: Date.now(),
            url: window.location.href,
            title: document.title,
            totalElements: 0,
            chatElements: [],
            inputElements: [],
            mediaElements: [],
            structure: {}
        };

        // Chat-related elements
        const chatSelectors = [
            '[class*="chat"]', '[class*="message"]', '[class*="msg"]',
            '[class*="conversation"]', '[class*="discussion"]',
            '.message', '.chat', '.msg', '.conversation',
            '[role="log"]', '[aria-live="polite"]',
            '[data-testid*="message"]', '[aria-label*="message"]'
        ];

        chatSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (this.isElementVisible(element)) {
                    snapshot.chatElements.push(this.createElementInfo(element, selector));
                }
            });
        });

        // Input elements
        const inputSelectors = [
            '[contenteditable="true"]', '[role="textbox"]',
            'textarea', 'input[type="text"]'
        ];

        inputSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (this.isElementVisible(element)) {
                    snapshot.inputElements.push(this.createElementInfo(element, selector));
                }
            });
        });

        // Media elements
        const mediaSelectors = ['img', 'video', 'audio'];
        mediaSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (this.isElementVisible(element)) {
                    snapshot.mediaElements.push(this.createElementInfo(element, selector));
                }
            });
        });

        snapshot.totalElements = snapshot.chatElements.length + 
                               snapshot.inputElements.length + 
                               snapshot.mediaElements.length;

        // Analyze DOM structure
        snapshot.structure = this.analyzeDOMStructure();

        return snapshot;
    }

    /**
     * Analyze chat structure and patterns
     */
    analyzeChatStructure() {
        const messages = this.extractMessages();
        const users = this.extractUsers();
        const timeline = this.analyzeTimeline(messages);

        return {
            messageCount: messages.length,
            userCount: users.length,
            timeline: timeline,
            patterns: {
                hasThreads: this.hasThreadStructure(),
                hasReplies: this.hasReplyStructure(),
                hasReactions: this.hasReactionElements(),
                hasMedia: messages.some(msg => msg.hasMedia),
                averageMessageLength: this.calculateAverageLength(messages)
            },
            containers: this.findChatContainers()
        };
    }

    /**
     * Extract message content with context
     */
    extractContent() {
        const messages = this.extractMessages();
        const users = this.extractUsers();
        const media = this.extractMedia();

        return {
            messages: messages,
            users: users,
            media: media,
            statistics: {
                totalMessages: messages.length,
                totalUsers: users.length,
                totalMedia: media.length,
                messagesWithMedia: messages.filter(msg => msg.hasMedia).length
            }
        };
    }

    /**
     * Extract messages with detailed information
     */
    extractMessages() {
        const messages = [];
        const selectors = [
            '[class*="message"]', '[class*="msg"]', 
            '.message', '.msg', '[role="listitem"]',
            '[data-testid*="message"]', '[aria-label*="message"]'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (this.isElementVisible(element) && element.textContent?.trim()) {
                    const text = element.textContent.trim();
                    if (text.length > 2) { // Filter out empty messages
                        const message = {
                            text: text.substring(0, this.scanConfig.textLengthLimit),
                            originalLength: text.length,
                            element: selector,
                            timestamp: this.extractTimestamp(element),
                            hasMedia: this.hasMediaContent(element),
                            user: this.extractUserFromMessage(element),
                            context: this.extractMessageContext(element)
                        };
                        messages.push(message);
                    }
                }
            });
        });

        return messages.slice(0, this.scanConfig.maxElements);
    }

    /**
     * Extract user information
     */
    extractUsers() {
        const users = new Map(); // Use Map to avoid duplicates

        const selectors = [
            '[class*="user"]', '[class*="member"]', 
            '.user', '.member', '[data-user]',
            '[aria-label*="user"]', '[title*="user"]'
        ];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (this.isElementVisible(element)) {
                    const userInfo = this.extractUserInfo(element);
                    if (userInfo.name || userInfo.id) {
                        const key = userInfo.id || userInfo.name;
                        if (!users.has(key)) {
                            users.set(key, userInfo);
                        }
                    }
                }
            });
        });

        return Array.from(users.values()).slice(0, 50);
    }

    /**
     * Extract media elements
     */
    extractMedia() {
        const media = [];
        const selectors = ['img', 'video', 'audio', '[class*="media"]', '[class*="image"]'];

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (this.isElementVisible(element)) {
                    media.push({
                        type: element.tagName.toLowerCase(),
                        src: element.src || element.href || '',
                        alt: element.alt || '',
                        class: element.className,
                        dimensions: this.getElementDimensions(element),
                        parentContext: this.getParentContext(element)
                    });
                }
            });
        });

        return media.slice(0, 100);
    }

    /**
     * Generate scan metadata
     */
    generateMetadata(tab, startTime) {
        return {
            scanId: `deep_${startTime}_${Math.random().toString(36).substr(2, 9)}`,
            startTime: startTime,
            endTime: Date.now(),
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            url: tab?.url || window.location.href,
            title: tab?.title || document.title,
            platform: this.detectPlatform(),
            config: this.scanConfig
        };
    }

    /**
     * Generate checksum for data integrity
     */
    generateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        
        if (str.length === 0) return hash.toString(36);
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return Math.abs(hash).toString(36);
    }

    // Helper methods
    createElementInfo(element, selector) {
        return {
            selector: selector,
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            text: element.textContent?.substring(0, 200) || '',
            children: element.children.length,
            attributes: this.getSignificantAttributes(element),
            position: this.getElementPosition(element),
            visible: this.isElementVisible(element)
        };
    }

    isElementVisible(el) {
        if (!el) return false;
        
        // Basic visibility check
        const style = window.getComputedStyle(el);
        const isVisible = style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         style.opacity !== '0' &&
                         el.offsetWidth > 0 && 
                         el.offsetHeight > 0;
        
        if (!isVisible) return false;
        
        // Check if element is within viewport
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    detectPlatform() {
        const url = window.location.href.toLowerCase();
        const hostname = window.location.hostname;
        
        const platforms = {
            'web.telegram.org': 'Telegram',
            'web.whatsapp.com': 'WhatsApp', 
            'messenger.com': 'Messenger',
            'discord.com': 'Discord',
            'chat.openai.com': 'ChatGPT',
            'chat.deepseek.com': 'DeepSeek',
            'slack.com': 'Slack',
            'teams.microsoft.com': 'Teams'
        };
        
        for (const [domain, platform] of Object.entries(platforms)) {
            if (hostname.includes(domain)) return platform;
        }
        
        // Check for meta tags
        const metaPlatform = document.querySelector('meta[name="application-name"]');
        if (metaPlatform) {
            const content = metaPlatform.getAttribute('content')?.toLowerCase();
            if (content?.includes('telegram')) return 'Telegram';
            if (content?.includes('whatsapp')) return 'WhatsApp';
            if (content?.includes('discord')) return 'Discord';
        }
        
        return 'Web';
    }

    extractTimestamp(element) {
        // Look for timestamp in various locations
        const timeSelectors = [
            'time', '[class*="time"]', '[class*="timestamp"]',
            '[data-time]', '[datetime]'
        ];
        
        for (const selector of timeSelectors) {
            const timeEl = element.querySelector?.(selector) || 
                          element.parentElement?.querySelector?.(selector) ||
                          element.previousElementSibling?.querySelector?.(selector);
            
            if (timeEl) {
                const datetime = timeEl.getAttribute('datetime');
                const text = timeEl.textContent?.trim();
                
                if (datetime) return datetime;
                if (text) return text;
            }
        }
        
        return new Date().toISOString();
    }

    extractUserFromMessage(element) {
        // Look for user information near the message
        const userSelectors = [
            '[class*="user"]', '[class*="author"]', '[class*="sender"]',
            '[data-user]', '[data-author]'
        ];
        
        for (const selector of userSelectors) {
            const userEl = element.querySelector?.(selector) || 
                          element.previousElementSibling?.querySelector?.(selector) ||
                          element.parentElement?.querySelector?.(selector);
            
            if (userEl) {
                return {
                    name: userEl.textContent?.trim() || '',
                    element: selector
                };
            }
        }
        
        return null;
    }

    extractUserInfo(element) {
        return {
            name: element.textContent?.trim().substring(0, 50) || '',
            id: element.getAttribute('data-user') || element.id || '',
            element: element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''),
            avatar: element.querySelector?.('img')?.src || ''
        };
    }

    hasMediaContent(element) {
        return element.querySelector?.('img, video, audio') !== null;
    }

    extractMessageContext(element) {
        const context = {
            hasReplies: !!element.querySelector?.['[class*="reply"]'],
            hasReactions: !!element.querySelector?.['[class*="reaction"]'],
            isEdited: element.textContent?.includes('edited') || false,
            parentType: this.getParentType(element)
        };
        
        return context;
    }

    getParentType(element) {
        const parent = element.parentElement;
        if (!parent) return 'root';
        
        const parentClass = parent.className?.toLowerCase() || '';
        if (parentClass.includes('thread')) return 'thread';
        if (parentClass.includes('group')) return 'group';
        if (parentClass.includes('chat')) return 'chat';
        
        return 'general';
    }

    analyzeDOMStructure() {
        return {
            depth: this.calculateDOMDepth(),
            chatContainers: this.findChatContainers().length,
            hasMultipleChats: this.hasMultipleChatContainers(),
            scrollableContainers: this.findScrollableContainers().length
        };
    }

    calculateDOMDepth() {
        let maxDepth = 0;
        
        function getDepth(node, depth) {
            if (node.children.length === 0) {
                maxDepth = Math.max(maxDepth, depth);
            } else {
                for (let child of node.children) {
                    getDepth(child, depth + 1);
                }
            }
        }
        
        getDepth(document.documentElement, 0);
        return maxDepth;
    }

    findChatContainers() {
        const containers = [];
        const selectors = [
            '[class*="chat"]', '[class*="message"]', 
            '[class*="conversation"]', '[role="log"]'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (this.isElementVisible(element) && element.children.length > 0) {
                    containers.push({
                        selector: selector,
                        childCount: element.children.length,
                        hasScroll: element.scrollHeight > element.clientHeight,
                        depth: this.calculateElementDepth(element)
                    });
                }
            });
        });
        
        return containers;
    }

    findScrollableContainers() {
        const scrollable = [];
        const elements = document.querySelectorAll('*');
        
        elements.forEach(element => {
            if (element.scrollHeight > element.clientHeight && 
                (element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight)) {
                scrollable.push({
                    element: element.tagName,
                    className: element.className,
                    scrollHeight: element.scrollHeight,
                    clientHeight: element.clientHeight
                });
            }
        });
        
        return scrollable.slice(0, 10);
    }

    calculateElementDepth(element) {
        let depth = 0;
        let current = element;
        
        while (current.children.length > 0) {
            depth++;
            current = current.children[0];
        }
        
        return depth;
    }

    analyzeTimeline(messages) {
        if (messages.length === 0) return { range: null, density: 0 };
        
        const timestamps = messages.map(msg => new Date(msg.timestamp).getTime()).filter(ts => !isNaN(ts));
        
        if (timestamps.length === 0) return { range: null, density: 0 };
        
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const timeRange = maxTime - minTime;
        
        return {
            range: {
                start: new Date(minTime).toISOString(),
                end: new Date(maxTime).toISOString(),
                duration: timeRange
            },
            density: messages.length / (timeRange / (1000 * 60 * 60)), // messages per hour
            messageCount: messages.length
        };
    }

    hasThreadStructure() {
        return document.querySelector('[class*="thread"]') !== null;
    }

    hasReplyStructure() {
        return document.querySelector('[class*="reply"]') !== null;
    }

    hasReactionElements() {
        return document.querySelector('[class*="reaction"]') !== null;
    }

    hasMultipleChatContainers() {
        return this.findChatContainers().length > 1;
    }

    calculateAverageLength(messages) {
        if (messages.length === 0) return 0;
        return messages.reduce((sum, msg) => sum + msg.text.length, 0) / messages.length;
    }

    getSignificantAttributes(element) {
        const attributes = {};
        const significantAttrs = ['id', 'class', 'data-id', 'data-user', 'data-time', 'role', 'aria-label'];
        
        significantAttrs.forEach(attr => {
            if (element.hasAttribute(attr)) {
                attributes[attr] = element.getAttribute(attr);
            }
        });
        
        return attributes;
    }

    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            inViewport: rect.top < window.innerHeight && rect.bottom > 0
        };
    }

    getElementDimensions(element) {
        return {
            width: element.offsetWidth,
            height: element.offsetHeight,
            naturalWidth: element.naturalWidth,
            naturalHeight: element.naturalHeight
        };
    }

    getParentContext(element) {
        const parent = element.parentElement;
        if (!parent) return null;
        
        return {
            tagName: parent.tagName,
            className: parent.className,
            id: parent.id
        };
    }
}

// Global registration
if (typeof self !== 'undefined') {
    self.DeepScan = DeepScan;
}

console.log('✅ DeepScan class loaded');