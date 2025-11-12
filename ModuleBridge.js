// ============================================================
// modules/ModuleBridge.js — MV3‑SAFE Drop‑Replace R8 Final
// ============================================================

class ModuleBridge {
    constructor() {
        this.handlers = new Map();
        this.contexts = new Map();
        this.messageId = 0;
        this.initializeContexts();
    }

    initializeContexts() {
        this.contexts.set('popup', 'UI');
        this.contexts.set('background', 'Background');
        this.contexts.set('content', 'ContentScript');
        this.contexts.set('storage', 'Storage');
        this.contexts.set('export', 'Export');
        this.contexts.set('scan', 'Scan');
    }

    registerHandler(moduleName, handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        this.handlers.set(moduleName, handler);
    }

    async sendToModule(targetModule, message) {
        const messageId = ++this.messageId;
        const sanitizedMessage = this.sanitizeMessage(message, targetModule);
        const handler = this.handlers.get(targetModule);

        if (!handler)
            throw new Error(`No handler registered for module: ${targetModule}`);

        try {
            const result = await handler(sanitizedMessage);
            return result;
        } catch (error) {
            console.error(`ModuleBridge error [${targetModule}]:`, error);
            throw error;
        }
    }

    sanitizeMessage(message, targetModule) {
        const allowedModules = ['storage', 'export', 'background', 'scan'];
        const allowedActions = {
            storage: ['getData','saveData','searchScans','getEnhancedScansFiltered','getStatistics','clearAllData'],
            export: ['exportData','exportToPDF','exportAsZIP'],
            scan: ['startAutoScan','stopAutoScan','setScanLevel','setAutoScan'],
            background: ['getStatus','restartService']
        };

        if (!allowedModules.includes(targetModule))
            throw new Error(`Invalid target module: ${targetModule}`);

        if (message.action && !allowedActions[targetModule]?.includes(message.action))
            throw new Error(`Invalid action for module ${targetModule}: ${message.action}`);

        if (JSON.stringify(message).length > 100000)
            throw new Error('Message size exceeds limit');

        return {
            ...message,
            timestamp: Date.now(),
            source: this.getCurrentContext()
        };
    }

    // ✅ کاملاً ایمن برای MV3 (بدون window/document)
    getCurrentContext() {
        // Service Worker or Background
        if (typeof self !== 'undefined' && self.registration && chrome?.runtime?.id) {
            return 'background';
        }
        // Popup (has DOM)
        if (typeof document !== 'undefined' && location?.protocol === 'chrome-extension:') {
            return 'popup';
        }
        // Content script or others
        return 'content';
    }
}

// 🧩 نمونه‌ی سراسری / MV3‑Safe Attach
const moduleBridge = new ModuleBridge();

if (typeof self !== 'undefined') {
    self.moduleBridge = moduleBridge;
} else if (typeof globalThis !== 'undefined') {
    globalThis.moduleBridge = moduleBridge;
}

console.log('✅ ModuleBridge (MV3‑Safe R8 Final) loaded');
