// ==================================================
// ExportManager.js v3.3 - Enhanced with 8 Principles
// ==================================================

// ✅ PRINCIPLE 1: Context Isolation - Module Pattern
const ExportManager = (function() {
    'use strict';

    const MODULE_VERSION = "3.3.0";
    const MODULE_NAME = "ExportManager";
    const MAX_EXPORT_SIZE = 50 * 1024 * 1024; // 50MB
    const MAX_HISTORY_ITEMS = 10;

    // ✅ PRINCIPLE 2: Strict Interface Contract - Data Validation
    const ExportValidator = {
        validateData: function(data) {
            if (!data || typeof data !== 'object') {
                throw new Error('Export data must be a valid object');
            }
            
            if (JSON.stringify(data).length > MAX_EXPORT_SIZE) {
                throw new Error(`Export data too large. Maximum size: ${MAX_EXPORT_SIZE} bytes`);
            }
            
            return true;
        },
        
        validateFormat: function(format, supportedFormats) {
            if (!supportedFormats[format]) {
                throw new Error(`Unsupported export format: ${format}. Supported: ${Object.keys(supportedFormats).join(', ')}`);
            }
            return true;
        },
        
        validateOptions: function(options) {
            if (options.formats && !Array.isArray(options.formats)) {
                throw new Error('Options.formats must be an array');
            }
            
            if (options.timeout && (typeof options.timeout !== 'number' || options.timeout < 0)) {
                throw new Error('Options.timeout must be a positive number');
            }
            
            return true;
        },
        
        sanitizeData: function(data) {
            const sanitized = JSON.parse(JSON.stringify(data)); // Deep clone
            
            // Remove sensitive fields recursively
            const removeSensitiveFields = (obj) => {
                if (obj && typeof obj === 'object') {
                    const sensitiveFields = ['apiKey', 'password', 'token', 'secret', 'cookie', 'auth', 'credential'];
                    sensitiveFields.forEach(field => {
                        if (obj[field]) delete obj[field];
                    });
                    
                    // Recursively clean nested objects
                    Object.values(obj).forEach(value => {
                        if (value && typeof value === 'object') {
                            removeSensitiveFields(value);
                        }
                    });
                }
            };
            
            removeSensitiveFields(sanitized);
            return sanitized;
        }
    };

    // ✅ PRINCIPLE 3: Lazy Loading - Generator Factory
    class GeneratorFactory {
        constructor() {
            this.generators = new Map();
            this.initialized = false;
        }

        async init() {
            if (this.initialized) return;
            
            // Lazy initialization of heavy generators
            this.generators.set('pdf', new PDFGenerator());
            this.generators.set('excel', new ExcelGenerator());
            this.generators.set('zip', new ZIPGenerator());
            
            // PowerPoint generator only when library is available
            if (typeof pptxgen !== 'undefined') {
                this.generators.set('powerpoint', new PowerPointGenerator());
            }
            
            this.initialized = true;
        }

        getGenerator(format) {
            if (!this.generators.has(format)) {
                switch (format) {
                    case 'pdf':
                        this.generators.set('pdf', new PDFGenerator());
                        break;
                    case 'xlsx':
                        this.generators.set('excel', new ExcelGenerator());
                        break;
                    case 'zip':
                        this.generators.set('zip', new ZIPGenerator());
                        break;
                    case 'pptx':
                        if (typeof pptxgen !== 'undefined') {
                            this.generators.set('powerpoint', new PowerPointGenerator());
                        } else {
                            throw new Error('PowerPoint export requires PptxGenJS library');
                        }
                        break;
                    default:
                        throw new Error(`No generator available for format: ${format}`);
                }
            }
            return this.generators.get(format);
        }

        hasGenerator(format) {
            return this.generators.has(format);
        }
    }

    // ✅ PRINCIPLE 4: Enhanced Error Handling with Context
    class ExportError extends Error {
        constructor(message, format, context = {}) {
            super(message);
            this.name = 'ExportError';
            this.format = format;
            this.timestamp = new Date().toISOString();
            this.context = context;
        }
    }

    // ✅ PRINCIPLE 5: Memory Management with Export History
    class ExportHistoryManager {
        constructor() {
            this.history = [];
            this.storageKey = 'chatsavepro_export_history';
        }

        async load() {
            try {
                const saved = await this.storage.getItem(this.storageKey);
                if (saved) {
                    this.history = JSON.parse(saved);
                }
            } catch (error) {
                console.warn('[ExportHistory] Failed to load history:', error);
                this.history = [];
            }
        }

        async save() {
            try {
                await this.storage.setItem(this.storageKey, JSON.stringify(this.history));
            } catch (error) {
                console.warn('[ExportHistory] Failed to save history:', error);
            }
        }

        async add(exportResult) {
            const historyItem = {
                ...exportResult,
                id: `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                size: exportResult.content ? exportResult.content.length : 0
            };

            this.history.unshift(historyItem);

            // Maintain size limit
            if (this.history.length > MAX_HISTORY_ITEMS) {
                this.history = this.history.slice(0, MAX_HISTORY_ITEMS);
            }

            await this.save();
            return historyItem;
        }

        async clear() {
            this.history = [];
            await this.storage.removeItem(this.storageKey);
        }

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
    }

    // ✅ PRINCIPLE 6: Security - Safe HTML Generation
    class SafeHTMLGenerator {
        static escapeHTML(unsafe) {
            if (typeof unsafe !== 'string') return unsafe;
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        static generateSafeHTML(data, version) {
            const safeData = {
                ...data,
                scanResults: (data.scanResults || []).map(scan => ({
                    ...scan,
                    platform: this.escapeHTML(scan.platform || 'unknown'),
                    url: this.escapeHTML(scan.url || 'N/A'),
                    scanType: this.escapeHTML(scan.scanType || 'unknown')
                }))
            };

            // استفاده از HTML generation اصلی با داده‌های sanitized
            return this.generateHTMLTemplate(safeData, version);
        }

        static generateHTMLTemplate(data, version) {
            // Implementation from original convertToHTML but with safe data
            let html = `<!DOCTYPE html>
<html>
<head>
    <title>ChatSavePro Export</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #4CAF50; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #4CAF50; }
        .scan { border: 1px solid #e0e0e0; margin: 15px 0; padding: 20px; border-radius: 8px; transition: all 0.3s ease; }
        .scan:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .scan-deep { border-left: 4px solid #4CAF50; }
        .scan-live { border-left: 4px solid #2196F3; }
        .scan-type { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
        .scan-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 14px; color: #666; }
        .platform-badge { background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="color: #2c3e50; margin: 0;">ChatSavePro Export</h1>
            <p style="color: #7f8c8d; margin: 5px 0;">Advanced Chat Data Export v${version}</p>
            <p style="color: #95a5a6;">Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div style="font-size: 24px; font-weight: bold; color: #2c3e50;">${data.scanResults?.length || 0}</div>
                <div style="color: #7f8c8d;">Total Scans</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 24px; font-weight: bold; color: #27ae60;">${data.statistics?.deepScans || 0}</div>
                <div style="color: #7f8c8d;">Deep Scans</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 24px; font-weight: bold; color: #2980b9;">${data.statistics?.liveScans || 0}</div>
                <div style="color: #7f8c8d;">Live Scans</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 24px; font-weight: bold; color: #8e44ad;">${Object.keys(data.statistics?.platforms || {}).length}</div>
                <div style="color: #7f8c8d;">Platforms</div>
            </div>
        </div>
        
        <div class="scans">`;
        
            (data.scanResults || []).forEach((scan, index) => {
                html += `
            <div class="scan scan-${scan.scanType}">
                <div class="scan-type">
                    ${scan.scanType === 'deep' ? '🎯' : '🔄'} 
                    ${scan.scanType.toUpperCase()} SCAN #${index + 1}
                    <span class="platform-badge">${scan.platform}</span>
                </div>
                <div class="scan-info">
                    <div><strong>URL:</strong> ${scan.url}</div>
                    <div><strong>Time:</strong> ${new Date(scan.timestamp).toLocaleString()}</div>
                    <div><strong>Messages:</strong> ${scan.messageCount || 1}</div>
                    <div><strong>Duration:</strong> ${scan.data?.performance?.scanDuration || 'N/A'}ms</div>
                </div>
            </div>`;
            });
            
            html += `
        </div>
        
        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #95a5a6;">
            <p>Generated by ChatSavePro v${version} - Advanced Export System</p>
            <p>Available Formats: ${Object.keys(this.formats).join(', ')}</p>
        </footer>
    </div>
</body>
</html>`;
            
            return html;
        }
    }

    // Main ExportManager class با improvements
    class ExportManager {
        constructor() {
            this.MODULE_VERSION = MODULE_VERSION;
            this.MODULE_NAME = MODULE_NAME;
            
            this.formats = {
                json: { name: 'JSON', mime: 'application/json', icon: '📊' },
                csv: { name: 'CSV', mime: 'text/csv', icon: '📈' },
                txt: { name: 'Text', mime: 'text/plain', icon: '📄' },
                jsonl: { name: 'JSONL', mime: 'application/jsonl', icon: '📑' },
                pdf: { name: 'PDF', mime: 'application/pdf', icon: '📕' },
                html: { name: 'HTML', mime: 'text/html', icon: '🌐' },
                xml: { name: 'XML', mime: 'application/xml', icon: '📋' },
                zip: { name: 'ZIP', mime: 'application/zip', icon: '📦' },
                pptx: { name: 'PowerPoint', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', icon: '📊' },
                xlsx: { name: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', icon: '📈' }
            };
            
            this.generatorFactory = new GeneratorFactory();
            this.historyManager = new ExportHistoryManager();
            this.initialized = false;
        }

        async init() {
            if (this.initialized) return;
            
            console.log(`[${this.MODULE_NAME}] Initializing v${this.MODULE_VERSION}`);
            
            try {
                await this.generatorFactory.init();
                await this.historyManager.load();
                this.initialized = true;
                console.log('✅ ExportManager initialized successfully');
            } catch (error) {
                console.error('❌ ExportManager initialization failed:', error);
                throw error;
            }
        }

        // ✅ PRINCIPLE 7: Async Pipeline with Enhanced Error Handling
        async exportData(data, format, options = {}) {
            if (!this.initialized) await this.init();

            try {
                // Validate inputs
                ExportValidator.validateData(data);
                ExportValidator.validateFormat(format, this.formats);
                ExportValidator.validateOptions(options);

                // Sanitize data
                const sanitizedData = ExportValidator.sanitizeData(data);
                
                console.log(`[${this.MODULE_NAME}] Starting export for format: ${format}`);
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                let result;

                // ✅ PRINCIPLE 8: Scalable Connector Design
                switch (format) {
                    case 'json':
                        result = await this.exportJSON(sanitizedData, timestamp);
                        break;
                    case 'csv':
                        result = await this.exportCSV(sanitizedData, timestamp);
                        break;
                    case 'txt':
                        result = await this.exportTXT(sanitizedData, timestamp);
                        break;
                    case 'jsonl':
                        result = await this.exportJSONL(sanitizedData, timestamp);
                        break;
                    case 'pdf':
                        result = await this.generatorFactory.getGenerator('pdf').generate(sanitizedData, timestamp, options);
                        break;
                    case 'html':
                        result = await this.exportHTML(sanitizedData, timestamp);
                        break;
                    case 'xml':
                        result = await this.exportXML(sanitizedData, timestamp);
                        break;
                    case 'zip':
                        result = await this.generatorFactory.getGenerator('zip').generate(sanitizedData, timestamp, options);
                        break;
                    case 'pptx':
                        result = await this.generatorFactory.getGenerator('powerpoint').generate(sanitizedData, timestamp, options);
                        break;
                    case 'xlsx':
                        result = await this.generatorFactory.getGenerator('excel').generate(sanitizedData, timestamp, options);
                        break;
                    default:
                        throw new ExportError(`Unsupported format: ${format}`, format);
                }

                console.log(`✅ Export completed: ${result.filename}`);
                
                // Record in history
                await this.historyManager.add(result);
                
                return result;
                
            } catch (error) {
                console.error(`❌ Export failed for ${format}:`, error);
                
                if (error instanceof ExportError) {
                    throw error;
                } else {
                    throw new ExportError(
                        `Export failed: ${error.message}`, 
                        format, 
                        { originalError: error.message }
                    );
                }
            }
        }

        // Basic format exporters (keep original implementations)
        async exportJSON(data, timestamp) {
            const content = JSON.stringify(this.prepareExportData(data), null, 2);
            return {
                content: content,
                filename: `chatsavepro-export-${timestamp}.json`,
                mimeType: this.formats.json.mime,
                format: 'json'
            };
        }

        async exportCSV(data, timestamp) {
            const content = this.convertToCSV(data);
            return {
                content: content,
                filename: `chatsavepro-export-${timestamp}.csv`,
                mimeType: this.formats.csv.mime,
                format: 'csv'
            };
        }

        async exportTXT(data, timestamp) {
            const content = this.convertToTXT(data);
            return {
                content: content,
                filename: `chatsavepro-export-${timestamp}.txt`,
                mimeType: this.formats.txt.mime,
                format: 'txt'
            };
        }

        async exportJSONL(data, timestamp) {
            const content = this.convertToJSONL(data);
            return {
                content: content,
                filename: `chatsavepro-export-${timestamp}.jsonl`,
                mimeType: this.formats.jsonl.mime,
                format: 'jsonl'
            };
        }

        async exportHTML(data, timestamp) {
            const content = SafeHTMLGenerator.generateSafeHTML(data, this.MODULE_VERSION);
            return {
                content: content,
                filename: `chatsavepro-export-${timestamp}.html`,
                mimeType: this.formats.html.mime,
                format: 'html'
            };
        }

        async exportXML(data, timestamp) {
            const content = this.convertToXML(data);
            return {
                content: content,
                filename: `chatsavepro-export-${timestamp}.xml`,
                mimeType: this.formats.xml.mime,
                format: 'xml'
            };
        }

        // Keep original converter methods (convertToCSV, convertToTXT, etc.)
        convertToCSV(data) {
            // Implementation from original...
            if (!data.scanResults || data.scanResults.length === 0) {
                return "Type,Platform,URL,Timestamp,Messages,ScanLevel\nNo data available";
            }
            
            const headers = ['Type', 'Platform', 'URL', 'Timestamp', 'Messages', 'ScanLevel'];
            let csvContent = headers.join(',') + '\n';
            
            data.scanResults.forEach(scan => {
                const row = [
                    scan.scanType || 'unknown',
                    scan.platform || 'unknown',
                    `"${scan.url || 'N/A'}"`,
                    new Date(scan.timestamp).toISOString(),
                    scan.messageCount || 1,
                    scan.data?.scanLevel || 'deep'
                ].map(field => `"${String(field).replace(/"/g, '""')}"`);
                
                csvContent += row.join(',') + '\n';
            });
            
            return csvContent;
        }

        convertToTXT(data) {
            // Implementation from original...
            let txtContent = `ChatSavePro Export v${this.MODULE_VERSION}\n`;
            txtContent += `Generated: ${new Date().toLocaleString()}\n`;
            txtContent += `Total Records: ${data.scanResults?.length || 0}\n`;
            txtContent += `Available Formats: ${Object.keys(this.formats).join(', ')}\n`;
            txtContent += "=".repeat(60) + "\n\n";
            
            if (!data.scanResults || data.scanResults.length === 0) {
                txtContent += 'No scan results available.\n';
                return txtContent;
            }
            
            data.scanResults.forEach((scan, index) => {
                txtContent += `Record #${index + 1}:\n`;
                txtContent += `  Type: ${scan.scanType || 'unknown'}\n`;
                txtContent += `  Platform: ${scan.platform || 'unknown'}\n`;
                txtContent += `  URL: ${scan.url || 'N/A'}\n`;
                txtContent += `  Time: ${new Date(scan.timestamp).toLocaleString()}\n`;
                txtContent += `  Messages: ${scan.messageCount || 1}\n`;
                txtContent += `  Scan Level: ${scan.data?.scanLevel || 'deep'}\n`;
                if (scan.data?.performance?.scanDuration) {
                    txtContent += `  Duration: ${scan.data.performance.scanDuration}ms\n`;
                }
                txtContent += "-".repeat(40) + "\n";
            });
            
            return txtContent;
        }

        convertToJSONL(data) {
            if (!data.scanResults || data.scanResults.length === 0) {
                return JSON.stringify({ error: "No data available" });
            }
            
            return data.scanResults
                .map(scan => JSON.stringify(scan))
                .join('\n');
        }

        convertToXML(data) {
            // Implementation from original...
            let xml = `<?xml version="1.0" encoding="UTF-8"?>
<chatsavepro-export version="${this.MODULE_VERSION}">
    <export-info>
        <generated>${new Date().toISOString()}</generated>
        <total-scans>${data.scanResults?.length || 0}</total-scans>
        <deep-scans>${data.statistics?.deepScans || 0}</deep-scans>
        <live-scans>${data.statistics?.liveScans || 0}</live-scans>
        <available-formats>${Object.keys(this.formats).join(',')}</available-formats>
    </export-info>
    <platforms>`;
    
            Object.entries(data.statistics?.platforms || {}).forEach(([platform, count]) => {
                xml += `
        <platform name="${platform}" count="${count}" />`;
            });
    
            xml += `
    </platforms>
    <scans>`;
    
            (data.scanResults || []).forEach((scan, index) => {
                xml += `
        <scan id="${scan.id || index + 1}">
            <type>${scan.scanType}</type>
            <platform>${scan.platform || 'unknown'}</platform>
            <url><![CDATA[${scan.url || 'N/A'}]]></url>
            <timestamp>${new Date(scan.timestamp).toISOString()}</timestamp>
            <message-count>${scan.messageCount || 1}</message-count>
            <performance>
                <scan-duration>${scan.data?.performance?.scanDuration || 0}</scan-duration>
                <elements-processed>${scan.data?.performance?.elementsProcessed || 0}</elements-processed>
            </performance>
        </scan>`;
            });
    
            xml += `
    </scans>
</chatsavepro-export>`;
    
            return xml;
        }

        prepareExportData(data) {
            return {
                ...data,
                exportInfo: {
                    ...data.exportInfo,
                    exportedAt: new Date().toISOString(),
                    version: this.MODULE_VERSION,
                    availableFormats: Object.keys(this.formats)
                }
            };
        }

        getSupportedFormats() {
            return this.formats;
        }

        async getExportHistory() {
            return this.historyManager.history;
        }

        async clearExportHistory() {
            await this.historyManager.clear();
        }
    }

    return ExportManager;
})();

// ✅ PRINCIPLE 1: Proper module export
export { ExportManager };

console.log('✅ ExportManager v3.3 loaded with enhanced 8-principles architecture');