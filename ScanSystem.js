/**
 * ScanSystem.js - Main Dispatcher for Deep Scan + Live Scan
 * Core coordinator for all scanning operations
 */

class ScanSystem {
    constructor(storage) {
        this.storage = storage;
        this.deepScan = null;
        this.liveScanManager = null;
        this.dbHandler = null;
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        console.log('🚀 Initializing ScanSystem...');

        try {
            // Initialize DeepScan
            if (typeof DeepScan !== 'undefined') {
                this.deepScan = new DeepScan();
                console.log('✅ DeepScan initialized');
            }

            // Initialize LiveScanManager
            if (typeof LiveScanManager !== 'undefined') {
                this.liveScanManager = new LiveScanManager(this.storage);
                await this.liveScanManager.init();
                console.log('✅ LiveScanManager initialized');
            }

            // Initialize DBHandler
            if (typeof DBHandler !== 'undefined') {
                this.dbHandler = new DBHandler();
                await this.dbHandler.init();
                console.log('✅ DBHandler initialized');
            }

            this.isInitialized = true;
            console.log('🎉 ScanSystem fully initialized');

        } catch (error) {
            console.error('❌ ScanSystem initialization failed:', error);
            throw error;
        }
    }

    /**
     * Execute Deep Scan - Comprehensive snapshot
     */
    async executeDeepScan(tab) {
        if (!this.isInitialized) {
            throw new Error('ScanSystem not initialized');
        }

        console.log('🎯 ScanSystem: Executing Deep Scan...');

        try {
            let result;
            
            if (this.deepScan) {
                // Use DeepScan module
                result = await this.deepScan.performDeepScan(tab);
            } else {
                // Fallback to content script
                result = await this.fallbackDeepScan(tab);
            }

            // Save result
            if (this.dbHandler) {
                await this.dbHandler.saveDeepScan(result);
            }

            console.log('✅ Deep Scan completed:', result.messageCount, 'messages found');
            return result;

        } catch (error) {
            console.error('❌ Deep Scan execution failed:', error);
            throw error;
        }
    }

    /**
     * Start Live Scan - Real-time monitoring
     */
    async startLiveScan(tab) {
        if (!this.isInitialized) {
            throw new Error('ScanSystem not initialized');
        }

        console.log('🔄 ScanSystem: Starting Live Scan...');

        try {
            let result;
            
            if (this.liveScanManager) {
                // Use LiveScanManager
                result = await this.liveScanManager.startMonitoring(tab);
            } else {
                // Fallback to content script
                result = await this.fallbackStartLiveScan(tab);
            }

            console.log('✅ Live Scan started');
            return result;

        } catch (error) {
            console.error('❌ Live Scan start failed:', error);
            throw error;
        }
    }

    /**
     * Stop Live Scan
     */
    async stopLiveScan(tab) {
        if (!this.isInitialized) {
            throw new Error('ScanSystem not initialized');
        }

        console.log('⏹️ ScanSystem: Stopping Live Scan...');

        try {
            let result;
            
            if (this.liveScanManager) {
                // Use LiveScanManager
                result = await this.liveScanManager.stopMonitoring(tab);
            } else {
                // Fallback to content script
                result = await this.fallbackStopLiveScan(tab);
            }

            console.log('✅ Live Scan stopped');
            return result;

        } catch (error) {
            console.error('❌ Live Scan stop failed:', error);
            throw error;
        }
    }

    /**
     * Get current scan status
     */
    async getScanStatus(tabId) {
        const status = {
            deepScan: {
                available: !!this.deepScan,
                lastExecution: await this.getLastDeepScanTime()
            },
            liveScan: {
                available: !!this.liveScanManager,
                active: false,
                messageCount: 0
            },
            dbHandler: {
                available: !!this.dbHandler,
                stats: null
            }
        };

        // Get live scan status
        if (this.liveScanManager) {
            status.liveScan.active = await this.liveScanManager.isMonitoring(tabId);
            status.liveScan.messageCount = await this.liveScanManager.getMessageCount(tabId);
        }

        // Get database stats
        if (this.dbHandler) {
            status.dbHandler.stats = await this.dbHandler.getStats();
        }

        return status;
    }

    /**
     * Merge Deep Scan with Live Scan data
     */
    async mergeScanData(deepScanId, liveSessionId) {
        console.log('🔗 ScanSystem: Merging scan data...');

        try {
            const deepData = await this.dbHandler.getDeepScan(deepScanId);
            const liveData = await this.dbHandler.getLiveSession(liveSessionId);

            if (!deepData || !liveData) {
                throw new Error('Scan data not found for merging');
            }

            const mergedData = {
                mergedAt: new Date().toISOString(),
                deepScan: deepData,
                liveSession: liveData,
                statistics: {
                    totalMessages: (deepData.messageCount || 0) + (liveData.messageCount || 0),
                    deepMessages: deepData.messageCount || 0,
                    liveMessages: liveData.messageCount || 0,
                    timeRange: {
                        start: deepData.timestamp,
                        end: liveData.endTime || new Date().toISOString()
                    }
                }
            };

            // Save merged result
            await this.dbHandler.saveMergedScan(mergedData);

            console.log('✅ Scan data merged successfully');
            return mergedData;

        } catch (error) {
            console.error('❌ Scan data merge failed:', error);
            throw error;
        }
    }

    /**
     * Get scanning statistics
     */
    async getStatistics() {
        const stats = {
            totalScans: 0,
            deepScans: 0,
            liveSessions: 0,
            totalMessages: 0,
            platforms: {},
            timeRange: null
        };

        try {
            // Get data from database if available
            if (this.dbHandler) {
                const dbStats = await this.dbHandler.getStats();
                Object.assign(stats, dbStats);
            } else {
                // Fallback to storage
                const scans = await this.storage.getItem('scanResults') || [];
                const liveData = await this.storage.getItem('liveScanData') || [];

                stats.deepScans = scans.length;
                stats.liveSessions = new Set(liveData.map(d => d.sessionId)).size;
                stats.totalScans = stats.deepScans + stats.liveSessions;
                stats.totalMessages = scans.reduce((sum, scan) => sum + (scan.messageCount || 0), 0) +
                                    liveData.length;

                // Count platforms
                scans.forEach(scan => {
                    const platform = scan.platform || 'unknown';
                    stats.platforms[platform] = (stats.platforms[platform] || 0) + 1;
                });
            }

            return stats;

        } catch (error) {
            console.error('❌ Failed to get statistics:', error);
            return stats;
        }
    }

    /**
     * Cleanup old scan data
     */
    async cleanupOldData(maxAgeDays = 30) {
        console.log('🧹 ScanSystem: Cleaning up old data...');

        try {
            const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
            let cleanedCount = 0;

            // Cleanup from database
            if (this.dbHandler) {
                cleanedCount += await this.dbHandler.cleanupOldData(cutoffTime);
            }

            // Cleanup from storage
            const scans = await this.storage.getItem('scanResults') || [];
            const liveData = await this.storage.getItem('liveScanData') || [];

            const newScans = scans.filter(scan => scan.timestamp > cutoffTime);
            const newLiveData = liveData.filter(data => data.timestamp > cutoffTime);

            if (newScans.length !== scans.length) {
                await this.storage.setItem('scanResults', newScans);
                cleanedCount += (scans.length - newScans.length);
            }

            if (newLiveData.length !== liveData.length) {
                await this.storage.setItem('liveScanData', newLiveData);
                cleanedCount += (liveData.length - newLiveData.length);
            }

            console.log(`✅ Cleaned up ${cleanedCount} old records`);
            return { cleanedCount };

        } catch (error) {
            console.error('❌ Data cleanup failed:', error);
            throw error;
        }
    }

    // Fallback methods
    async fallbackDeepScan(tab) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { action: 'DEEP_SCAN' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response?.error || 'Deep scan failed'));
                }
            });
        });
    }

    async fallbackStartLiveScan(tab) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { action: 'START_LIVE_SCAN' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Live scan start failed'));
                }
            });
        });
    }

    async fallbackStopLiveScan(tab) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { action: 'STOP_LIVE_SCAN' }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response && response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response?.error || 'Live scan stop failed'));
                }
            });
        });
    }

    async getLastDeepScanTime() {
        try {
            const scans = await this.storage.getItem('scanResults') || [];
            if (scans.length > 0) {
                return Math.max(...scans.map(s => s.timestamp));
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // Utility methods
    isInitialized() {
        return this.isInitialized;
    }

    getModuleStatus() {
        return {
            deepScan: !!this.deepScan,
            liveScanManager: !!this.liveScanManager,
            dbHandler: !!this.dbHandler,
            initialized: this.isInitialized
        };
    }
}

// Global registration
if (typeof self !== 'undefined') {
    self.ScanSystem = ScanSystem;
}

console.log('✅ ScanSystem class loaded');