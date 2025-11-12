// ============================================================
// File: modules/Logger.js (MV3-Safe COMPLETE Version)
// ============================================================

var Logger = (function() {
    'use strict';
    
    // تنظیمات اصلی
    const MODULE = 'ChatSavePro';
    const levels = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
    let currentLevel = levels.INFO; // سطح پیش‌فرض

    // تابع اصلی log
    function log(level, context, message, data = null) {
        // اگر سطح لاگ پایین‌تر از سطح فعلی باشه، چیزی لاگ نکن
        if (level > currentLevel) return;
        
        // فرمت‌بندی پیام
        const timestamp = new Date().toISOString();
        const emojis = { 
            ERROR: '❌', 
            WARN: '⚠️', 
            INFO: 'ℹ️', 
            DEBUG: '🐛' 
        };
        
        // پیدا کردن نام سطح از روی مقدار عددی
        const levelName = Object.keys(levels).find(key => levels[key] === level);
        const emoji = emojis[levelName] || '📝';
        const output = `${emoji} [${levelName}] ${timestamp} ${context}: ${message}`;
        
        // چاپ در کنسول با توجه به سطح
        switch(level) {
            case levels.ERROR:
                console.error(output, data || '');
                break;
            case levels.WARN:
                console.warn(output, data || '');
                break;
            case levels.DEBUG:
                console.debug(output, data || '');
                break;
            default:
                console.log(output, data || '');
        }
    }

    // متدهای shortcut برای سطوح مختلف
    function info(context, message, data = null) {
        log(levels.INFO, context, message, data);
    }
    
    function warn(context, message, data = null) {
        log(levels.WARN, context, message, data);
    }
    
    function error(context, message, data = null) {
        log(levels.ERROR, context, message, data);
    }
    
    function debug(context, message, data = null) {
        log(levels.DEBUG, context, message, data);
    }

    // تابع تغییر سطح لاگ
    function setLevel(levelName) {
        if (levels[levelName] !== undefined) {
            currentLevel = levels[levelName];
            console.log(`🔧 Log level changed to: ${levelName} (${currentLevel})`);
        } else {
            console.warn(`⚠️ Invalid log level: ${levelName}`);
        }
    }

    // ========================
    // 🎯 ایجاد object نهایی
    // ========================
    const LoggerObject = {
        // متدهای اصلی
        log: log,
        info: info,
        warn: warn,
        error: error,
        debug: debug,
        setLevel: setLevel,
        
        // properties
        levels: levels,
        currentLevel: currentLevel,
        MODULE: MODULE
    };

    return LoggerObject;

})();

// ========================
// 🎯 وصل کردن به global scope
// ========================
if (typeof self !== 'undefined') {
    self.Logger = Logger;
} else if (typeof global !== 'undefined') {
    global.Logger = Logger;
}