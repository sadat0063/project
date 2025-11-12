// ==================================================
// PDF Generator - Professional PDF Reports
// ==================================================

class PDFGenerator {
    constructor() {
        this.jsPDF = null;
    }

    async generate(data, timestamp, options = {}) {
        try {
            console.log('📕 Generating PDF report...');
            
            await this.loadJSPDF();
            
            const pdf = new this.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const baseName = `chatsavepro-export-${timestamp}`;
            const filename = `${baseName}.pdf`;
            
            // Generate PDF content
            await this.generatePDFContent(pdf, data, options);
            
            const pdfContent = pdf.output('blob');
            
            console.log('✅ PDF report created successfully');
            return {
                content: pdfContent,
                filename: filename,
                mimeType: 'application/pdf',
                format: 'pdf'
            };
            
        } catch (error) {
            console.error('❌ PDF generation failed:', error);
            // Fallback to text-based PDF
            return await this.generateFallbackPDF(data, timestamp);
        }
    }

    async generatePDFContent(pdf, data, options) {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 20;
        let yPosition = margin;
        
        // Title Page
        this.addTitlePage(pdf, data, pageWidth, margin);
        pdf.addPage();
        
        yPosition = margin;
        
        // Summary Section
        yPosition = this.addSummarySection(pdf, data, margin, yPosition, pageWidth);
        
        // Statistics Section
        yPosition = this.addStatisticsSection(pdf, data, margin, yPosition, pageWidth);
        
        // Detailed Scans
        yPosition = this.addDetailedScans(pdf, data, margin, yPosition, pageWidth);
        
        // Footer
        this.addFooter(pdf, data, pageWidth);
    }

    addTitlePage(pdf, data, pageWidth, margin) {
        // Title
        pdf.setFontSize(24);
        pdf.setFont(undefined, 'bold');
        pdf.text('ChatSavePro Export Report', pageWidth / 2, 60, { align: 'center' });
        
        // Subtitle
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'normal');
        pdf.text('Advanced Chat Data Analysis', pageWidth / 2, 80, { align: 'center' });
        
        // Statistics
        pdf.setFontSize(12);
        pdf.text(`Total Scans: ${data.scanResults.length}`, pageWidth / 2, 110, { align: 'center' });
        pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 120, { align: 'center' });
        pdf.text(`Version: 3.1.0`, pageWidth / 2, 130, { align: 'center' });
        
        // Logo/Decoration
        pdf.setFontSize(48);
        pdf.text('📊', pageWidth / 2, 180, { align: 'center' });
    }

    addSummarySection(pdf, data, margin, yPosition, pageWidth) {
        pdf.setFontSize(18);
        pdf.setFont(undefined, 'bold');
        pdf.text('Executive Summary', margin, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'normal');
        
        const summaryLines = [
            `Total Scans Collected: ${data.scanResults.length}`,
            `Deep Scans: ${data.statistics.deepScans}`,
            `Live Scans: ${data.statistics.liveScans}`,
            `Platforms Monitored: ${Object.keys(data.statistics.platforms).length}`,
            `Total Messages: ${data.scanResults.reduce((sum, scan) => sum + (scan.messageCount || 0), 0)}`
        ];
        
        summaryLines.forEach(line => {
            if (yPosition > 270) {
                pdf.addPage();
                yPosition = margin;
            }
            pdf.text(`• ${line}`, margin + 5, yPosition);
            yPosition += 6;
        });
        
        return yPosition + 10;
    }

    addStatisticsSection(pdf, data, margin, yPosition, pageWidth) {
        if (yPosition > 200) {
            pdf.addPage();
            yPosition = margin;
        }
        
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('Platform Statistics', margin, yPosition);
        yPosition += 12;
        
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        
        Object.entries(data.statistics.platforms).forEach(([platform, count]) => {
            if (yPosition > 270) {
                pdf.addPage();
                yPosition = margin;
            }
            
            const percentage = ((count / data.scanResults.length) * 100).toFixed(1);
            pdf.text(`${platform}: ${count} scans (${percentage}%)`, margin + 5, yPosition);
            yPosition += 5;
        });
        
        return yPosition + 10;
    }

    addDetailedScans(pdf, data, margin, yPosition, pageWidth) {
        pdf.setFontSize(16);
        pdf.setFont(undefined, 'bold');
        pdf.text('Detailed Scan Report', margin, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');
        
        data.scanResults.slice(0, 20).forEach((scan, index) => { // Limit to first 20 scans
            if (yPosition > 270) {
                pdf.addPage();
                yPosition = margin;
                pdf.setFontSize(9);
            }
            
            // Scan header
            pdf.setFont(undefined, 'bold');
            pdf.text(`Scan ${index + 1}: ${scan.scanType.toUpperCase()} - ${scan.platform}`, margin, yPosition);
            yPosition += 4;
            
            // Scan details
            pdf.setFont(undefined, 'normal');
            pdf.text(`URL: ${this.truncateText(scan.url, 50)}`, margin + 5, yPosition);
            yPosition += 4;
            
            pdf.text(`Time: ${new Date(scan.timestamp).toLocaleString()}`, margin + 5, yPosition);
            yPosition += 4;
            
            pdf.text(`Messages: ${scan.messageCount || 1}`, margin + 5, yPosition);
            yPosition += 4;
            
            if (scan.data?.performance) {
                pdf.text(`Duration: ${scan.data.performance.scanDuration}ms`, margin + 5, yPosition);
                yPosition += 4;
            }
            
            yPosition += 3; // Spacing between scans
        });
        
        return yPosition;
    }

    addFooter(pdf, data, pageWidth) {
        const pageCount = pdf.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(128, 128, 128);
            pdf.text(
                `Page ${i} of ${pageCount} | ChatSavePro v3.1.0 | ${new Date().toLocaleDateString()}`,
                pageWidth / 2,
                290,
                { align: 'center' }
            );
        }
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    async generateFallbackPDF(data, timestamp) {
        // Simple text-based PDF fallback
        const pdfContent = this.generatePDFContentText(data);
        const filename = `chatsavepro-export-${timestamp}.pdf`;
        
        return {
            content: pdfContent,
            filename: filename,
            mimeType: 'application/pdf',
            format: 'pdf',
            fallback: true
        };
    }

    generatePDFContentText(data) {
        let pdfText = `ChatSavePro Export Report\n`;
        pdfText += `Generated: ${new Date().toLocaleString()}\n`;
        pdfText += `Version: 3.1.0\n\n`;
        pdfText += `SUMMARY\n`;
        pdfText += `Total Scans: ${data.scanResults.length}\n`;
        pdfText += `Deep Scans: ${data.statistics.deepScans}\n`;
        pdfText += `Live Scans: ${data.statistics.liveScans}\n\n`;
        pdfText += `DETAILED SCANS\n`;
        
        data.scanResults.forEach((scan, index) => {
            pdfText += `Scan ${index + 1}: ${scan.scanType} - ${scan.platform}\n`;
            pdfText += `  URL: ${scan.url}\n`;
            pdfText += `  Time: ${new Date(scan.timestamp).toLocaleString()}\n`;
            pdfText += `  Messages: ${scan.messageCount || 1}\n\n`;
        });
        
        return pdfText;
    }

    async loadJSPDF() {
        if (this.jsPDF) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('lib/jspdf.min.js');
            script.onload = () => {
                this.jsPDF = window.jspdf.jsPDF;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}