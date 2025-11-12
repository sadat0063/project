/* ChatSavePro Popup (refactored for Enterprise-Grade architecture)
   Principles applied: Context Isolation, Strict Interface Contract,
   Lazy Loading (where applicable), Logging Policy, Memory Segmentation,
   Security & Permission Control, Async Pipeline & Fallback Resilience,
   Scalable Connector Design, Config Management, Privacy-by-Design,
   Modular Testing readiness.
*/

/* ---------- Constants & Config (Configuration Management & Privacy) ---------- */
const CONFIG = {
    VERSION: '3.3',
    PORT_NAME_PREFIX: 'ChatSavePopup',
    CONNECT_TIMEOUT_MS: 5000,
    RECONNECT_BASE_DELAY_MS: 2000,
    MAX_RECONNECT_ATTEMPTS: 3,
    NOTIFICATION_DURATION_MS: 3000,
    FETCH_TIMEOUT_MS: 15000,
    ALLOWED_EXPORT_FORMATS: ['json','csv','txt','jsonl','pdf','html','xml','zip','pptx','xlsx']
};

/* ---------- Minimal safe logger (Logging Policy & Data Minimization) ---------- */
const Logger = {
    _sanitize: (obj) => {
        // Remove potential PII keys from logs
        if (!obj || typeof obj !== 'object') return obj;
        const clone = {};
        for (const k of Object.keys(obj)) {
            if (['token','apiKey','password','content','blob'].includes(k)) {
                clone[k] = '[REDACTED]';
            } else {
                clone[k] = obj[k];
            }
        }
        return clone;
    },
    info: (...args) => console.info('[ChatSavePro][INFO]', ...args.map(Logger._sanitize)),
    warn: (...args) => console.warn('[ChatSavePro][WARN]', ...args.map(Logger._sanitize)),
    error: (...args) => console.error('[ChatSavePro][ERROR]', ...args.map(Logger._sanitize)),
    debug: (...args) => console.debug('[ChatSavePro][DEBUG]', ...args.map(Logger._sanitize))
};

/* ---------- Message schemas & validation (Strict Interface Contract) ---------- */
const MessageSchemas = {
    handshake: (msg) => typeof msg === 'object' && msg.handshake === true,
    statusRequest: (msg) => msg && msg.action === 'getStatus',
    exportRequest: (msg) => msg && msg.action === 'export' && CONFIG.ALLOWED_EXPORT_FORMATS.includes(msg.format),
    deepScan: (msg) => msg && msg.action === 'deepScan',
    liveScanStart: (msg) => msg && msg.action === 'liveScanStart',
    liveScanStop: (msg) => msg && msg.action === 'liveScanStop'
};

function validateIncomingMessage(msg) {
    // whitelist expected shapes, return boolean
    if (!msg || typeof msg !== 'object') return false;
    // accept messages that have an allowed action or handshake
    if (msg.handshake) return true;
    const allowedActions = ['getStatus','scanResults','exportResult','deepScanResult','liveSession','memory','error'];
    if (msg.action && allowedActions.includes(msg.action)) return true;
    // fallback: check common safe keys
    if (msg.success !== undefined || msg.sessionId !== undefined || msg.scanResults !== undefined) return true;
    return false;
}

/* ---------- Utility helpers ---------- */
function safeCreateText(text) {
    const tn = document.createTextNode(String(text));
    return tn;
}

function clearElement(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
}

async function fetchWithTimeout(resource, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS);
    try {
        const resp = await fetch(resource, { ...options, signal: controller.signal });
        return resp;
    } finally {
        clearTimeout(timeout);
    }
}

function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/* ---------- PopupController (refactored) ---------- */
class PopupController {
    constructor() {
        this.port = null;
        this.isConnected = false;
        this.scanData = [];
        this.liveScanActive = false;
        this.pendingRequests = new Map();
        this.isInitialized = false;

        this.reconnectAttempts = 0;
        this.connectionTimer = null;

        // export formats (could be lazy-loaded from a config endpoint)
        this.exportFormats = [
            { id: 'json', name: 'JSON', icon: '📊', description: 'Structured data format' },
            { id: 'csv', name: 'CSV', icon: '📈', description: 'Spreadsheet format' },
            { id: 'txt', name: 'Text', icon: '📄', description: 'Simple text file' },
            { id: 'jsonl', name: 'JSONL', icon: '📑', description: 'Streaming data format' },
            { id: 'pdf', name: 'PDF', icon: '📕', description: 'Portable Document Format' },
            { id: 'html', name: 'HTML', icon: '🌐', description: 'Web page format' },
            { id: 'xml', name: 'XML', icon: '📋', description: 'Structured markup' },
            { id: 'zip', name: 'ZIP', icon: '📦', description: 'Compressed archive with multiple formats' },
            { id: 'pptx', name: 'PowerPoint', icon: '📊', description: 'Professional presentation' },
            { id: 'xlsx', name: 'Excel', icon: '📈', description: 'Advanced spreadsheet' }
        ];

        // Bindings
        this.handleBackgroundMessage = this.handleBackgroundMessage.bind(this);
        this.handlePortDisconnect = this.handlePortDisconnect.bind(this);
    }

    /* ---------------- init / cleanup ---------------- */
    async init() {
        if (this.isInitialized) {
            Logger.warn('Popup already initialized');
            return;
        }

        Logger.info('Initializing ChatSavePro Popup Controller', { version: CONFIG.VERSION });
        this.setupEventListeners();
        await this.connectToBackground();
        this.isInitialized = true;

        // cleanup on close
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    cleanup() {
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
        if (this.port) {
            try { this.port.disconnect(); } catch (e) { /* ignore */ }
            this.port = null;
        }
        this.isConnected = false;
        this.pendingRequests.clear();
        Logger.info('Popup cleaned up');
    }

    /* ---------------- connect / messaging (Async Pipeline & Resilience) ---------------- */
    async connectToBackground() {
        Logger.info('Attempting to connect to background');
        if (typeof chrome === 'undefined' || !chrome.runtime) {
            Logger.error('chrome.runtime not available');
            this.updateConnectionStatus('Runtime unavailable', 'error');
            return;
        }

        try {
            const name = `${CONFIG.PORT_NAME_PREFIX}_${Date.now()}_${Math.random().toString(36).slice(2,11)}`;
            this.port = chrome.runtime.connect({ name });

            if (!this.port) throw new Error('connect() returned null');

            this.port.onMessage.addListener(this.handleBackgroundMessage);
            this.port.onDisconnect.addListener(this.handlePortDisconnect);

            // connection timeout fallback
            this.connectionTimer = setTimeout(() => {
                if (!this.isConnected) {
                    Logger.warn('Connection handshake timeout');
                    this.handlePortDisconnect();
                }
            }, CONFIG.CONNECT_TIMEOUT_MS);

            // send handshake
            this.post({ action: 'getStatus', handshake: true, version: CONFIG.VERSION, source: 'popup' });

            Logger.info('Port created, awaiting handshake');
        } catch (err) {
            Logger.error('Failed to connect to background', err);
            this.updateConnectionStatus('Connection Failed', 'error');
        }
    }

    handlePortDisconnect() {
        if (this.connectionTimer) {
            clearTimeout(this.connectionTimer);
            this.connectionTimer = null;
        }
        Logger.warn('Port disconnected');
        this.isConnected = false;
        this.port = null;
        this.updateConnectionStatus('Disconnected', 'error');

        // retry with exponential backoff
        if (this.reconnectAttempts < CONFIG.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            const delay = CONFIG.RECONNECT_BASE_DELAY_MS * this.reconnectAttempts;
            Logger.info('Attempting reconnect', { attempt: this.reconnectAttempts, delay });
            setTimeout(() => this.connectToBackground(), delay);
        } else {
            this.showNotification('Connection lost. Please refresh the popup.', 'error');
        }
    }

    post(message) {
        // central point to send messages (Scalable Connector Design)
        if (!this.port || !this.isConnected) {
            Logger.error('Cannot post message, not connected', message);
            this.showNotification('Not connected to background service', 'error');
            return;
        }
        try {
            const outgoing = {
                ...message,
                timestamp: Date.now(),
                version: CONFIG.VERSION,
                source: 'popup'
            };
            this.port.postMessage(outgoing);
            Logger.debug('Message posted', outgoing);
        } catch (err) {
            Logger.error('Failed to post message', err);
            // assume disconnect and try reconnect flow
            this.handlePortDisconnect();
        }
    }

    /* ---------------- incoming message handling (Strict Contract & Validation) ---------------- */
    handleBackgroundMessage(msg) {
        // Validate message shape before processing to minimize risk
        if (!validateIncomingMessage(msg)) {
            Logger.warn('Rejected unknown/invalid message from background', msg);
            return;
        }
        Logger.debug('Received msg', msg);

        // handshake handling
        if (msg.handshake && msg.initialized) {
            Logger.info('Handshake successful');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            if (this.connectionTimer) { clearTimeout(this.connectionTimer); this.connectionTimer = null; }
            this.updateConnectionStatus('Connected', 'success');
            // Load data from memory if present
            if (msg.memory && msg.memory.chromeStorage) {
                this.scanData = msg.memory.chromeStorage.scanData || msg.memory.chromeStorage.scans || [];
                this.updateStats();
                this.updateRecentScans();
            } else {
                // request status if not provided
                this.post({ action: 'getStatus' });
            }
            return;
        }

        // error
        if (msg.success === false) {
            const errMsg = msg.error || 'Unknown error';
            Logger.warn('Operation failed', { error: errMsg });
            this.showNotification(`Operation failed: ${errMsg}`, 'error');
            return;
        }

        // routes
        if (msg.action === 'getStatus' || msg.memory) {
            this.handleStatusResponse(msg);
        } else if (msg.scanResults || msg.data) {
            this.handleScanDataResponse(msg);
        } else if (msg.action === 'exportResult' || msg.blob || msg.content) {
            this.handleExportResponse(msg);
        } else if (msg.deepScanResult || msg.itemsFound !== undefined) {
            this.handleDeepScanResponse(msg);
        } else if (msg.sessionId !== undefined || msg.live === true || msg.live === false) {
            this.handleLiveScanResponse(msg);
        } else {
            Logger.debug('Unhandled background message', msg);
        }
    }

    /* ---------------- response handlers ---------------- */
    handleStatusResponse(msg) {
        Logger.debug('Status response', msg);
        if (msg.memory && msg.memory.chromeStorage) {
            const storage = msg.memory.chromeStorage;
            this.scanData = storage.scanData || storage.scans || [];
            Logger.info('Loaded scan data', { scans: this.scanData.length });
            this.updateStats();
            this.updateRecentScans();
        }
    }

    handleScanDataResponse(msg) {
        Logger.debug('Scan data response', msg);
        const results = Array.isArray(msg.scanResults) ? msg.scanResults : (Array.isArray(msg.data) ? msg.data : null);
        if (results) {
            // store minimal metadata only (Privacy-by-Design)
            this.scanData = results.map(item => ({
                scanType: item.scanType || item.type || 'unknown',
                platform: item.platform || item.source || 'Unknown',
                messageCount: item.messageCount || (item.data && item.data.messageCount) || 0,
                timestamp: item.timestamp || Date.now(),
                url: item.url || item.pageUrl || 'Unknown'
            }));
            this.updateStats();
            this.updateRecentScans();
        } else {
            Logger.warn('Received empty scan data');
            this.scanData = [];
            this.updateStats();
            this.updateRecentScans();
        }
    }

    handleDeepScanResponse(msg) {
        const count = (msg.data && msg.data.itemsFound) || msg.itemsFound || null;
        if (count !== null) {
            this.showNotification(`Deep Scan completed: ${count} items found`, 'success');
            this.post({ action: 'getStatus' });
        } else {
            this.showNotification('Deep Scan completed', 'success');
            this.post({ action: 'getStatus' });
        }
    }

    async handleExportResponse(msg) {
        Logger.debug('Export response', { success: msg.success, filename: msg.filename });
        try {
            if (msg.success && (msg.content || msg.blob)) {
                await this.downloadExport(msg);
                this.showNotification(`Export completed: ${msg.filename || 'file'}`, 'success');
                this.hideExportModal();
            } else if (msg.success) {
                this.showNotification('Export completed successfully', 'success');
                this.hideExportModal();
            } else {
                this.showNotification('Export failed', 'error');
            }
        } catch (err) {
            Logger.error('Export handling failed', err);
            this.showNotification('Export failed during processing', 'error');
        }
    }

    handleLiveScanResponse(msg) {
        Logger.debug('Live scan response', msg);
        if (msg.success && msg.sessionId) {
            this.liveScanActive = true;
            this.setLiveUI(true);
            this.showNotification('Live Scan started', 'success');
        } else if (msg.success) {
            this.liveScanActive = false;
            this.setLiveUI(false);
            this.showNotification('Live Scan stopped', 'info');
        }
    }

    /* ---------------- UI helpers (XSS-safe rendering) ---------------- */
    updateStats() {
        const total = this.scanData.length;
        const deep = this.scanData.filter(s => s.scanType === 'deep').length;
        const live = this.scanData.filter(s => s.scanType === 'live').length;

        this.safeSetTextContent('totalScans', total);
        this.safeSetTextContent('deepScans', deep);
        this.safeSetTextContent('liveScans', live);

        Logger.info('Stats updated', { total, deep, live });
    }

    updateRecentScans() {
        const listEl = document.getElementById('scansList');
        if (!listEl) return;

        clearElement(listEl);

        const recent = this.scanData.slice(0, 5);
        if (recent.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.appendChild(safeCreateText('No scans yet. Perform a scan to get started.'));
            listEl.appendChild(empty);
            return;
        }

        for (const scan of recent) {
            const item = document.createElement('div');
            item.className = 'scan-item';

            const typeDiv = document.createElement('div');
            typeDiv.className = `scan-type ${scan.scanType}`;
            typeDiv.appendChild(safeCreateText(`${scan.scanType === 'deep' ? '🎯' : '🔄'} ${String(scan.scanType).toUpperCase()}`));
            item.appendChild(typeDiv);

            const info = document.createElement('div');
            info.className = 'scan-info';

            const platform = document.createElement('div');
            platform.className = 'scan-platform';
            platform.title = scan.url || '';
            platform.appendChild(safeCreateText(scan.platform || 'Unknown'));
            info.appendChild(platform);

            const messages = document.createElement('div');
            messages.className = 'scan-messages';
            messages.appendChild(safeCreateText(`${scan.messageCount} messages`));
            info.appendChild(messages);

            const time = document.createElement('div');
            time.className = 'scan-time';
            time.appendChild(safeCreateText(this.formatTime(scan.timestamp)));
            info.appendChild(time);

            item.appendChild(info);
            listEl.appendChild(item);
        }
        Logger.debug('Recent scans UI updated', { count: recent.length });
    }

    setLiveUI(active) {
        this.safeSetDisplay('liveScanBtn', active ? 'none' : 'block');
        this.safeSetDisplay('stopLiveScanBtn', active ? 'block' : 'none');
        this.safeSetTextContent('liveScanStatus', active ? 'ON' : 'OFF');
        const el = document.getElementById('liveScanStatus');
        if (el) el.style.color = active ? '#4CAF50' : '#666';
    }

    /* ---------------- DOM safe helpers ---------------- */
    getElementSafe(id) {
        const el = document.getElementById(id);
        if (!el) Logger.warn(`Element not found: ${id}`);
        return el;
    }
    safeSetTextContent(id, text) {
        const el = this.getElementSafe(id);
        if (el) {
            el.textContent = (text === null || text === undefined) ? '' : String(text);
        }
    }
    safeSetDisplay(id, display) {
        const el = this.getElementSafe(id);
        if (el) el.style.display = display;
    }

    /* ---------------- user actions (connected-guards & validations) ---------------- */
    async performDeepScan() {
        if (!this.isConnected) return this.showNotification('Not connected to background service', 'error');
        this.showNotification('Starting Deep Scan...', 'info');
        this.post({ action: 'deepScan' });
    }

    async startLiveScan() {
        if (!this.isConnected) return this.showNotification('Not connected to background service', 'error');
        this.showNotification('Starting Live Scan...', 'info');
        this.post({ action: 'liveScanStart' });
    }

    async stopLiveScan() {
        if (!this.isConnected) return;
        this.showNotification('Stopping Live Scan...', 'info');
        this.post({ action: 'liveScanStop' });
    }

    toggleAutoLiveScan(enabled) {
        if (!this.isConnected) return;
        this.showNotification(`Auto Live Scan ${enabled ? 'enabled' : 'disabled'}`, 'info');
        this.post({ action: 'toggleAutoLive', enabled });
    }

    showExportModal() {
        if (this.scanData.length === 0) return this.showNotification('No scan data available to export', 'warning');

        const modal = this.getElementSafe('exportModal');
        const container = this.getElementSafe('exportFormats');
        if (!modal || !container) return Logger.error('Export modal elements missing');

        clearElement(container);

        // build categories safely
        const formatCategories = {
            '📊 Basic Formats': ['json', 'csv', 'txt', 'jsonl'],
            '📄 Document Formats': ['pdf', 'html', 'xml'],
            '💼 Office Formats': ['xlsx', 'pptx'],
            '📦 Archive Formats': ['zip']
        };

        for (const [category, formats] of Object.entries(formatCategories)) {
            const catEl = document.createElement('div');
            catEl.className = 'format-category';
            catEl.appendChild(safeCreateText(category));
            container.appendChild(catEl);

            for (const fid of formats) {
                const format = this.exportFormats.find(f => f.id === fid) || { id: fid, name: fid.toUpperCase(), icon: '📄' };

                const option = document.createElement('div');
                option.className = 'format-option';

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'exportFormat';
                input.id = `format-${format.id}`;
                input.value = format.id;

                const label = document.createElement('label');
                label.htmlFor = input.id;

                const iconSpan = document.createElement('span');
                iconSpan.className = 'format-icon';
                iconSpan.appendChild(safeCreateText(format.icon));

                const nameSpan = document.createElement('span');
                nameSpan.className = 'format-name';
                nameSpan.appendChild(safeCreateText(format.name));

                const descSpan = document.createElement('span');
                descSpan.className = 'format-desc';
                descSpan.appendChild(safeCreateText(format.description || ''));

                label.appendChild(iconSpan);
                label.appendChild(nameSpan);
                label.appendChild(descSpan);

                option.appendChild(input);
                option.appendChild(label);

                container.appendChild(option);
            }
        }

        // default to json if present
        const defaultRadio = document.getElementById('format-json');
        if (defaultRadio) defaultRadio.checked = true;

        modal.style.display = 'block';
    }

    hideExportModal() {
        const modal = this.getElementSafe('exportModal');
        if (modal) modal.style.display = 'none';
    }

    showClearModal() {
        if (this.scanData.length === 0) return this.showNotification('No data to clear', 'info');
        const modal = this.getElementSafe('clearModal');
        if (modal) modal.style.display = 'block';
    }
    hideClearModal() {
        const m = this.getElementSafe('clearModal');
        if (m) m.style.display = 'none';
    }

    startExport() {
        const chosen = document.querySelector('input[name="exportFormat"]:checked');
        if (!chosen) return this.showNotification('Please select an export format', 'warning');
        const format = chosen.value;
        if (!CONFIG.ALLOWED_EXPORT_FORMATS.includes(format)) return this.showNotification('Unsupported export format', 'error');

        if (!this.isConnected) return this.showNotification('Not connected to background service', 'error');

        const message = { action: 'export', format, scope: 'all' };
        Logger.info('Requesting export', { format });
        this.showNotification(`Starting ${format.toUpperCase()} export...`, 'info');
        this.post(message);
    }

    async clearAllData() {
        if (!this.isConnected) return this.showNotification('Not connected to background service', 'error');
        this.showNotification('Clearing data...', 'info');
        this.hideClearModal();
        this.post({ action: 'clearAllData' });
    }

    /* ---------------- export download (robust handling) ---------------- */
    async downloadExport(exportResult) {
        // Accepts either: exportResult.blob (Blob), exportResult.content (base64 or dataURL), or URL
        try {
            let blob = null;
            if (exportResult.blob instanceof Blob) {
                blob = exportResult.blob;
            } else if (typeof exportResult.content === 'string') {
                const content = exportResult.content;
                if (content.startsWith('data:')) {
                    // data URL -> fetch to blob (with timeout)
                    const resp = await fetchWithTimeout(content);
                    blob = await resp.blob();
                } else {
                    // assume base64
                    const bytes = base64ToUint8Array(content);
                    const mime = exportResult.mimeType || 'application/octet-stream';
                    blob = new Blob([bytes], { type: mime });
                }
            } else if (exportResult.url) {
                // direct URL to file
                const resp = await fetchWithTimeout(exportResult.url);
                blob = await resp.blob();
            } else {
                throw new Error('No exportable content provided');
            }

            // create temporary link and trigger download (privacy: no analytics)
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = exportResult.filename || `export-${Date.now()}.${exportResult.format || 'bin'}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            Logger.info('Download triggered', { filename: a.download });
        } catch (err) {
            Logger.error('DownloadExport failed', err);
            this.showNotification('Export completed but download failed', 'warning');
        }
    }

    /* ---------------- misc helpers ---------------- */
    updateConnectionStatus(message, type) {
        const statusEl = this.getElementSafe('connectionStatus');
        const indicator = document.querySelector('.status-dot');
        if (statusEl) statusEl.textContent = message;
        if (indicator) {
            indicator.className = `status-dot ${type === 'success' ? 'online' : (type === 'error' ? 'error' : '')}`;
        }
    }

    showNotification(message, type = 'info') {
        try {
            const n = document.createElement('div');
            n.className = `notification ${type}`;
            const wrapper = document.createElement('div');
            wrapper.className = 'notification-content';
            const span = document.createElement('span');
            span.className = 'notification-message';
            span.appendChild(safeCreateText(message));
            wrapper.appendChild(span);
            n.appendChild(wrapper);
            document.body.appendChild(n);

            setTimeout(() => {
                n.style.opacity = '0';
                n.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    if (n.parentElement) n.remove();
                }, 300);
            }, CONFIG.NOTIFICATION_DURATION_MS);
        } catch (err) {
            Logger.error('Failed to show notification', err);
        }
    }

    formatTime(timestamp) {
        try {
            return new Date(Number(timestamp)).toLocaleTimeString();
        } catch (err) {
            Logger.warn('Invalid timestamp', timestamp);
            return 'Unknown time';
        }
    }

    /* ---------------- event listeners wiring ---------------- */
    setupEventListeners() {
        const bind = (id, event, handler) => {
            const el = document.getElementById(id);
            if (!el) return Logger.warn('Element not found for event bind', id);
            el.removeEventListener(event, handler);
            el.addEventListener(event, handler.bind(this));
        };
        bind('deepScanBtn', 'click', this.performDeepScan);
        bind('liveScanBtn', 'click', this.startLiveScan);
        bind('stopLiveScanBtn', 'click', this.stopLiveScan);
        bind('autoLiveScanToggle', 'change', (e) => this.toggleAutoLiveScan(e.target.checked));
        bind('exportBtn', 'click', this.showExportModal);
        bind('clearDataBtn', 'click', this.showClearModal);
        bind('cancelExport', 'click', this.hideExportModal);
        bind('exportConfirm', 'click', this.startExport);
        bind('cancelClear', 'click', this.hideClearModal);
        bind('confirmClear', 'click', this.clearAllData);

        Logger.info('Event listeners setup completed');
    }
}

/* ---------- Initialize popup safely (Context Isolation & DOM ready) ---------- */
(function bootstrap() {
    const controller = new PopupController();
    window.popupController = controller;

    const onReady = async () => {
        try {
            await controller.init();
        } catch (err) {
            Logger.error('Popup init failed', err);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady, { once: true });
    } else {
        // already ready
        setTimeout(onReady, 0);
    }
})();
