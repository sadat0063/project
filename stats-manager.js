// ============================================================
// ChatSavePro/modules/stats-manager.js — MV3‑SAFE (R8 Final Stable)
// ============================================================

class StatsManager {
    constructor() {
        this.moduleName = 'StatsManager';
        this.stats = {
            scans: { total: 0, today: 0, byLevel: { light: 0, moderate: 0, deep: 0 }, byPlatform: {}, byHour: Array(24).fill(0) },
            storage: { totalSize: 0, usageByType: {}, averageSize: 0 },
            performance: { averageScanTime: 0, successRate: 100, lastScan: null },
            exports: { total: 0, byFormat: {}, lastExport: null }
        };
        this.listeners = new Set();
    }

    // ==========================================
    // 🚀 Initialization
    // ==========================================
    async initialize() {
        (self.EnhancedLogger?.info || console.log)(`[${this.moduleName}] Initializing...`);
        await this._loadFromStorage();
        await this._loadRealScanData();
        this.notifyListeners();
    }

    // ==========================================
    // 🧩 Storage & Load
    // ==========================================
    async _loadFromStorage() {
        try {
            const saved = await this._getStorage('chatsavepro_stats');
            if (saved) this.stats = { ...this.stats, ...saved };
        } catch (err) {
            (self.EnhancedLogger?.warn || console.warn)(`[${this.moduleName}] loadFromStorage failed`, err);
        }
    }

    async _getStorage(key) {
        return new Promise(res => {
            try {
                chrome.storage.local.get([key], obj => res(obj[key] || null));
            } catch { res(null); }
        });
    }

    async _setStorage(key, val) {
        return new Promise(res => {
            try {
                chrome.storage.local.set({ [key]: val }, res);
            } catch { res(); }
        });
    }

    // ==========================================
    // 📡 Real Scan Data
    // ==========================================
    async _loadRealScanData() {
        try {
            const scans = await this._sendMessage('getAllScans');
            if (Array.isArray(scans)) this._calculateRealStats(scans);
        } catch (e) {
            (self.EnhancedLogger?.warn || console.warn)(`[${this.moduleName}] loadRealScanData failed`, e);
        }
    }

    async _sendMessage(action, payload = {}) {
        return new Promise(res => {
            try { chrome.runtime.sendMessage({ action, ...payload }, res); }
            catch { res(null); }
        });
    }

    // ==========================================
    // 📊 Calculations
    // ==========================================
    _calculateRealStats(scans) {
        const today = new Date().toDateString();
        this.stats.scans.total = scans.length;
        this.stats.scans.today = scans.filter(s => new Date(s.timestamp).toDateString() === today).length;

        const levelMap = { light: 0, moderate: 0, deep: 0 };
        const platformMap = {};
        const hourMap = Array(24).fill(0);

        for (const scan of scans) {
            const lvl = scan.scanLevel || 'light';
            levelMap[lvl] = (levelMap[lvl] || 0) + 1;
            const p = scan.platform || 'Unknown';
            platformMap[p] = (platformMap[p] || 0) + 1;
            const h = new Date(scan.timestamp).getHours();
            hourMap[h]++;
        }

        Object.assign(this.stats.scans, { byLevel: levelMap, byPlatform: platformMap, byHour: hourMap });
        this._calculateStorageStats(scans);
        this._updatePerformanceStats(scans);
        this.notifyListeners();
    }

    _calculateStorageStats(scans) {
        let total = 0;
        const usage = {};
        for (const s of scans) {
            const size = this._estimateSize(s);
            total += size;
            const t = s.contentType || 'unknown';
            usage[t] = (usage[t] || 0) + size;
        }
        this.stats.storage.totalSize = total;
        this.stats.storage.usageByType = usage;
        this.stats.storage.averageSize = scans.length ? total / scans.length : 0;
    }

    _estimateSize(scan) {
        const kbMap = { light: 50, moderate: 300, deep: 1500 };
        return (kbMap[scan.scanLevel] || 100) * 1024;
    }

    _updatePerformanceStats(scans) {
        if (!scans.length) return;
        const succ = scans.filter(s => !s.error).length;
        this.stats.performance.successRate = (succ / scans.length) * 100;
        const last = scans.at(-1);
        this.stats.performance.lastScan = last.timestamp || Date.now();
        const totalTime = scans.reduce((sum, s) => sum + (s.performance?.scanDuration || 0), 0);
        this.stats.performance.averageScanTime = totalTime / scans.length;
    }

    // ==========================================
    // 🧾 Record Events
    // ==========================================
    recordScan(scanData) {
        const lvl = scanData.scanLevel || 'light';
        const platform = scanData.platform || 'Unknown';
        const hr = new Date().getHours();

        this.stats.scans.total++;
        this.stats.scans.today++;
        this.stats.scans.byLevel[lvl] = (this.stats.scans.byLevel[lvl] || 0) + 1;
        this.stats.scans.byPlatform[platform] = (this.stats.scans.byPlatform[platform] || 0) + 1;
        this.stats.scans.byHour[hr]++;
        this.stats.performance.lastScan = Date.now();

        this._setStorage('chatsavepro_stats', this.stats);
        this.notifyListeners();
    }

    recordExport(format) {
        this.stats.exports.total++;
        this.stats.exports.byFormat[format] = (this.stats.exports.byFormat[format] || 0) + 1;
        this.stats.exports.lastExport = Date.now();
        this._setStorage('chatsavepro_stats', this.stats);
        this.notifyListeners();
    }

    // ==========================================
    // 🔔 Listener System
    // ==========================================
    addListener(cb) { this.listeners.add(cb); }
    removeListener(cb) { this.listeners.delete(cb); }
    notifyListeners() {
        for (const cb of this.listeners) {
            try { cb(this.stats); }
            catch (e) { (self.EnhancedLogger?.warn || console.warn)('Stats listener error', e); }
        }
    }

    // ==========================================
    // 📈 Helpers
    // ==========================================
    getScanStats() { return this.stats.scans; }
    getStorageStats() { return this.stats.storage; }
    getPerformanceStats() { return this.stats.performance; }
    getExportStats() { return this.stats.exports; }

    getFormattedSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    getTopPlatforms(limit = 5) {
        return Object.entries(this.stats.scans.byPlatform)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit)
            .map(([p, c]) => ({ platform: p, count: c }));
    }

    getBusiestHours() {
        return this.stats.scans.byHour.map((count, hour) => ({ hour: `${hour}:00`, count }));
    }

    reset() {
        this.stats = {
            scans: { total: 0, today: 0, byLevel: { light: 0, moderate: 0, deep: 0 }, byPlatform: {}, byHour: Array(24).fill(0) },
            storage: { totalSize: 0, usageByType: {}, averageSize: 0 },
            performance: { averageScanTime: 0, successRate: 100, lastScan: null },
            exports: { total: 0, byFormat: {}, lastExport: null }
        };
        this._setStorage('chatsavepro_stats', this.stats);
        this.notifyListeners();
    }
}

// ============================================================
// 🌐 Global Attach — Lazy Singleton (MV3‑Safe)
// ============================================================
if (typeof self !== 'undefined') {
    // attach class reference
    self.StatsManager = StatsManager;

    // create singleton if not present
    if (!self.StatsManagerInstance) {
        self.StatsManagerInstance = new StatsManager();
        (async () => {
            try {
                await self.StatsManagerInstance.initialize();
                console.log('✅ StatsManagerInstance initialized & loaded (MV3‑Safe R8 Final Stable)');
            } catch (err) {
                console.warn('⚠️ StatsManagerInstance initialization failed', err);
            }
        })();
    }

    self.StatsManagerLoaded = true;
}

console.log('✅ StatsManager (MV3‑Safe R8 Final Stable) loaded');
