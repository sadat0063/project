console.log('🔍 ChatSavePro Content Script v3.0 loaded');

class ChatSaveContentScript {
    constructor() {
        this.isInitialized = false;
        this.liveScanActive = false;
        this.mutationObserver = null;
        this.messageCache = new Set();
        this.isChromeEnv = typeof chrome !== 'undefined' && chrome.runtime;
        this.scanConfig = {
            maxScanTime: 30000,
            scanInterval: 1000,
            messageSelectors: [
                '[data-testid^="conversation-turn"]',
                '.text-token-text-primary',
                '.whitespace-pre-wrap',
                '.message',
                '.chat-message',
                '.conversation-item',
                '[class*="message"]',
                '.bubble',
                '.text-content',
                '.message-in',
                '.message-out',
                '.selectable-text',
                '[aria-label*="Message"]',
                '.msg',
                '.markup',
                '.messageContent',
                '[class*="chat"]',
                '[class*="bubble"]',
                '[class*="text"]'
            ],
            platformSelectors: {
                chatgpt: ['#__next', '[data-testid*="conversation"]'],
                deepseek: ['[class*="deepseek"]', '.chat-container'],
                telegram: ['.tg-page', '.telegram'],
                whatsapp: ['[data-testid*="conversation"]', '.two'],
                messenger: ['[role="main"]', '[aria-label*="Messenger"]'],
                discord: '[class*="app"]'
            }
        };
        
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log('🔍 ChatSavePro Content Script v3.0 initialized');
        
        try {
            this.setupMessageListeners();
            this.setupMutationObservers();
            this.injectStyles();
            
            this.isInitialized = true;
            console.log('✅ ChatSavePro Content Script v3.0 initialized and ready');
            
            this.safeSendToBackground({
                action: 'CONTENT_SCRIPT_READY',
                data: {
                    url: window.location.href,
                    platform: this.detectPlatform(),
                    timestamp: Date.now()
                }
            });
            
        } catch (error) {
            console.error('❌ Content script initialization failed:', error);
        }
    }

    setupMessageListeners() {
        if (this.isChromeEnv && chrome.runtime && chrome.runtime.onMessage) {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                console.log('📨 Content script received:', request);
                
                try {
                    let response;
                    
                    switch (request.action) {
                        case 'PING':
                            response = { success: true, message: 'pong', timestamp: Date.now() };
                            break;
                            
                        case 'DEEP_SCAN':
                            response = this.performDeepScan();
                            break;
                            
                        case 'START_LIVE_SCAN':
                            response = this.startLiveScan();
                            break;
                            
                        case 'STOP_LIVE_SCAN':
                            response = this.stopLiveScan();
                            break;
                            
                        case 'GET_STATUS':
                            response = this.getStatus();
                            break;
                            
                        default:
                            response = { success: false, error: 'Unknown action' };
                    }
                    
                    if (response && typeof response.then === 'function') {
                        response.then(result => sendResponse(result))
                               .catch(error => sendResponse({ success: false, error: error.message }));
                        return true;
                    } else {
                        sendResponse(response);
                    }
                    
                } catch (error) {
                    console.error('❌ Message handling failed:', error);
                    sendResponse({ success: false, error: error.message });
                }
                
                return true;
            });
        } else {
            console.warn('⚠️ chrome.runtime not available, using fallback communication');
            this.setupWindowMessageListeners();
        }
    }

    setupWindowMessageListeners() {
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            if (event.data.type && event.data.type.startsWith('CHATSAVEPRO_')) {
                this.handleWindowMessage(event.data);
            }
        });
    }

    handleWindowMessage(data) {
        console.log('📨 Window message received:', data);
    }

    setupMutationObservers() {
        this.mutationObserver = new MutationObserver((mutations) => {
            if (this.liveScanActive) {
                this.handleMutations(mutations);
            }
        });

        this.mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .chatsavepro-highlight {
                background-color: rgba(255, 255, 0, 0.3) !important;
                border: 2px solid #ffd700 !important;
                transition: all 0.3s ease !important;
            }
            
            .chatsavepro-scanning {
                animation: pulse 2s infinite !important;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    safeSendToBackground(message) {
        try {
            if (this.isChromeEnv && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage(message, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('📨 Background message failed, using fallback:', chrome.runtime.lastError.message);
                        this.sendViaWindowMessage(message);
                    }
                });
            } else {
                console.warn('⚠️ chrome.runtime.sendMessage not available, using window messaging');
                this.sendViaWindowMessage(message);
            }
        } catch (error) {
            console.error('❌ Error sending message:', error);
            this.sendViaWindowMessage(message);
        }
    }

    sendViaWindowMessage(message) {
        try {
            window.postMessage({
                type: 'CHATSAVEPRO_FROM_CONTENT',
                payload: message
            }, '*');
        } catch (error) {
            console.error('❌ Window message failed:', error);
        }
    }

    performDeepScan() {
        console.log('🎯 Starting Deep Scan...');
        
        try {
            const startTime = Date.now();
            const messages = this.scanForMessages();
            const platform = this.detectPlatform();
            
            const result = {
                scanType: 'deep',
                platform: platform,
                timestamp: Date.now(),
                url: window.location.href,
                title: document.title,
                messageCount: messages.length,
                messages: messages,
                performance: {
                    scanDuration: Date.now() - startTime,
                    elementsScanned: this.countScannedElements(),
                    platformDetected: platform
                }
            };
            
            console.log('✅ Deep Scan completed:', result.messageCount, 'messages found');
            
            this.safeSendToBackground({
                action: 'LIVE_SCAN_DATA_CHUNK',
                data: {
                    scanType: 'deep',
                    messages: messages,
                    timestamp: Date.now()
                }
            });
            
            return {
                success: true,
                data: result
            };
            
        } catch (error) {
            console.error('❌ Deep Scan failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    scanForMessages() {
        const messages = [];
        const seenMessages = new Set();
        
        this.scanConfig.messageSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    const messageData = this.extractMessageData(element, selector);
                    if (messageData && messageData.content && !seenMessages.has(messageData.id)) {
                        messages.push(messageData);
                        seenMessages.add(messageData.id);
                    }
                });
            } catch (error) {
                console.log('⚠️ Selector failed:', selector, error);
            }
        });
        
        this.scanByTextNodes(messages, seenMessages);
        this.scanByDataAttributes(messages, seenMessages);
        
        return messages;
    }

    extractMessageData(element, selector) {
        try {
            const content = this.extractTextContent(element);
            if (!content || content.length < 2) return null;
            
            const id = this.generateMessageId(element, content);
            
            return {
                id: id,
                content: content.trim(),
                timestamp: this.extractTimestamp(element),
                sender: this.detectSender(element),
                platform: this.detectPlatform(),
                elementInfo: {
                    tagName: element.tagName,
                    className: element.className,
                    selector: selector
                },
                metadata: {
                    url: window.location.href,
                    scannedAt: Date.now()
                }
            };
        } catch (error) {
            console.log('⚠️ Message extraction failed:', error);
            return null;
        }
    }

    extractTextContent(element) {
        if (this.isElementHidden(element)) return null;
        
        let text = element.textContent || element.innerText || '';
        text = text.replace(/\s+/g, ' ').trim();
        
        if (text.length < 2 || this.isLikelyNoise(text)) return null;
        
        return text;
    }

    extractTimestamp(element) {
        const timeElement = element.querySelector('time') || 
                           element.closest('[datetime]') ||
                           element.previousElementSibling ||
                           element.nextElementSibling;
        
        if (timeElement) {
            const datetime = timeElement.getAttribute('datetime') || 
                           timeElement.textContent;
            if (datetime) {
                const timestamp = new Date(datetime).getTime();
                if (!isNaN(timestamp)) return timestamp;
            }
        }
        
        return Date.now();
    }

    detectSender(element) {
        const computedStyle = window.getComputedStyle(element);
        
        if (element.closest('.message-in') || computedStyle.marginLeft === 'auto') {
            return 'user';
        }
        if (element.closest('.message-out') || computedStyle.marginRight === 'auto') {
            return 'assistant';
        }
        
        const platform = this.detectPlatform();
        switch (platform) {
            case 'ChatGPT':
                if (element.closest('[data-testid*="user"]')) return 'user';
                if (element.closest('[data-testid*="assistant"]')) return 'assistant';
                break;
            case 'DeepSeek':
                if (element.closest('.user-message')) return 'user';
                if (element.closest('.assistant-message')) return 'assistant';
                break;
        }
        
        return 'unknown';
    }

    detectPlatform() {
        const url = window.location.href;
        const hostname = window.location.hostname;
        
        if (hostname.includes('chat.openai.com')) return 'ChatGPT';
        if (hostname.includes('chat.deepseek.com')) return 'DeepSeek';
        if (hostname.includes('web.telegram.org')) return 'Telegram';
        if (hostname.includes('web.whatsapp.com')) return 'WhatsApp';
        if (hostname.includes('messenger.com')) return 'Messenger';
        if (hostname.includes('discord.com')) return 'Discord';
        
        for (const [platform, selectors] of Object.entries(this.scanConfig.platformSelectors)) {
            for (const selector of selectors) {
                if (document.querySelector(selector)) {
                    return this.capitalizeFirst(platform);
                }
            }
        }
        
        return 'Web';
    }

    scanByTextNodes(messages, seenMessages) {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const content = node.textContent.trim();
                    return content.length > 10 && 
                           content.includes(' ') && 
                           !this.isLikelyNoise(content) ?
                        NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            },
            false
        );
        
        let node;
        while ((node = walker.nextNode())) {
            try {
                const content = node.textContent.trim();
                const id = this.generateMessageId(node, content);
                
                if (!seenMessages.has(id)) {
                    messages.push({
                        id: id,
                        content: content,
                        timestamp: Date.now(),
                        sender: 'unknown',
                        platform: this.detectPlatform(),
                        elementInfo: {
                            nodeType: 'TEXT_NODE',
                            length: content.length
                        }
                    });
                    seenMessages.add(id);
                }
            } catch (error) {
                console.log('⚠️ Text node scan failed:', error);
            }
        }
    }

    scanByDataAttributes(messages, seenMessages) {
        const elementsWithData = document.querySelectorAll('[data-content], [data-message], [data-text]');
        
        elementsWithData.forEach(element => {
            try {
                const content = element.getAttribute('data-content') || 
                               element.getAttribute('data-message') ||
                               element.getAttribute('data-text');
                
                if (content && content.length > 2) {
                    const id = this.generateMessageId(element, content);
                    
                    if (!seenMessages.has(id)) {
                        messages.push({
                            id: id,
                            content: content.trim(),
                            timestamp: Date.now(),
                            sender: this.detectSender(element),
                            platform: this.detectPlatform(),
                            elementInfo: {
                                tagName: element.tagName,
                                dataAttributes: Array.from(element.attributes)
                                    .filter(attr => attr.name.startsWith('data-'))
                                    .map(attr => attr.name)
                            }
                        });
                        seenMessages.add(id);
                    }
                }
            } catch (error) {
                console.log('⚠️ Data attribute scan failed:', error);
            }
        });
    }

    startLiveScan() {
        console.log('🔄 Starting Live Scan...');
        
        try {
            if (this.liveScanActive) {
                return { success: true, message: 'Live scan already active' };
            }
            
            this.liveScanActive = true;
            this.messageCache.clear();
            
            this.safeSendToBackground({
                action: 'LIVE_SCAN_STATUS',
                data: {
                    active: true,
                    platform: this.detectPlatform(),
                    timestamp: Date.now()
                }
            });
            
            const initialMessages = this.scanForMessages();
            if (initialMessages.length > 0) {
                this.safeSendToBackground({
                    action: 'LIVE_SCAN_DATA_CHUNK',
                    data: {
                        scanType: 'live_initial',
                        messages: initialMessages,
                        timestamp: Date.now()
                    }
                });
            }
            
            console.log('👀 MutationObserver started');
            
            return {
                success: true,
                message: 'Live scan started',
                initialMessages: initialMessages.length
            };
            
        } catch (error) {
            console.error('❌ Live Scan start failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    stopLiveScan() {
        console.log('⏹️ Stopping Live Scan...');
        
        try {
            this.liveScanActive = false;
            
            this.safeSendToBackground({
                action: 'LIVE_SCAN_STATUS',
                data: {
                    active: false,
                    timestamp: Date.now()
                }
            });
            
            return {
                success: true,
                message: 'Live scan stopped'
            };
            
        } catch (error) {
            console.error('❌ Live Scan stop failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    handleMutations(mutations) {
        if (!this.liveScanActive) return;
        
        let newMessages = [];
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const messages = this.scanNodeForNewMessages(node);
                        newMessages.push(...messages);
                    }
                });
            }
            
            if (mutation.type === 'characterData') {
                const message = this.extractMessageFromTextMutation(mutation);
                if (message) newMessages.push(message);
            }
        });
        
        if (newMessages.length > 0) {
            this.safeSendToBackground({
                action: 'LIVE_SCAN_DATA_CHUNK',
                data: {
                    scanType: 'live_update',
                    messages: newMessages,
                    timestamp: Date.now(),
                    mutationCount: mutations.length
                }
            });
        }
    }

    scanNodeForNewMessages(node) {
        const messages = [];
        const seenInThisScan = new Set();
        
        const nodeMessage = this.extractMessageData(node, 'mutation_added');
        if (nodeMessage && !this.messageCache.has(nodeMessage.id)) {
            messages.push(nodeMessage);
            this.messageCache.add(nodeMessage.id);
            seenInThisScan.add(nodeMessage.id);
        }
        
        const childElements = node.querySelectorAll('*');
        childElements.forEach(element => {
            const message = this.extractMessageData(element, 'mutation_child');
            if (message && !this.messageCache.has(message.id) && !seenInThisScan.has(message.id)) {
                messages.push(message);
                this.messageCache.add(message.id);
                seenInThisScan.add(message.id);
            }
        });
        
        return messages;
    }

    extractMessageFromTextMutation(mutation) {
        try {
            const content = mutation.target.textContent.trim();
            if (!content || content.length < 2 || this.isLikelyNoise(content)) return null;
            
            const id = this.generateMessageId(mutation.target, content);
            if (this.messageCache.has(id)) return null;
            
            this.messageCache.add(id);
            
            return {
                id: id,
                content: content,
                timestamp: Date.now(),
                sender: 'unknown',
                platform: this.detectPlatform(),
                elementInfo: {
                    nodeType: 'TEXT_MUTATION',
                    target: mutation.target.nodeName
                }
            };
        } catch (error) {
            console.log('⚠️ Text mutation extraction failed:', error);
            return null;
        }
    }

    generateMessageId(element, content) {
        try {
            const position = this.getElementPosition(element);
            let hash = 0;
            const str = content.substring(0, 50) + '_' + position + '_' + this.detectPlatform();
            
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            
            return 'msg_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
            
        } catch (error) {
            return 'msg_fallback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
    }

    getElementPosition(element) {
        try {
            const rect = element.getBoundingClientRect();
            return `${Math.round(rect.top)}_${Math.round(rect.left)}`;
        } catch {
            return '0_0';
        }
    }

    isElementHidden(element) {
        if (!element) return true;
        
        const style = window.getComputedStyle(element);
        return style.display === 'none' || 
               style.visibility === 'hidden' || 
               style.opacity === '0' ||
               element.offsetParent === null;
    }

    isLikelyNoise(text) {
        const noisePatterns = [
            /^\d+$/,
            /^[^\w]{1,3}$/,
            /^(http|www)/i,
            /^[#@]\w+$/,
            /^\W+$/,
            /\b(login|sign|menu|button|submit|loading)\b/i
        ];
        
        return noisePatterns.some(pattern => pattern.test(text));
    }

    countScannedElements() {
        let count = 0;
        this.scanConfig.messageSelectors.forEach(selector => {
            try {
                count += document.querySelectorAll(selector).length;
            } catch {
            }
        });
        return count;
    }

    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    getStatus() {
        return {
            success: true,
            data: {
                initialized: this.isInitialized,
                liveScanActive: this.liveScanActive,
                platform: this.detectPlatform(),
                messageCacheSize: this.messageCache.size,
                url: window.location.href,
                timestamp: Date.now()
            }
        };
    }
}

const chatSaveContentScript = new ChatSaveContentScript();

if (typeof window !== 'undefined') {
    window.ChatSavePro = chatSaveContentScript;
}