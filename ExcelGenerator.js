// ==================================================
// Excel Generator - Advanced Spreadsheet Export
// ==================================================

class ExcelGenerator {
    constructor() {
        this.XLSX = null;
    }

    async generate(data, timestamp, options = {}) {
        try {
            console.log('📈 Generating Excel workbook...');
            
            await this.loadXLSX();
            
            const workbook = this.XLSX.utils.book_new();
            const baseName = `chatsavepro-export-${timestamp}`;
            const filename = `${baseName}.xlsx`;
            
            // Create multiple sheets
            await this.createSummarySheet(workbook, data);
            await this.createScansSheet(workbook, data);
            await this.createStatisticsSheet(workbook, data);
            await this.createPlatformsSheet(workbook, data);
            
            // Generate Excel file
            const excelContent = this.XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'array',
                compression: true
            });
            
            console.log('✅ Excel workbook created successfully');
            return {
                content: excelContent,
                filename: filename,
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                format: 'xlsx'
            };
            
        } catch (error) {
            console.error('❌ Excel generation failed:', error);
            throw new Error(`Excel generation failed: ${error.message}`);
        }
    }

    async createSummarySheet(workbook, data) {
        const summaryData = [
            ['ChatSavePro Export Summary', ''],
            ['Generated', new Date().toLocaleString()],
            ['Version', '3.1.0'],
            [''],
            ['Overall Statistics', ''],
            ['Total Scans', data.scanResults.length],
            ['Deep Scans', data.statistics.deepScans],
            ['Live Scans', data.statistics.liveScans],
            ['Total Messages', data.scanResults.reduce((sum, scan) => sum + (scan.messageCount || 0), 0)],
            ['Platforms', Object.keys(data.statistics.platforms).length],
            [''],
            ['Date Range', ''],
            ['Earliest Scan', new Date(Math.min(...data.scanResults.map(s => s.timestamp))).toLocaleString()],
            ['Latest Scan', new Date(Math.max(...data.scanResults.map(s => s.timestamp))).toLocaleString()]
        ];
        
        const worksheet = this.XLSX.utils.aoa_to_sheet(summaryData);
        
        // Style the worksheet
        this.applySummaryStyles(worksheet);
        
        this.XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
    }

    async createScansSheet(workbook, data) {
        const headers = [
            'Scan ID',
            'Type',
            'Platform',
            'URL',
            'Timestamp',
            'Message Count',
            'Scan Duration (ms)',
            'Elements Processed'
        ];
        
        const scanData = data.scanResults.map((scan, index) => [
            scan.id || `scan_${index + 1}`,
            scan.scanType,
            scan.platform || 'unknown',
            scan.url,
            new Date(scan.timestamp),
            scan.messageCount || 1,
            scan.data?.performance?.scanDuration || 0,
            scan.data?.performance?.elementsProcessed || 0
        ]);
        
        const worksheet = this.XLSX.utils.aoa_to_sheet([headers, ...scanData]);
        
        // Style the worksheet
        this.applyDataStyles(worksheet, scanData.length);
        
        this.XLSX.utils.book_append_sheet(workbook, worksheet, 'All Scans');
    }

    async createStatisticsSheet(workbook, data) {
        const platformData = [
            ['Platform', 'Scan Count', 'Percentage']
        ];
        
        Object.entries(data.statistics.platforms).forEach(([platform, count]) => {
            const percentage = ((count / data.scanResults.length) * 100).toFixed(2);
            platformData.push([platform, count, `${percentage}%`]);
        });
        
        // Add scan type distribution
        platformData.push(['']);
        platformData.push(['Scan Type Distribution', '']);
        platformData.push(['Deep Scans', data.statistics.deepScans]);
        platformData.push(['Live Scans', data.statistics.liveScans]);
        
        const worksheet = this.XLSX.utils.aoa_to_sheet(platformData);
        this.XLSX.utils.book_append_sheet(workbook, worksheet, 'Statistics');
    }

    async createPlatformsSheet(workbook, data) {
        const platforms = {};
        
        // Group scans by platform
        data.scanResults.forEach(scan => {
            const platform = scan.platform || 'unknown';
            if (!platforms[platform]) {
                platforms[platform] = [];
            }
            platforms[platform].push(scan);
        });
        
        // Create detailed platform analysis
        const platformAnalysis = [
            ['Platform Analysis', '', '', '', ''],
            ['Platform', 'Total Scans', 'Avg Messages', 'Success Rate', 'Avg Duration (ms)']
        ];
        
        Object.entries(platforms).forEach(([platform, scans]) => {
            const avgMessages = Math.round(scans.reduce((sum, s) => sum + (s.messageCount || 0), 0) / scans.length);
            const avgDuration = Math.round(scans.reduce((sum, s) => sum + (s.data?.performance?.scanDuration || 0), 0) / scans.length);
            
            platformAnalysis.push([
                platform,
                scans.length,
                avgMessages,
                '100%', // Placeholder for success rate
                avgDuration
            ]);
        });
        
        const worksheet = this.XLSX.utils.aoa_to_sheet(platformAnalysis);
        this.XLSX.utils.book_append_sheet(workbook, worksheet, 'Platform Analysis');
    }

    applySummaryStyles(worksheet) {
        // Add basic styling to summary sheet
        if (!worksheet['!cols']) worksheet['!cols'] = [];
        worksheet['!cols'][0] = { width: 25 };
        worksheet['!cols'][1] = { width: 30 };
    }

    applyDataStyles(worksheet, dataLength) {
        // Set column widths
        if (!worksheet['!cols']) worksheet['!cols'] = [];
        worksheet['!cols'][0] = { width: 15 }; // Scan ID
        worksheet['!cols'][1] = { width: 10 }; // Type
        worksheet['!cols'][2] = { width: 15 }; // Platform
        worksheet['!cols'][3] = { width: 40 }; // URL
        worksheet['!cols'][4] = { width: 20 }; // Timestamp
        worksheet['!cols'][5] = { width: 15 }; // Message Count
        worksheet['!cols'][6] = { width: 18 }; // Duration
        worksheet['!cols'][7] = { width: 18 }; // Elements
        
        // Freeze header row
        worksheet['!freeze'] = { x: 0, y: 1 };
        
        // Add filter to header
        worksheet['!autofilter'] = { ref: `A1:H${dataLength + 1}` };
    }

    async loadXLSX() {
        if (this.XLSX) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('lib/xlsx.min.js');
            script.onload = () => {
                this.XLSX = window.XLSX;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}