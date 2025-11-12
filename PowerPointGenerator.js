// ==================================================
// PowerPoint Generator - Professional Presentations
// ==================================================

class PowerPointGenerator {
    constructor() {
        this.pptx = null;
    }

    async generate(data, timestamp, options = {}) {
        try {
            console.log('📊 Generating PowerPoint presentation...');
            
            await this.loadPptxGenJS();
            
            const presentation = new this.pptx();
            const baseName = `chatsavepro-export-${timestamp}`;
            const filename = `${baseName}.pptx`;
            
            // Create presentation slides
            await this.createTitleSlide(presentation, data);
            await this.createSummarySlide(presentation, data);
            await this.createStatisticsSlide(presentation, data);
            await this.createPlatformAnalysisSlide(presentation, data);
            await this.createDetailedScansSlide(presentation, data);
            await this.createConclusionSlide(presentation, data);
            
            // Generate PowerPoint file
            const pptxContent = await presentation.write('blob');
            
            console.log('✅ PowerPoint presentation created successfully');
            return {
                content: pptxContent,
                filename: filename,
                mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                format: 'pptx'
            };
            
        } catch (error) {
            console.error('❌ PowerPoint generation failed:', error);
            throw new Error(`PowerPoint generation failed: ${error.message}`);
        }
    }

    async createTitleSlide(presentation, data) {
        presentation.addSlide({
            masterName: 'MASTER_SLIDE',
            slideNumber: { x: '90%', y: '95%' }
        });
        
        // Title
        presentation.addText('ChatSavePro Analytics Report', {
            x: 0.5,
            y: 1.5,
            w: '90%',
            h: 1.5,
            align: 'center',
            fontSize: 32,
            bold: true,
            color: '2C3E50'
        });
        
        // Subtitle
        presentation.addText('Advanced Chat Data Analysis & Insights', {
            x: 0.5,
            y: 3.0,
            w: '90%',
            h: 1,
            align: 'center',
            fontSize: 18,
            color: '7F8C8D'
        });
        
        // Statistics
        presentation.addText([
            { text: `Total Scans: ${data.scanResults.length}`, options: { fontSize: 16, color: '27AE60' } },
            { text: ' • ', options: { fontSize: 16, color: 'BDC3C7' } },
            { text: `Platforms: ${Object.keys(data.statistics.platforms).length}`, options: { fontSize: 16, color: '2980B9' } },
            { text: ' • ', options: { fontSize: 16, color: 'BDC3C7' } },
            { text: `Messages: ${data.scanResults.reduce((sum, scan) => sum + (scan.messageCount || 0), 0)}`, options: { fontSize: 16, color: '8E44AD' } }
        ], {
            x: 0.5,
            y: 4.5,
            w: '90%',
            align: 'center',
            fontSize: 16
        });
        
        // Footer
        presentation.addText(`Generated: ${new Date().toLocaleString()} | ChatSavePro v3.1.0`, {
            x: 0.5,
            y: 6.5,
            w: '90%',
            align: 'center',
            fontSize: 12,
            color: '95A5A6'
        });
    }

    async createSummarySlide(presentation, data) {
        presentation.addSlide();
        
        // Slide title
        presentation.addText('Executive Summary', {
            x: 0.5,
            y: 0.5,
            w: '90%',
            fontSize: 24,
            bold: true,
            color: '2C3E50'
        });
        
        // Summary points
        const summaryPoints = [
            `📊 ${data.scanResults.length} total scans collected`,
            `🎯 ${data.statistics.deepScans} deep scans performed`,
            `🔄 ${data.statistics.liveScans} live monitoring sessions`,
            `🌐 ${Object.keys(data.statistics.platforms).length} different platforms monitored`,
            `💬 ${data.scanResults.reduce((sum, scan) => sum + (scan.messageCount || 0), 0)} total messages captured`,
            `⏱️ Data collected from ${new Date(Math.min(...data.scanResults.map(s => s.timestamp))).toLocaleDateString()} to ${new Date(Math.max(...data.scanResults.map(s => s.timestamp))).toLocaleDateString()}`
        ];
        
        summaryPoints.forEach((point, index) => {
            presentation.addText(point, {
                x: 0.7,
                y: 1.5 + (index * 0.6),
                w: '85%',
                fontSize: 14,
                bullet: { type: 'bullet' }
            });
        });
    }

    async createStatisticsSlide(presentation, data) {
        presentation.addSlide();
        
        // Slide title
        presentation.addText('Platform Statistics', {
            x: 0.5,
            y: 0.5,
            w: '90%',
            fontSize: 24,
            bold: true,
            color: '2C3E50'
        });
        
        // Create platform distribution chart data
        const platformData = Object.entries(data.statistics.platforms)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8); // Top 8 platforms
        
        const chartData = [
            { name: 'Platform', values: platformData.map(([platform]) => platform) },
            { name: 'Scans', values: platformData.map(([, count]) => count) }
        ];
        
        // Add bar chart
        presentation.addChart(presentation.ChartType.bar, chartData, {
            x: 0.5,
            y: 1.5,
            w: 6,
            h: 4,
            chartColors: ['#3498DB', '#2ECC71', '#E74C3C', '#F39C12', '#9B59B6', '#1ABC9C', '#34495E', '#E67E22']
        });
        
        // Add statistics table
        const tableData = platformData.map(([platform, count]) => [
            platform,
            count.toString(),
            `${((count / data.scanResults.length) * 100).toFixed(1)}%`
        ]);
        
        presentation.addTable(tableData, {
            x: 7.0,
            y: 1.5,
            w: 3,
            colW: [1.5, 0.7, 0.8],
            fontSize: 10,
            color: '2C3E50',
            border: { type: 'solid', color: 'BDC3C7' }
        });
        
        // Add table headers
        presentation.addText(['Platform', 'Count', 'Share'], {
            x: 7.0,
            y: 1.2,
            w: 3,
            fontSize: 11,
            bold: true,
            color: '34495E'
        });
    }

    async createPlatformAnalysisSlide(presentation, data) {
        presentation.addSlide();
        
        // Slide title
        presentation.addText('Platform Performance Analysis', {
            x: 0.5,
            y: 0.5,
            w: '90%',
            fontSize: 24,
            bold: true,
            color: '2C3E50'
        });
        
        // Group scans by platform and calculate metrics
        const platforms = {};
        data.scanResults.forEach(scan => {
            const platform = scan.platform || 'unknown';
            if (!platforms[platform]) {
                platforms[platform] = {
                    scans: [],
                    totalMessages: 0,
                    totalDuration: 0
                };
            }
            platforms[platform].scans.push(scan);
            platforms[platform].totalMessages += scan.messageCount || 0;
            platforms[platform].totalDuration += scan.data?.performance?.scanDuration || 0;
        });
        
        // Create performance metrics
        const performanceData = Object.entries(platforms).map(([platform, stats]) => [
            platform,
            stats.scans.length.toString(),
            Math.round(stats.totalMessages / stats.scans.length).toString(),
            Math.round(stats.totalDuration / stats.scans.length).toString() + 'ms'
        ]);
        
        // Add performance table
        presentation.addTable(performanceData, {
            x: 0.5,
            y: 1.5,
            w: 9,
            colW: [2, 1.5, 2, 2],
            fontSize: 12,
            color: '2C3E50',
            border: { type: 'solid', color: 'BDC3C7' }
        });
        
        // Add table headers
        presentation.addText(['Platform', 'Total Scans', 'Avg Messages', 'Avg Duration'], {
            x: 0.5,
            y: 1.2,
            w: 9,
            fontSize: 14,
            bold: true,
            color: '34495E'
        });
        
        // Add insights
        const topPlatform = Object.entries(platforms)
            .sort((a, b) => b[1].scans.length - a[1].scans.length)[0];
            
        presentation.addText([
            { text: 'Key Insight: ', options: { bold: true, color: 'E74C3C' } },
            { text: `${topPlatform[0]} is the most active platform with ${topPlatform[1].scans.length} scans and average of ${Math.round(topPlatform[1].totalMessages / topPlatform[1].scans.length)} messages per scan.`, options: { color: '2C3E50' } }
        ], {
            x: 0.5,
            y: 4.5,
            w: 9,
            fontSize: 12
        });
    }

    async createDetailedScansSlide(presentation, data) {
        presentation.addSlide();
        
        // Slide title
        presentation.addText('Recent Scan Activity', {
            x: 0.5,
            y: 0.5,
            w: '90%',
            fontSize: 24,
            bold: true,
            color: '2C3E50'
        });
        
        // Get recent scans (last 10)
        const recentScans = data.scanResults
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
        
        // Create scan timeline
        const scanData = recentScans.map((scan, index) => [
            (index + 1).toString(),
            scan.scanType === 'deep' ? '🎯 Deep' : '🔄 Live',
            scan.platform || 'unknown',
            new Date(scan.timestamp).toLocaleDateString(),
            (scan.messageCount || 1).toString()
        ]);
        
        // Add scans table
        presentation.addTable(scanData, {
            x: 0.5,
            y: 1.5,
            w: 9,
            colW: [0.5, 1, 1.5, 1.5, 1],
            fontSize: 10,
            color: '2C3E50',
            border: { type: 'solid', color: 'BDC3C7' }
        });
        
        // Add table headers
        presentation.addText(['#', 'Type', 'Platform', 'Date', 'Messages'], {
            x: 0.5,
            y: 1.2,
            w: 9,
            fontSize: 12,
            bold: true,
            color: '34495E'
        });
        
        // Add activity summary
        const today = new Date();
        const lastWeekScans = data.scanResults.filter(scan => 
            (today - new Date(scan.timestamp)) / (1000 * 60 * 60 * 24) <= 7
        ).length;
        
        presentation.addText([
            { text: 'Recent Activity: ', options: { bold: true, color: '27AE60' } },
            { text: `${lastWeekScans} scans in the last 7 days, showing ${lastWeekScans > 5 ? 'high' : 'moderate'} monitoring activity.`, options: { color: '2C3E50' } }
        ], {
            x: 0.5,
            y: 4.0,
            w: 9,
            fontSize: 12
        });
    }

    async createConclusionSlide(presentation, data) {
        presentation.addSlide();
        
        // Slide title
        presentation.addText('Conclusion & Recommendations', {
            x: 0.5,
            y: 0.5,
            w: '90%',
            fontSize: 24,
            bold: true,
            color: '2C3E50'
        });
        
        // Key findings
        const findings = [
            `✅ Successfully monitored ${data.scanResults.length} chat sessions`,
            `✅ Captured data from ${Object.keys(data.statistics.platforms).length} different platforms`,
            `✅ Maintained ${data.statistics.liveScans > 0 ? 'active' : 'periodic'} live monitoring`,
            `✅ Generated comprehensive analytics and reports`
        ];
        
        findings.forEach((finding, index) => {
            presentation.addText(finding, {
                x: 0.7,
                y: 1.5 + (index * 0.5),
                w: '85%',
                fontSize: 14,
                bullet: { type: 'bullet' }
            });
        });
        
        // Recommendations
        presentation.addText('Recommendations for Future Monitoring:', {
            x: 0.5,
            y: 3.5,
            w: '90%',
            fontSize: 16,
            bold: true,
            color: 'E74C3C'
        });
        
        const recommendations = [
            'Continue regular deep scans for comprehensive data collection',
            'Maintain live monitoring for real-time chat capture',
            'Expand platform coverage for broader data insights',
            'Schedule automated exports for data backup and analysis'
        ];
        
        recommendations.forEach((recommendation, index) => {
            presentation.addText(recommendation, {
                x: 0.7,
                y: 4.0 + (index * 0.5),
                w: '85%',
                fontSize: 12,
                bullet: { type: 'bullet' }
            });
        });
        
        // Final footer
        presentation.addText('ChatSavePro v3.1.0 - Advanced Chat Analytics', {
            x: 0.5,
            y: 6.5,
            w: '90%',
            align: 'center',
            fontSize: 10,
            color: '95A5A6'
        });
    }

    async loadPptxGenJS() {
        if (this.pptx) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('lib/pptxgen.min.js');
            script.onload = () => {
                this.pptx = window.PptxGenJS;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}