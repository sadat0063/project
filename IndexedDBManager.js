// ============================================================
// ChatSavePro/modules/IndexedDBManager.js — MV3‑SAFE R8 Final IMPROVED
// ============================================================

const IndexedDBManager = (function() {
    'use strict';

    const MODULE_NAME = 'IndexedDBManager';
    const DB_NAME = 'ChatSaveProDB';
    const DB_VERSION = 2; // Increased version for schema updates
    const OBJECT_STORE_NAME = 'scans';
    const DUPLICATE_TTL_MS = 30 * 60 * 1000; // 30 minutes
    const MAX_DB_SIZE = 50 * 1024 * 1024; // 50MB limit
    const CLEANUP_THRESHOLD = 1000; // Cleanup when over 1000 records

    // ✅ PRINCIPLE 2: Strict Interface Contract - Validation
    const ScanValidator = {
        validateScanData: function(scanData) {
            if (!scanData || typeof scanData !== 'object') {
                throw new Error('Scan data must be a valid object');
            }

            if (!scanData.url && !scanData.title) {
                throw new Error('Scan data must contain url or title');
            }

            // Size validation
            const size = JSON.stringify(scanData).length;
            if (size > 5 * 1024 * 1024) { // 5MB per scan
                throw new Error(`Scan data too large: ${size} bytes`);
            }

            return true;
        },

        sanitizeScanData: function(scanData) {
            const sanitized = { ...scanData };
            
            // Ensure required fields
            sanitized.id = sanitized.id || this.generateScanId();
            sanitized.timestamp = sanitized.timestamp || Date.now();
            sanitized.createdAt = new Date().toISOString();
            sanitized.version = '1.0';

            // Remove any potential sensitive data
            const sensitiveFields = ['password', 'token', 'apiKey', 'cookie'];
            sensitiveFields.forEach(field => {
                if (sanitized[field]) delete sanitized[field];
            });

            return sanitized;
        },

        generateScanId: function() {
            return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    };

    // ✅ PRINCIPLE 4: Enhanced Error Handling
    class DBError extends Error {
        constructor(message, operation, context = {}) {
            super(message);
            this.name = 'DBError';
            this.operation = operation;
            this.timestamp = new Date().toISOString();
            this.context = context;
        }
    }

    // ✅ PRINCIPLE 5: Memory Segmentation - Fallback Manager
    class ChromeStorageFallback {
        constructor() {
            this.storageKey = 'chatsavepro_scans_fallback';
            this.initialized = false;
        }

        async init() {
            this.initialized = true;
            console.log(`[${MODULE_NAME}] ✅ Chrome Storage fallback initialized`);
        }

        async storeScan(scanData) {
            return new Promise((resolve, reject) => {
                chrome.storage.local.get([this.storageKey], (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new DBError('Chrome storage read failed', 'storeScan', {
                            error: chrome.runtime.lastError
                        }));
                        return;
                    }

                    const scans = result[this.storageKey] || [];
                    const sanitizedData = ScanValidator.sanitizeScanData(scanData);
                    
                    scans.push(sanitizedData);
                    
                    // Keep only recent scans to avoid storage quota issues
                    const recentScans = scans
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .slice(0, 500);

                    chrome.storage.local.set({ [this.storageKey]: recentScans }, () => {
                        if (chrome.runtime.lastError) {
                            reject(new DBError('Chrome storage write failed', 'storeScan', {
                                error: chrome.runtime.lastError
                            }));
                            return;
                        }
                        console.log(`[${MODULE_NAME}] ✅ Scan stored in Chrome Storage:`, sanitizedData.id);
                        resolve(sanitizedData.id);
                    });
                });
            });
        }

        async getScans(query = '') {
            return new Promise((resolve, reject) => {
                chrome.storage.local.get([this.storageKey], (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new DBError('Chrome storage read failed', 'getScans', {
                            error: chrome.runtime.lastError
                        }));
                        return;
                    }

                    let scans = result[this.storageKey] || [];
                    
                    if (query) {
                        const q = query.toLowerCase();
                        scans = scans.filter(scan =>
                            (scan.title && scan.title.toLowerCase().includes(q)) ||
                            (scan.url && scan.url.toLowerCase().includes(q)) ||
                            (scan.snippet && scan.snippet.toLowerCase().includes(q))
                        );
                    }

                    scans.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(scans);
                });
            });
        }

        async clearScans() {
            return new Promise((resolve, reject) => {
                chrome.storage.local.remove([this.storageKey], () => {
                    if (chrome.runtime.lastError) {
                        reject(new DBError('Chrome storage clear failed', 'clearScans', {
                            error: chrome.runtime.lastError
                        }));
                        return;
                    }
                    console.log(`[${MODULE_NAME}] ✅ Chrome Storage scans cleared`);
                    resolve(true);
                });
            });
        }
    }

    // ✅ PRINCIPLE 7: Async Pipeline with Resilience
    class IndexedDBManager {
        constructor() {
            this.db = null;
            this.initialized = false;
            this.initializationPromise = null;
            this.useFallback = false;
            this.fallbackManager = new ChromeStorageFallback();
            this.operationQueue = [];
            this.processingQueue = false;
        }

        // ✅ FIX: Safe async initialization
        async init() {
            if (this.initializationPromise) {
                return this.initializationPromise;
            }

            this.initializationPromise = this._initialize();
            return this.initializationPromise;
        }

        async _initialize() {
            if (this.initialized) return;

            console.log(`[${MODULE_NAME}] Initializing IndexedDB manager...`);

            try {
                await this.openDatabase();
                await this.performMaintenance();
                this.initialized = true;
                this.useFallback = false;
                console.log(`[${MODULE_NAME}] ✅ IndexedDB initialized successfully`);
            } catch (error) {
                console.error(`[${MODULE_NAME}] ❌ IndexedDB initialization failed:`, error);
                
                try {
                    await this.fallbackManager.init();
                    this.initialized = true;
                    this.useFallback = true;
                    console.log(`[${MODULE_NAME}] ✅ Using Chrome Storage fallback`);
                } catch (fallbackError) {
                    console.error(`[${MODULE_NAME}] ❌ Fallback also failed:`, fallbackError);
                    throw new DBError('All storage options failed', 'init', {
                        indexedDBError: error.message,
                        fallbackError: fallbackError.message
                    });
                }
            }
        }

        async openDatabase() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                // ✅ PRINCIPLE 7: Timeout handling
                const timeoutId = setTimeout(() => {
                    if (request.readyState === 'pending') {
                        request.onerror(new Event('timeout'));
                        reject(new DBError('Database opening timeout', 'openDatabase'));
                    }
                }, 10000);

                request.onerror = (event) => {
                    clearTimeout(timeoutId);
                    reject(new DBError(`Database open failed: ${request.error?.message || 'Unknown error'}`, 'openDatabase', {
                        error: request.error
                    }));
                };

                request.onsuccess = (event) => {
                    clearTimeout(timeoutId);
                    this.db = event.target.result;
                    
                    // ✅ PRINCIPLE 4: Enhanced error handling for DB operations
                    this.db.onerror = (dbError) => {
                        console.error(`[${MODULE_NAME}] Database error:`, dbError.target.error);
                    };

                    this.db.onversionchange = () => {
                        console.warn(`[${MODULE_NAME}] Database version change detected`);
                        this.db.close();
                    };

                    console.log(`[${MODULE_NAME}] ✅ Database opened (v${DB_VERSION})`);
                    resolve(this.db);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    console.log(`[${MODULE_NAME}] 🛠 Database schema upgrade to v${DB_VERSION}`);
                    
                    // ✅ PRINCIPLE 8: Scalable schema design
                    if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                        const store = db.createObjectStore(OBJECT_STORE_NAME, { 
                            keyPath: 'id',
                            autoIncrement: false 
                        });
                        
                        // ✅ PRINCIPLE 5: Optimized indexes for query performance
                        store.createIndex('url', 'url', { unique: false });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('title', 'title', { unique: false });
                        store.createIndex('platform', 'platform', { unique: false });
                        store.createIndex('scanType', 'scanType', { unique: false });
                        
                        console.log(`[${MODULE_NAME}] ✅ Object store created with indexes`);
                    }

                    // Handle version upgrades
                    if (event.oldVersion < 2) {
                        // Future schema upgrades can be added here
                        console.log(`[${MODULE_NAME}] 🔄 Schema upgraded from v${event.oldVersion} to v${DB_VERSION}`);
                    }
                };

                request.onblocked = () => {
                    console.warn(`[${MODULE_NAME}] Database upgrade blocked by older version`);
                };
            });
        }

        // ✅ PRINCIPLE 2: Enhanced with validation and duplicate checking
        async storeScan(scanData) {
            if (!this.initialized) await this.init();

            // Validate input
            ScanValidator.validateScanData(scanData);

            if (this.useFallback) {
                return await this.fallbackManager.storeScan(scanData);
            }

            try {
                // Check for recent duplicates
                const duplicateId = await this.checkForDuplicate(scanData);
                if (duplicateId) {
                    console.log(`[${MODULE_NAME}] 🔁 Duplicate scan detected, returning existing ID`);
                    return duplicateId;
                }

                // Sanitize and prepare data
                const sanitizedData = ScanValidator.sanitizeScanData(scanData);

                // Store the scan
                const scanId = await this.insertScan(sanitizedData);
                
                // Perform maintenance if needed
                await this.performMaintenance();
                
                return scanId;

            } catch (error) {
                console.error(`[${MODULE_NAME}] ❌ Scan storage failed:`, error);
                
                // Fallback to Chrome Storage
                if (!this.useFallback) {
                    console.log(`[${MODULE_NAME}] 🔄 Falling back to Chrome Storage`);
                    try {
                        await this.fallbackManager.init();
                        this.useFallback = true;
                        return await this.fallbackManager.storeScan(scanData);
                    } catch (fallbackError) {
                        throw new DBError('All storage methods failed', 'storeScan', {
                            originalError: error.message,
                            fallbackError: fallbackError.message
                        });
                    }
                }
                
                throw error;
            }
        }

        async checkForDuplicate(scanData) {
            if (!scanData.url) return null;

            try {
                const recentScans = await this.getScansByUrl(scanData.url, 5);
                const now = Date.now();
                
                for (const scan of recentScans) {
                    const timeDiff = now - scan.timestamp;
                    if (timeDiff < DUPLICATE_TTL_MS) {
                        // Additional duplicate checking logic
                        const isDuplicate = this.isSubstantialDuplicate(scan, scanData);
                        if (isDuplicate) {
                            return scan.id;
                        }
                    }
                }
                
                return null;
            } catch (error) {
                console.warn(`[${MODULE_NAME}] Duplicate check failed:`, error);
                return null;
            }
        }

        isSubstantialDuplicate(existingScan, newScan) {
            // Simple duplicate detection - can be enhanced
            if (existingScan.url !== newScan.url) return false;
            
            // If titles are similar, consider duplicate
            if (existingScan.title && newScan.title) {
                const similarity = this.calculateSimilarity(existingScan.title, newScan.title);
                return similarity > 0.8; // 80% similarity threshold
            }
            
            return true;
        }

        calculateSimilarity(str1, str2) {
            // Simple similarity calculation - can be enhanced
            const set1 = new Set(str1.toLowerCase().split(/\s+/));
            const set2 = new Set(str2.toLowerCase().split(/\s+/));
            
            const intersection = new Set([...set1].filter(x => set2.has(x)));
            const union = new Set([...set1, ...set2]);
            
            return intersection.size / union.size;
        }

        async insertScan(scanData) {
            return new Promise((resolve, reject) => {
                try {
                    const tx = this.db.transaction([OBJECT_STORE_NAME], 'readwrite');
                    const store = tx.objectStore(OBJECT_STORE_NAME);
                    
                    const request = store.add(scanData);
                    
                    request.onsuccess = () => {
                        console.log(`[${MODULE_NAME}] ✅ Scan stored in IndexedDB:`, scanData.id);
                        resolve(scanData.id);
                    };
                    
                    request.onerror = () => {
                        reject(new DBError(`Insert failed: ${request.error?.message}`, 'insertScan', {
                            error: request.error,
                            scanId: scanData.id
                        }));
                    };
                    
                    tx.oncomplete = () => {
                        console.log(`[${MODULE_NAME}] Transaction completed for scan:`, scanData.id);
                    };
                    
                    tx.onerror = () => {
                        console.error(`[${MODULE_NAME}] Transaction failed:`, tx.error);
                    };
                    
                } catch (error) {
                    reject(new DBError(`Transaction setup failed: ${error.message}`, 'insertScan', {
                        error: error
                    }));
                }
            });
        }

        // ✅ PRINCIPLE 3: Lazy Loading - Optimized queries
        async getScans(query = '', limit = 100, offset = 0) {
            if (!this.initialized) await this.init();

            if (this.useFallback) {
                let scans = await this.fallbackManager.getScans(query);
                return scans.slice(offset, offset + limit);
            }

            return new Promise((resolve, reject) => {
                try {
                    const tx = this.db.transaction([OBJECT_STORE_NAME], 'readonly');
                    const store = tx.objectStore(OBJECT_STORE_NAME);
                    const index = store.index('timestamp');
                    const request = index.getAll();

                    request.onsuccess = () => {
                        let scans = request.result || [];
                        
                        // Apply query filter
                        if (query) {
                            const q = query.toLowerCase();
                            scans = scans.filter(scan =>
                                (scan.title && scan.title.toLowerCase().includes(q)) ||
                                (scan.url && scan.url.toLowerCase().includes(q)) ||
                                (scan.snippet && scan.snippet.toLowerCase().includes(q)) ||
                                (scan.platform && scan.platform.toLowerCase().includes(q))
                            );
                        }

                        // Sort by timestamp (newest first)
                        scans.sort((a, b) => b.timestamp - a.timestamp);
                        
                        // Apply pagination
                        const paginatedScans = scans.slice(offset, offset + limit);
                        
                        console.log(`[${MODULE_NAME}] ✅ Retrieved ${paginatedScans.length} scans`);
                        resolve(paginatedScans);
                    };

                    request.onerror = () => {
                        reject(new DBError(`Query failed: ${request.error?.message}`, 'getScans', {
                            error: request.error,
                            query: query
                        }));
                    };

                } catch (error) {
                    reject(new DBError(`Query setup failed: ${error.message}`, 'getScans', {
                        error: error,
                        query: query
                    }));
                }
            });
        }

        async getScansByUrl(url, limit = 10) {
            if (!this.initialized) await this.init();

            return new Promise((resolve, reject) => {
                try {
                    const tx = this.db.transaction([OBJECT_STORE_NAME], 'readonly');
                    const store = tx.objectStore(OBJECT_STORE_NAME);
                    const index = store.index('url');
                    const request = index.getAll(url);

                    request.onsuccess = () => {
                        let scans = request.result || [];
                        scans.sort((a, b) => b.timestamp - a.timestamp);
                        scans = scans.slice(0, limit);
                        resolve(scans);
                    };

                    request.onerror = () => {
                        reject(new DBError(`URL query failed: ${request.error?.message}`, 'getScansByUrl', {
                            error: request.error,
                            url: url
                        }));
                    };

                } catch (error) {
                    reject(new DBError(`URL query setup failed: ${error.message}`, 'getScansByUrl', {
                        error: error,
                        url: url
                    }));
                }
            });
        }

        // ✅ PRINCIPLE 5: Memory Management - Cleanup operations
        async performMaintenance() {
            if (this.useFallback) return;

            try {
                const scanCount = await this.getScanCount();
                
                if (scanCount > CLEANUP_THRESHOLD) {
                    console.log(`[${MODULE_NAME}] 🧹 Performing database maintenance (${scanCount} records)`);
                    await this.cleanupOldRecords();
                }
                
                // Check database size (approximate)
                const approxSize = await this.estimateDBSize();
                if (approxSize > MAX_DB_SIZE * 0.8) { // 80% of max size
                    console.warn(`[${MODULE_NAME}] ⚠️ Database approaching size limit: ${approxSize} bytes`);
                    await this.cleanupOldRecords(0.5); // Remove 50% oldest records
                }
                
            } catch (error) {
                console.warn(`[${MODULE_NAME}] Maintenance failed:`, error);
            }
        }

        async getScanCount() {
            return new Promise((resolve, reject) => {
                try {
                    const tx = this.db.transaction([OBJECT_STORE_NAME], 'readonly');
                    const store = tx.objectStore(OBJECT_STORE_NAME);
                    const request = store.count();

                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);

                } catch (error) {
                    reject(error);
                }
            });
        }

        async estimateDBSize() {
            // Simple size estimation
            const scans = await this.getScans('', 1000);
            return JSON.stringify(scans).length;
        }

        async cleanupOldRecords(ratio = 0.3) {
            // Keep newest (1-ratio) percent of records
            return new Promise((resolve, reject) => {
                try {
                    const tx = this.db.transaction([OBJECT_STORE_NAME], 'readwrite');
                    const store = tx.objectStore(OBJECT_STORE_NAME);
                    const index = store.index('timestamp');
                    const request = index.getAll();

                    request.onsuccess = () => {
                        const scans = request.result || [];
                        if (scans.length <= CLEANUP_THRESHOLD * 0.5) {
                            resolve(0); // No cleanup needed
                            return;
                        }

                        const keepCount = Math.floor(scans.length * (1 - ratio));
                        const scansToDelete = scans.slice(keepCount);

                        let deletedCount = 0;
                        scansToDelete.forEach(scan => {
                            const deleteRequest = store.delete(scan.id);
                            deleteRequest.onsuccess = () => deletedCount++;
                        });

                        tx.oncomplete = () => {
                            console.log(`[${MODULE_NAME}] 🧹 Cleaned up ${deletedCount} old records`);
                            resolve(deletedCount);
                        };

                        tx.onerror = () => {
                            reject(new DBError('Cleanup transaction failed', 'cleanupOldRecords', {
                                error: tx.error
                            }));
                        };
                    };

                    request.onerror = () => {
                        reject(new DBError('Cleanup query failed', 'cleanupOldRecords', {
                            error: request.error
                        }));
                    };

                } catch (error) {
                    reject(new DBError('Cleanup setup failed', 'cleanupOldRecords', {
                        error: error
                    }));
                }
            });
        }

        async clearAllScans() {
            if (!this.initialized) await this.init();

            if (this.useFallback) {
                return await this.fallbackManager.clearScans();
            }

            return new Promise((resolve, reject) => {
                try {
                    const tx = this.db.transaction([OBJECT_STORE_NAME], 'readwrite');
                    const store = tx.objectStore(OBJECT_STORE_NAME);
                    const request = store.clear();

                    request.onsuccess = () => {
                        console.log(`[${MODULE_NAME}] ✅ All scans cleared from IndexedDB`);
                        resolve(true);
                    };

                    request.onerror = () => {
                        reject(new DBError(`Clear failed: ${request.error?.message}`, 'clearAllScans', {
                            error: request.error
                        }));
                    };

                } catch (error) {
                    reject(new DBError(`Clear setup failed: ${error.message}`, 'clearAllScans', {
                        error: error
                    }));
                }
            });
        }

        // ✅ PRINCIPLE 6: Security - Data export with sanitization
        async exportScans() {
            const scans = await this.getScans('', 5000); // Limit export size
            return {
                scans: scans,
                exportInfo: {
                    exportedAt: new Date().toISOString(),
                    totalScans: scans.length,
                    dbType: this.useFallback ? 'chrome_storage' : 'indexeddb',
                    version: '1.0'
                }
            };
        }

        // ✅ Utility methods
        isInitialized() {
            return this.initialized;
        }

        isUsingFallback() {
            return this.useFallback;
        }

        getStorageInfo() {
            return {
                type: this.useFallback ? 'chrome_storage' : 'indexeddb',
                initialized: this.initialized,
                dbName: this.useFallback ? 'N/A' : DB_NAME,
                version: this.useFallback ? 'N/A' : DB_VERSION
            };
        }
    }

    return IndexedDBManager;
})();

// ✅ PRINCIPLE 1: Context Isolation - Proper module export
export { IndexedDBManager };

console.log('✅ IndexedDBManager v2.0 loaded with enhanced 8-principles architecture');