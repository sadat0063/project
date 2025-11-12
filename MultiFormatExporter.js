/**
 * MultiFormatExporter.js v3.0 - Enhanced for Deep Scan + Live Scan
 * Handles multiple export formats with streaming support
 */

class MultiFormatExporter {
    constructor() {
        this.moduleName = 'MultiFormatExporter';
        this.version = '3.0.0';

        this.formats = {
            JSON: 'json',
            CSV: 'csv', 
            TXT: 'txt',
            HTML: 'html',
            JSONL: 'jsonl',
            PDF: 'pdf'
        };

        this.config = {
            defaultFormat: 'JSON',
            includeMetadata: true,
            compressData: false,
            timestampFormat: 'iso',
            streamingSupport: true
        };
    }

    // Core Export Handlers
    async exportAll() {
        try {
            console.log(`📤 [${this.moduleName}] – Starting multi-format export...`);

            const data = await this._gatherExportData();
            const results = [];

            // Export in all supported formats
            results.push(await this._safeExport(() => this.exportAsJSON(data), 'JSON'));
            results.push(await this._safeExport(() => this.exportAsCSV(data), 'CSV'));
            results.push(await this._safeExport(() => this.exportAsTXT(data), 'TXT'));
            results.push(await this._safeExport(() => this.exportAsHTML(data), 'HTML'));
            results.push(await this._safeExport(() => this.exportAsJSONL(data), 'JSONL'));

            const successful = results.filter(r => r.success).length;
            console.log(`✅ [${this.moduleName}] Export completed: ${successful}/${results.length} successful`);

            return { success: true, results };

        } catch (error) {
            console.error(`❌ [${this.moduleName}] Multi-format export failed`, error);
            return { success: false, error: error.message };
        }
    }

    async _safeExport(executor, format) {
        try {
            return await executor();
        } catch (err) {
            console.error(`❌ [${format}] export failed`, err);
            return { success: false, format, error: err.message };
        }
    }

    // Single-format Exports
    async exportAsJSON(data) {
        console.log(`📝 [${this.moduleName}] Generating JSON...`);
        
        const exportData = {
            metadata: this._metadata(),
            exportConfig: this.config,
            data: this._prepareDataForExport(data)
        };

        const file = `chatsavepro_export_${this._timestamp()}.json`;
        const content = JSON.stringify(exportData, null, 2);
        const result = await this._saveToStorage(file, content, 'json');
        
        return { 
            success: true, 
            filename: file, 
            format: 'json', 
            size: content.length, 
            method: 'storage', 
            ...result 
        };
    }

    async exportAsCSV(data) {
        console.log(`📊 [${this.moduleName}] Generating CSV...`);
        
        let csv = "Type,Platform,URL,Timestamp,Messages,ScanLevel,Duration\n";

        if (Array.isArray(data.scanResults)) {
            for (const record of data.scanResults) {
                const ts = new Date(record.timestamp).toISOString();
                const platform = record.platform || 'unknown';
                const messageCount = record.messageCount || (record.scanType === 'live' ? 1 : 0);
                const scanLevel = record.data?.scanLevel || record.scanType;
                const duration = record.data?.performance?.scanDuration || 'N/A';
                const url = `"${record.url?.replace(/"/g, '""')}"`;
                
                csv += `${record.scanType},${platform},${url},${ts},${messageCount},${scanLevel},${duration}\n`;
            }
        }

        const file = `chatsavepro_export_${this._timestamp()}.csv`;
        const result = await this._saveToStorage(file, csv, 'csv');
        
        return { 
            success: true, 
            filename: file, 
            format: 'csv', 
            size: csv.length, 
            method: 'storage', 
            ...result 
        };
    }

    async exportAsTXT(data) {
        console.log(`📃 [${this.moduleName}] Generating TXT...`);
        
        let txt = `ChatSavePro Export Report v${this.version}\n`;
        txt += `Generated: ${new Date().toLocaleString()}\n`;
        txt += `Total Records: ${data.scanResults?.length || 0}\n`;
        txt += `Deep Scans: ${data.statistics?.deepScans || 0}\n`;
        txt += `Live Messages: ${data.statistics?.liveScans || 0}\n`;
        txt += "=".repeat(50) + "\n\n";

        if (Array.isArray(data.scanResults)) {
            data.scanResults.forEach((record, i) => {
                txt += `RECORD ${i + 1}:\n`;
                txt += `  Type: ${record.scanType}\n`;
                txt += `  Platform: ${record.platform || 'unknown'}\n`;
                txt += `  URL: ${record.url}\n`;
                txt += `  Title: ${record.title}\n`;
                txt += `  Time: ${new Date(record.timestamp).toLocaleString()}\n`;
                txt += `  Messages: ${record.messageCount || 1}\n`;
                txt += `  Scan Level: ${record.data?.scanLevel || record.scanType}\n`;
                
                if (record.data?.performance) {
                    txt += `  Duration: ${record.data.performance.scanDuration}ms\n`;
                }
                
                txt += `  Status: ${record.success ? 'SUCCESS' : 'FAILED'}\n\n`;
            });
        }

        const file = `chatsavepro_export_${this._timestamp()}.txt`;
        const result = await this._saveToStorage(file, txt, 'txt');
        
        return { 
            success: true, 
            filename: file, 
            format: 'txt', 
            size: txt.length, 
            method: 'storage', 
            ...result 
        };
    }

    async exportAsHTML(data) {
        console.log(`🌐 [${this.moduleName}] Generating HTML...`);
        
        const html = this._generateHTMLReport(data);
        const file = `chatsavepro_export_${this._timestamp()}.html`;
        const result = await this._saveToStorage(file, html, 'html');
        
        return { 
            success: true, 
            filename: file, 
            format: 'html', 
            size: html.length, 
            method: 'storage', 
            ...result 
        };
    }

    async exportAsJSONL(data) {
        console.log(`📑 [${this.moduleName}] Generating JSONL (streaming format)...`);
        
        let jsonlContent = '';
        
        if (Array.isArray(data.scanResults)) {
            jsonlContent = data.scanResults
                .map(record => JSON.stringify(record))
                .join('\n');
        }

        const file = `chatsavepro_export_${this._timestamp()}.jsonl`;
        const result = await this._saveToStorage(file, jsonlContent, 'jsonl');
        
        return { 
            success: true, 
            filename: file, 
            format: 'jsonl', 
            size: jsonlContent.length, 
            method: 'storage', 
            ...result 
        };
    }

    async exportAsPDF(data) {
        console.log(`📄 [${this.moduleName}] Generating PDF...`);
        
        // Simple PDF generation (text-based)
        const pdfContent = this._generatePDFContent(data);
        const file = `chatsavepro_export_${this._timestamp()}.pdf`;
        const result = await this._saveToStorage(file, pdfContent, 'pdf');
        
        return { 
            success: true, 
            filename: file, 
            format: 'pdf', 
            size: pdfContent.length, 
            method: 'storage', 
            ...result 
        };
    }

    async exportSelected(format, data) {
        const fmt = (format || '').toUpperCase();
        
        switch (fmt) {
            case 'PDF': return await this.exportAsPDF(data);
            case 'JSON': return await this.exportAsJSON(data);
            case 'CSV': return await this.exportAsCSV(data);
            case 'TXT': return await this.exportAsTXT(data);
            case 'HTML': return await this.exportAsHTML(data);
            case 'JSONL': return await this.exportAsJSONL(data);
            default: throw new Error(`Unsupported format: ${fmt}`);
        }
    }

    // Streaming Export Support
    async startStreamingExport(sessionId, format = 'jsonl') {
        console.log(`🔄 [${this.moduleName}] Starting streaming export for session: ${sessionId}`);
        
        const streamInfo = {
            sessionId: sessionId,
            format: format,
            startTime: Date.now(),
            recordCount: 0,
            chunks: []
        };

        // Store stream info
        await this._storeStreamInfo(streamInfo);
        
        return {
            success: true,
            sessionId: sessionId,
            format: format,
            message: 'Streaming export started'
        };
    }

    async appendToStream(sessionId, data) {
        console.log(`📦 [${this.moduleName}] Appending to stream: ${sessionId}`, data.length, 'records');
        
        try {
            // Get stream info
            const streamInfo = await this._getStreamInfo(sessionId);
            if (!streamInfo) {
                throw new Error(`Stream session not found: ${sessionId}`);
            }

            // Append data
            streamInfo.chunks.push({
                timestamp: Date.now(),
                data: data,
                recordCount: data.length
            });

            streamInfo.recordCount += data.length;

            // Update stream info
            await this._storeStreamInfo(streamInfo);

            return {
                success: true,
                sessionId: sessionId,
                appendedCount: data.length,
                totalRecords: streamInfo.recordCount
            };

        } catch (error) {
            console.error(`❌ [${this.moduleName}] Stream append failed:`, error);
            throw error;
        }
    }

    async finalizeStream(sessionId) {
        console.log(`✅ [${this.moduleName}] Finalizing stream: ${sessionId}`);
        
        try {
            const streamInfo = await this._getStreamInfo(sessionId);
            if (!streamInfo) {
                throw new Error(`Stream session not found: ${sessionId}`);
            }

            // Combine all chunks
            const allData = streamInfo.chunks.flatMap(chunk => chunk.data);
            
            // Create final export
            const exportData = {
                metadata: {
                    ...this._metadata(),
                    exportType: 'streaming',
                    sessionId: sessionId,
                    startTime: streamInfo.startTime,
                    endTime: Date.now(),
                    totalRecords: streamInfo.recordCount
                },
                data: allData
            };

            // Export in selected format
            const result = await this.exportSelected(streamInfo.format, exportData);

            // Cleanup stream info
            await this._cleanupStreamInfo(sessionId);

            return {
                ...result,
                streamInfo: {
                    sessionId: sessionId,
                    duration: Date.now() - streamInfo.startTime,
                    totalChunks: streamInfo.chunks.length,
                    totalRecords: streamInfo.recordCount
                }
            };

        } catch (error) {
            console.error(`❌ [${this.moduleName}] Stream finalization failed:`, error);
            throw error;
        }
    }

    // Storage & Support Utilities
    async _saveToStorage(filename, content, fileType) {
        const key = `export_${fileType}_${Date.now()}`;
        
        try {
            const blob = new Blob([content], { type: this._getMimeType(fileType) });
            const url = URL.createObjectURL(blob);
            
            await new Promise((resolve, reject) => {
                chrome.downloads.download({
                    url: url,
                    filename: filename,
                    saveAs: true
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(downloadId);
                    }
                });
            });

            console.log(`💾 [${this.moduleName}] ${fileType} downloaded: ${filename}`);

            // Save reference in storage
            await chrome.storage.local.set({
                [key]: {
                    filename,
                    size: content.length,
                    fileType,
                    timestamp: Date.now(),
                    downloaded: true
                }
            });

            // Cleanup URL
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            return { downloadSuccess: true, storageKey: key };
            
        } catch (err) {
            console.error(`❌ [${this.moduleName}] Download failed`, err);
            
            // Fallback: save to storage only
            try {
                await chrome.storage.local.set({
                    [key]: {
                        filename,
                        content: content,
                        size: content.length,
                        fileType,
                        timestamp: Date.now(),
                        downloaded: false,
                        error: err.message
                    }
                });
                return { downloadSuccess: false, storageKey: key, error: err.message };
            } catch (storageError) {
                throw new Error(`Download and storage failed: ${err.message}`);
            }
        }
    }

    _getMimeType(fileType) {
        const types = {
            'pdf': 'application/pdf',
            'json': 'application/json',
            'csv': 'text/csv',
            'txt': 'text/plain',
            'html': 'text/html',
            'jsonl': 'application/jsonl'
        };
        return types[fileType] || 'text/plain';
    }

    async _gatherExportData() {
        try {
            const result = await chrome.storage.local.get(['scanResults', 'settings', 'liveScanData']);
            const scanResults = result.scanResults || [];
            const settings = result.settings || {};
            const liveScanData = result.liveScanData || [];
            
            let enhanced = [];
            if (typeof self.AdvancedStorageManager !== 'undefined' && 
                typeof self.AdvancedStorageManager.getAllScans === 'function') {
                try {
                    enhanced = await self.AdvancedStorageManager.getAllScans();
                } catch (e) {
                    console.warn('AdvancedStorageManager not available:', e);
                }
            }
            
            // Combine all data
            const allScans = [...scanResults, ...liveScanData, ...enhanced];
            
            return {
                scanResults: allScans,
                settings,
                statistics: await this._calculateStatistics(allScans),
                exportInfo: this._metadata()
            };
            
        } catch (error) {
            console.error('❌ Failed to gather export data:', error);
            return {
                scanResults: [],
                settings: {},
                statistics: { totalScans: 0, totalMessages: 0, platforms: {}, uniqueUrls: 0 },
                exportInfo: this._metadata()
            };
        }
    }

    async _calculateStatistics(allScans) {
        const totalScans = allScans.length;
        const platforms = {};
        let totalMessages = 0;
        let deepScans = 0;
        let liveScans = 0;
        
        allScans.forEach(scan => {
            const platform = scan.platform || 'unknown';
            platforms[platform] = (platforms[platform] || 0) + 1;
            
            if (scan.scanType === 'deep') {
                totalMessages += scan.messageCount || 0;
                deepScans++;
            } else if (scan.scanType === 'live') {
                totalMessages += 1; // Each live record is one message
                liveScans++;
            } else {
                totalMessages += scan.messageCount || 0;
            }
        });
        
        return {
            totalScans,
            totalMessages,
            deepScans,
            liveScans,
            platforms,
            uniqueUrls: new Set(allScans.map(s => s.url)).size
        };
    }

    // Local Helpers
    _metadata() {
        return {
            exportedAt: new Date().toISOString(),
            version: this.version,
            exporter: this.moduleName,
            formats: Object.values(this.formats)
        };
    }

    _prepareDataForExport(data) {
        // Clean and prepare data for export
        return {
            ...data,
            scanResults: data.scanResults?.map(scan => ({
                id: scan.id,
                scanType: scan.scanType,
                timestamp: scan.timestamp,
                url: scan.url,
                title: scan.title,
                platform: scan.platform,
                messageCount: scan.messageCount,
                data: scan.data ? {
                    scanLevel: scan.data.scanLevel,
                    performance: scan.data.performance,
                    // Exclude large DOM snapshots for export
                    domSnapshot: scan.data.domSnapshot ? {
                        totalElements: scan.data.domSnapshot.totalElements,
                        timestamp: scan.data.domSnapshot.timestamp
                    } : undefined
                } : undefined
            })) || []
        };
    }

    _generatePDFContent(data) {
        // Simple text-based PDF content
        return `%PDF-1.4
ChatSavePro Export
Total Scans: ${data.scanResults?.length || 0}
Deep Scans: ${data.statistics?.deepScans || 0}
Live Messages: ${data.statistics?.liveScans || 0}
Generated: ${new Date().toISOString()}
`;
    }

    _generateHTMLReport(data) {
        const rows = (data.scanResults || []).map(scan => `
        <div class="scan">
            <div class="scan-type ${scan.scanType}">${scan.scanType === 'deep' ? '🎯' : '🔄'} ${scan.scanType}</div>
            <div class="platform">${scan.platform || 'unknown'}</div>
            <div><strong>URL:</strong> ${scan.url}</div>
            <div><strong>Title:</strong> ${scan.title}</div>
            <div><strong>Time:</strong> ${new Date(scan.timestamp).toLocaleString()}</div>
            <div><strong>Messages:</strong> ${scan.messageCount || 1}</div>
            <div class="success"><strong>Status:</strong> SUCCESS</div>
        </div>`).join('');
        
        return `<!DOCTYPE html>
<html><head><title>ChatSavePro Export</title>
<style>
body{font-family:Arial,sans-serif;margin:20px}
.header{background:#f0f0f0;padding:20px;border-radius:5px}
.scan{border:1px solid #ddd;margin:10px 0;padding:15px;border-radius:5px}
.scan-type{font-weight:bold;padding:2px 6px;border-radius:3px;color:white;display:inline-block;margin-right:10px}
.scan-type.deep{background:#4CAF50}
.scan-type.live{background:#2196F3}
.platform{font-weight:bold;color:#2c3e50}.success{color:green}
</style></head>
<body>
<div class="header">
<h1>ChatSavePro Export v${this.version}</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<p>Total Scans: ${(data.scanResults || []).length}</p>
<p>Deep Scans: ${data.statistics?.deepScans || 0}</p>
<p>Live Messages: ${data.statistics?.liveScans || 0}</p>
</div>${rows}</body></html>`;
    }

    _timestamp() {
        return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }

    // Streaming support methods
    async _storeStreamInfo(streamInfo) {
        const key = `stream_${streamInfo.sessionId}`;
        await chrome.storage.local.set({ [key]: streamInfo });
    }

    async _getStreamInfo(sessionId) {
        const key = `stream_${sessionId}`;
        const result = await chrome.storage.local.get([key]);
        return result[key];
    }

    async _cleanupStreamInfo(sessionId) {
        const key = `stream_${sessionId}`;
        await chrome.storage.local.remove([key]);
    }

    // Storage Maintenance
    async getExportsFromStorage() {
        const all = await chrome.storage.local.get(null);
        const out = {};
        for (const [k, v] of Object.entries(all)) {
            if (k.startsWith('export_')) out[k] = v;
        }
        return out;
    }

    async clearExportsFromStorage() {
        const all = await chrome.storage.local.get(null);
        const keys = Object.keys(all).filter(k => k.startsWith('export_'));
        await chrome.storage.local.remove(keys);
        return { cleared: keys.length };
    }

    getSupportedFormats() {
        return Object.values(this.formats);
    }

    getStreamingFormats() {
        return ['jsonl', 'txt']; // Formats suitable for streaming
    }
}

// Global registration
if (typeof self !== 'undefined') {
    self.MultiFormatExporter = MultiFormatExporter;
}

console.log('✅ MultiFormatExporter v3.0 loaded');