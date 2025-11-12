// ==================================================
// DBHandler.js - Advanced Database Management
// IndexedDB-based storage with advanced querying
// ==================================================

class DBHandler {
    constructor() {
        this.DB_NAME = 'ChatSaveProDB';
        this.DB_VERSION = 3;
        this.db = null;
        this.isInitialized = false;
        
        // Database schema
        this.STORES = {
            SCANS: 'scans',
            LIVE_DATA: 'live_data',
            EXPORT_HISTORY: 'export_history',
            SETTINGS: 'settings',
            ANALYTICS: 'analytics'
        };
        
        this.indexes = {
            scans: [
                { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } },
                { name: 'platform', keyPath: 'platform', options: { unique: false } },
                { name: 'scanType', keyPath: 'scanType', options: { unique: false } },
                { name: 'url', keyPath: 'url', options: { unique: false } }
            ],
            live_data: [
                { name: 'sessionId', keyPath: 'sessionId', options: { unique: false } },
                { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } }
            ]
        };
    }

    async init() {
        if (this.isInitialized) return true;
        
        console.log('🚀 Initializing DBHandler...');
        
        try {
            this.db = await this.openDatabase();
            this.isInitialized = true;
            console.log('✅ DBHandler initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ DBHandler initialization failed:', error);
            throw error;
        }
    }

    async openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createStores(db);
            };
        });
    }

    createStores(db) {
        // Create object stores and indexes
        Object.values(this.STORES).forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName, { 
                    keyPath: 'id', 
                    autoIncrement: true 
                });
                
                // Create indexes for scans store
                if (storeName === this.STORES.SCANS && this.indexes.scans) {
                    this.indexes.scans.forEach(index => {
                        store.createIndex(index.name, index.keyPath, index.options);
                    });
                }
                
                // Create indexes for live_data store
                if (storeName === this.STORES.LIVE_DATA && this.indexes.live_data) {
                    this.indexes.live_data.forEach(index => {
                        store.createIndex(index.name, index.keyPath, index.options);
                    });
                }
            }
        });
    }

    /**
     * CRUD Operations - Enhanced
     */
    async create(storeName, data) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.add({
                ...data,
                id: this.generateId(),
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async bulkCreate(storeName, items) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            let completed = 0;
            const results = [];
            
            items.forEach(item => {
                const request = store.add({
                    ...item,
                    id: this.generateId(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
                
                request.onsuccess = () => {
                    results.push(request.result);
                    completed++;
                    
                    if (completed === items.length) {
                        resolve(results);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        });
    }

    async read(storeName, id) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, id, updates) {
        await this.ensureInitialized();
        
        return new Promise(async (resolve, reject) => {
            // First get the item
            const existing = await this.read(storeName, id);
            if (!existing) {
                reject(new Error('Item not found'));
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.put({
                ...existing,
                ...updates,
                updatedAt: Date.now()
            });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Advanced Querying
     */
    async query(options) {
        await this.ensureInitialized();
        
        const {
            table,
            where = {},
            orderBy = {},
            limit = null,
            offset = 0,
            indexes = []
        } = options;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([table], 'readonly');
            const store = transaction.objectStore(table);
            
            let request;
            
            // Use index if specified
            if (indexes.length > 0) {
                const index = store.index(indexes[0]);
                request = index.openCursor();
            } else {
                request = store.openCursor();
            }
            
            const results = [];
            let processed = 0;
            let skipped = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (!cursor) {
                    resolve(results);
                    return;
                }
                
                // Skip offset items
                if (skipped < offset) {
                    skipped++;
                    cursor.continue();
                    return;
                }
                
                const item = cursor.value;
                
                // Apply where filters
                if (this.matchesFilters(item, where)) {
                    results.push(item);
                    processed++;
                }
                
                // Check limit
                if (limit && processed >= limit) {
                    resolve(results);
                    return;
                }
                
                cursor.continue();
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    matchesFilters(item, filters) {
        return Object.entries(filters).every(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
                // Handle operators: $gt, $lt, $gte, $lte, $in, etc.
                return this.applyOperators(item[key], value);
            }
            return item[key] === value;
        });
    }

    applyOperators(itemValue, operators) {
        return Object.entries(operators).every(([operator, opValue]) => {
            switch (operator) {
                case '$gt': return itemValue > opValue;
                case '$gte': return itemValue >= opValue;
                case '$lt': return itemValue < opValue;
                case '$lte': return itemValue <= opValue;
                case '$in': return Array.isArray(opValue) && opValue.includes(itemValue);
                case '$nin': return Array.isArray(opValue) && !opValue.includes(itemValue);
                case '$regex': return new RegExp(opValue).test(itemValue);
                case '$contains': return String(itemValue).includes(String(opValue));
                default: return itemValue === opValue;
            }
        });
    }

    /**
     * Scan-specific methods
     */
    async storeScan(scanData) {
        return await this.create(this.STORES.SCANS, {
            ...scanData,
            type: 'scan'
        });
    }

    async storeLiveScanChunk(chunkData) {
        return await this.create(this.STORES.LIVE_DATA, {
            ...chunkData,
            type: 'live_chunk'
        });
    }

    async getScansByPlatform(platform, options = {}) {
        return await this.query({
            table: this.STORES.SCANS,
            where: { platform },
            orderBy: { timestamp: 'DESC' },
            ...options
        });
    }

    async getScansByDateRange(startDate, endDate, options = {}) {
        return await this.query({
            table: this.STORES.SCANS,
            where: {
                timestamp: {
                    $gte: startDate.getTime(),
                    $lte: endDate.getTime()
                }
            },
            orderBy: { timestamp: 'DESC' },
            ...options
        });
    }

    /**
     * Analytics and Reporting
     */
    async getScanStatistics(options = {}) {
        const scans = await this.getAllScans(options);
        
        const platforms = {};
        const scanTypes = {};
        let totalMessages = 0;
        let totalDuration = 0;
        
        scans.forEach(scan => {
            // Platform stats
            const platform = scan.platform || 'Unknown';
            platforms[platform] = (platforms[platform] || 0) + 1;
            
            // Scan type stats
            const scanType = scan.scanType || 'unknown';
            scanTypes[scanType] = (scanTypes[scanType] || 0) + 1;
            
            // Message stats
            totalMessages += scan.messageCount || 0;
            totalDuration += scan.data?.performance?.scanDuration || 0;
        });
        
        return {
            totalScans: scans.length,
            platforms,
            scanTypes,
            messageStatistics: {
                totalMessages,
                averagePerScan: scans.length > 0 ? totalMessages / scans.length : 0
            },
            performance: {
                totalDuration,
                averageDuration: scans.length > 0 ? totalDuration / scans.length : 0
            },
            dateRange: this.getDateRange(scans)
        };
    }

    async getPlatformAnalytics() {
        const scans = await this.getAllScans();
        const platformStats = {};
        
        scans.forEach(scan => {
            const platform = scan.platform || 'Unknown';
            if (!platformStats[platform]) {
                platformStats[platform] = {
                    count: 0,
                    totalMessages: 0,
                    scanTypes: {},
                    firstSeen: scan.timestamp,
                    lastSeen: scan.timestamp
                };
            }
            
            platformStats[platform].count++;
            platformStats[platform].totalMessages += scan.messageCount || 0;
            platformStats[platform].scanTypes[scan.scanType] = (platformStats[platform].scanTypes[scan.scanType] || 0) + 1;
            platformStats[platform].lastSeen = Math.max(platformStats[platform].lastSeen, scan.timestamp);
            platformStats[platform].firstSeen = Math.min(platformStats[platform].firstSeen, scan.timestamp);
        });
        
        return platformStats;
    }

    /**
     * Migration and Maintenance
     */
    async migrateFromLocalStorage() {
        console.log('🔄 Migrating data from localStorage to IndexedDB...');
        
        try {
            // Migrate scan results
            const scanResults = await this.storage.getItem('scanResults') || [];
            if (scanResults.length > 0) {
                await this.bulkCreate(this.STORES.SCANS, scanResults);
                console.log(`✅ Migrated ${scanResults.length} scan results`);
            }
            
            // Migrate live scan data
            const liveScanData = await this.storage.getItem('liveScanData') || [];
            if (liveScanData.length > 0) {
                await this.bulkCreate(this.STORES.LIVE_DATA, liveScanData);
                console.log(`✅ Migrated ${liveScanData.length} live scan records`);
            }
            
            // Clear old data
            await this.storage.removeItem('scanResults');
            await this.storage.removeItem('liveScanData');
            await this.storage.removeItem('liveScanChunks');
            
            console.log('✅ Migration completed successfully');
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async cleanupOldData(retentionDays = 30) {
        const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        
        try {
            // Delete old scans
            const oldScans = await this.query({
                table: this.STORES.SCANS,
                where: {
                    timestamp: { $lt: cutoffDate }
                }
            });
            
            for (const scan of oldScans) {
                await this.delete(this.STORES.SCANS, scan.id);
            }
            
            // Delete old live data
            const oldLiveData = await this.query({
                table: this.STORES.LIVE_DATA,
                where: {
                    timestamp: { $lt: cutoffDate }
                }
            });
            
            for (const liveRecord of oldLiveData) {
                await this.delete(this.STORES.LIVE_DATA, liveRecord.id);
            }
            
            console.log(`✅ Cleanup completed: ${oldScans.length} scans, ${oldLiveData.length} live records removed`);
            
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
            throw error;
        }
    }

    /**
     * Utility Methods
     */
    async getAllScans(options = {}) {
        return await this.query({
            table: this.STORES.SCANS,
            orderBy: { timestamp: 'DESC' },
            ...options
        });
    }

    async getRecentScans(limit = 50) {
        return await this.query({
            table: this.STORES.SCANS,
            orderBy: { timestamp: 'DESC' },
            limit
        });
    }

    async getScanCount() {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.STORES.SCANS], 'readonly');
            const store = transaction.objectStore(this.STORES.SCANS);
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    generateId() {
        return `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getDateRange(scans) {
        if (!scans || scans.length === 0) return null;
        
        const timestamps = scans.map(s => s.timestamp).filter(t => t);
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        
        return {
            start: new Date(minTime),
            end: new Date(maxTime),
            days: Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24))
        };
    }

    // Storage compatibility layer
    get storage() {
        return {
            setItem: (key, value) => new Promise((resolve) => {
                chrome.storage.local.set({ [key]: value }, () => resolve());
            }),
            getItem: (key) => new Promise((resolve) => {
                chrome.storage.local.get([key], (result) => resolve(result[key]));
            }),
            removeItem: (key) => new Promise((resolve) => {
                chrome.storage.local.remove([key], () => resolve());
            })
        };
    }

    /**
     * Backup and Restore
     */
    async exportDatabase() {
        const backup = {
            version: this.DB_VERSION,
            exportedAt: new Date().toISOString(),
            scans: await this.getAllScans(),
            liveData: await this.query({ table: this.STORES.LIVE_DATA }),
            settings: await this.query({ table: this.STORES.SETTINGS })
        };
        
        return backup;
    }

    async importDatabase(backupData) {
        // Validate backup
        if (!backupData.scans || !backupData.version) {
            throw new Error('Invalid backup data');
        }
        
        // Clear existing data
        await this.clearAll();
        
        // Import data
        if (backupData.scans.length > 0) {
            await this.bulkCreate(this.STORES.SCANS, backupData.scans);
        }
        
        if (backupData.liveData && backupData.liveData.length > 0) {
            await this.bulkCreate(this.STORES.LIVE_DATA, backupData.liveData);
        }
        
        console.log(`✅ Database imported: ${backupData.scans.length} scans, ${backupData.liveData?.length || 0} live records`);
    }

    async clearAll() {
        await this.ensureInitialized();
        
        const stores = Object.values(this.STORES);
        
        for (const storeName of stores) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
        
        console.log('✅ All database stores cleared');
    }
}

// Global registration
if (typeof self !== 'undefined') {
    self.DBHandler = DBHandler;
}

console.log('✅ DBHandler loaded with advanced database capabilities');