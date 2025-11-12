// ============================================================
// ChatSavePro/modules/StorageManager.js — MV3‑SAFE (R8 Final)
// ============================================================

var StorageManager = (function() {
    'use strict';

    const MODULE_NAME = 'StorageManager';

    const DEFAULT_CONFIG = {
        maxSize: 1024 * 1024,
        timeout: 5000,
        retryAttempts: 3
    };

    let config = { ...DEFAULT_CONFIG };
    let cache = new Map();
    let isInitialized = false;

    // ============================================================
    // 🧩 Initialization
    // ============================================================
    async function init(customConfig = {}) {
        if (isInitialized) return true;
        try {
            config = { ...config, ...customConfig };
            await testStorageConnection();
            await loadCacheFromStorage();
            isInitialized = true;
            console.log(`✅ [${MODULE_NAME}] initialized`);
            return true;
        } catch (error) {
            console.error(`❌ [${MODULE_NAME}] init failed:`, error);
            throw error;
        }
    }

    async function testStorageConnection() {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.get(['__connection_test__'], (result) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(`Storage connection failed: ${chrome.runtime.lastError.message}`));
                    } else {
                        resolve(true);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    async function loadCacheFromStorage() {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, (items) => {
                if (!chrome.runtime.lastError && items) {
                    for (const [k, v] of Object.entries(items)) {
                        cache.set(k, { value: v, timestamp: Date.now(), version: 1 });
                    }
                }
                resolve();
            });
        });
    }

    // ============================================================
    // 💾 Core CRUD Operations
    // ============================================================
    async function setItem(key, value, options = {}) {
        if (typeof key !== 'string') throw new Error('Key must be string');

        const item = {
            value,
            timestamp: Date.now(),
            version: options.version || 1,
            ttl: options.ttl
        };
        cache.set(key, item);

        try {
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ [key]: value }, () => {
                    chrome.runtime.lastError
                        ? reject(new Error(chrome.runtime.lastError.message))
                        : resolve();
                });
            });
            return true;
        } catch (error) {
            cache.delete(key);
            console.error(`[${MODULE_NAME}] setItem failed`, error);
            throw error;
        }
    }

    async function getItem(key, defaultValue = null) {
        if (typeof key !== 'string') throw new Error('Key must be string');

        if (cache.has(key)) {
            const cached = cache.get(key);
            if (!cached.ttl || Date.now() - cached.timestamp < cached.ttl) {
                return cached.value;
            }
            cache.delete(key);
        }

        try {
            const value = await new Promise((resolve, reject) => {
                chrome.storage.local.get([key], (result) => {
                    chrome.runtime.lastError
                        ? reject(new Error(chrome.runtime.lastError.message))
                        : resolve(result[key]);
                });
            });

            if (value !== undefined) {
                cache.set(key, { value, timestamp: Date.now(), version: 1 });
                return value;
            }
            return defaultValue;
        } catch (err) {
            console.warn(`[${MODULE_NAME}] getItem failed:`, err);
            return defaultValue;
        }
    }

    async function removeItem(key) {
        if (typeof key !== 'string') throw new Error('Key must be string');
        cache.delete(key);

        await new Promise((resolve, reject) => {
            chrome.storage.local.remove([key], () => {
                chrome.runtime.lastError
                    ? reject(new Error(chrome.runtime.lastError.message))
                    : resolve();
            });
        });
        return true;
    }

    async function clear() {
        cache.clear();
        await new Promise((resolve, reject) => {
            chrome.storage.local.clear(() => {
                chrome.runtime.lastError
                    ? reject(new Error(chrome.runtime.lastError.message))
                    : resolve();
            });
        });
        return true;
    }

    async function getAll() {
        try {
            const items = await new Promise((resolve, reject) => {
                chrome.storage.local.get(null, (result) => {
                    chrome.runtime.lastError
                        ? reject(new Error(chrome.runtime.lastError.message))
                        : resolve(result);
                });
            });

            for (const [key, value] of Object.entries(items)) {
                cache.set(key, { value, timestamp: Date.now(), version: 1 });
            }

            return items;
        } catch (error) {
            console.warn(`[${MODULE_NAME}] getAll failed, returning cache`);
            const result = {};
            for (const [key, val] of cache.entries()) result[key] = val.value;
            return result;
        }
    }

    // ============================================================
    // 🧰 Utility / Status
    // ============================================================
    function getCacheStats() {
        return { size: cache.size, keys: Array.from(cache.keys()), isInitialized };
    }

    function clearCache() {
        const previous = cache.size;
        cache.clear();
        return { cleared: previous };
    }

    // ============================================================
    // 📦 Public API
    // ============================================================
    const api = {
        init,
        setItem,
        getItem,
        removeItem,
        clear,
        getAll,
        getCacheStats,
        clearCache,
        isInitialized: () => isInitialized,
        config: () => ({ ...config })
    };

    return api;
})();

// ============================================================
// 🌐 Register in global scope for MV3 Service Worker loader
// ============================================================
if (typeof self !== 'undefined') {
    self.StorageManager = StorageManager;
    console.log('✅ StorageManager (MV3‑Safe) loaded');
}
