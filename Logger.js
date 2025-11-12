// ============================================================
// modules/Logger.js — MV3‑SAFE VERSION
// ============================================================

var Logger = (function() {
    'use strict';
    
    const levels = {
        INFO: 'INFO',
        ERROR: 'ERROR',
        WARN: 'WARN',
        DEBUG: 'DEBUG'
    };
    
    function log(level, module, message, data) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${module}: ${message}`;
        
        if (data) console.log(logMessage, data);
        else console.log(logMessage);
    }
    
    return { levels, log };
})();

// ✅ ثبت در scope جهانی برای Service Worker
if (typeof self !== 'undefined') {
    self.Logger = Logger;
}
console.log('✅ Logger (MV3‑Safe) loaded');
