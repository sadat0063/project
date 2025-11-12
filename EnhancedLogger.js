// ============================================================
// modules/EnhancedLogger.js — MV3‑SAFE Drop‑Replace Version
// ============================================================
var EnhancedLogger = (function() {
    'use strict';
    
    const levels = {
        TRACE: 'TRACE',
        DEBUG: 'DEBUG',
        INFO: 'INFO',
        WARN: 'WARN',
        ERROR: 'ERROR',
        FATAL: 'FATAL'
    };
    
    const colors = {
        TRACE: '#888',
        DEBUG: '#555',
        INFO: '#2E86AB',
        WARN: '#F39C12',
        ERROR: '#E74C3C',
        FATAL: '#8B0000'
    };
    
    function formatMessage(level, module, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] ${module}: ${message}`;
    }
    
    function log(level, module, message, data) {
        const formatted = formatMessage(level, module, message);
        if (data) console.log(`%c${formatted}`, `color:${colors[level]||'#000'}`, data);
        else console.log(`%c${formatted}`, `color:${colors[level]||'#000'}`);
    }
    
    function trace(module, message, data) { log(levels.TRACE, module, message, data); }
    function debug(module, message, data) { log(levels.DEBUG, module, message, data); }
    function info(module, message, data)  { log(levels.INFO,  module, message, data); }
    function warn(module, message, data)  { log(levels.WARN,  module, message, data); }
    function error(module, message, data) { log(levels.ERROR, module, message, data); }
    function fatal(module, message, data) { log(levels.FATAL, module, message, data); }
    
    return { levels, log, trace, debug, info, warn, error, fatal };
})();

// ✅ ثبت در محیط Service Worker
if (typeof self !== 'undefined') {
    self.EnhancedLogger = EnhancedLogger;
}
console.log('✅ EnhancedLogger (MV3‑Safe) loaded');
