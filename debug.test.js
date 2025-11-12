// -----------------------------------------------------------
// 🧪 ChatSavePro – DEBUG.TEST.JS (Auto Diagnostic Runner V2)
// -----------------------------------------------------------
// هدف: اجرای تست‌های حیاتی بر روی EnterpriseBackgroundController و گزارش نتایج.
// نسخه: 2.1.0 - با پشتیبانی کامل از Output HTML (V2)

if (typeof self.runDiagnostics === 'undefined') {
    /**
     * یک تابع شبیه‌سازی شده برای ارسال پاسخ به پیام‌ها.
     * @param {Object} response - شیء پاسخ پیام.
     * @returns {Promise<Object>} - یک Promise که با شیء پاسخ Resolve می‌شود.
     */
    const _mockHandleMessage = (message, controller) => {
        return new Promise(resolve => {
            const mockRespond = (response) => {
                resolve(response);
            };
            // ما از متد داخلی کنترلر استفاده می‌کنیم، نه Listener واقعی
            controller._handleMessage(message, {}, mockRespond);
        });
    };

    /**
     * تابع اصلی اجرای تست‌های تشخیصی.
     * @param {EnterpriseBackgroundController} controller - نمونه کنترلر پس‌زمینه.
     * @returns {Promise<{results: Array<Object>, finalStatus: string, htmlOutput: string}>}
     */
    self.runDiagnostics = async (controller) => {
        console.log('================================================');
        console.log('🚀 ChatSavePro Auto Diagnostic Runner V2 Started');
        console.log('================================================');

        const testResults = [];
        let globalPass = true;

        const logResult = (name, status, details = {}) => {
            const isPass = status === 'PASS';
            console.log(`[${isPass ? '✅' : '❌'}] ${name}: ${status}`);
            testResults.push({
                name,
                status,
                details: JSON.stringify(details, null, 2)
            });
            if (!isPass) {
                globalPass = false;
            }
        };

        // ============================================================
        // 1. Core Controller Status Check (getStatus)
        // ============================================================
        try {
            const msg = { action: 'getStatus' };
            const response = await _mockHandleMessage(msg, controller);

            if (response.success && response.status.controller === 'initialized' && response.status.storage === 'ready') {
                logResult('Core Status (getStatus)', 'PASS', response.status);
            } else {
                logResult('Core Status (getStatus)', 'FAIL', { response, expected: 'Initialized/Ready' });
            }
        } catch (e) {
            logResult('Core Status (getStatus)', 'FAIL (Exception)', { error: e.message });
        }

        // ============================================================
        // 2. Communication Ping Check (ping)
        // ============================================================
        try {
            const msg = { action: 'ping' };
            const response = await _mockHandleMessage(msg, controller);

            if (response.success && response.message === 'pong' && response.controller === 'active') {
                logResult('Communication (ping)', 'PASS', response);
            } else {
                logResult('Communication (ping)', 'FAIL', { response, expected: 'pong/active' });
            }
        } catch (e) {
            logResult('Communication (ping)', 'FAIL (Exception)', { error: e.message });
        }
        
        // ============================================================
        // 3. Scanner Lifecycle Check (startScan/stopScan)
        // ============================================================
        if (controller.scanManager) {
            try {
                // Test 3a: Start Scan
                const startMsg = { action: 'startScan' };
                let startResponse = await _mockHandleMessage(startMsg, controller);
                if (startResponse.success) {
                    logResult('Scanner Lifecycle (Start)', 'PASS');
                } else {
                    logResult('Scanner Lifecycle (Start)', 'FAIL', startResponse.error);
                }

                // Test 3b: Stop Scan
                const stopMsg = { action: 'stopScan' };
                let stopResponse = await _mockHandleMessage(stopMsg, controller);
                if (stopResponse.success) {
                    logResult('Scanner Lifecycle (Stop)', 'PASS');
                } else {
                    logResult('Scanner Lifecycle (Stop)', 'FAIL', stopResponse.error);
                }

            } catch (e) {
                logResult('Scanner Lifecycle', 'FAIL (Exception)', { error: e.message });
            }
        } else {
            logResult('Scanner Lifecycle', 'WARN', 'ScanManager not available, skipping tests.');
        }

        // ============================================================
        // 4. Storage Read/Write/Clear Check
        // ============================================================
        const TEST_KEY = 'runner_v2_test_key';
        const TEST_VALUE = 'R8_CORE_STABILITY_CHECK';

        try {
            // Test 4a: Write
            await _mockHandleMessage({ action: 'setSetting', key: TEST_KEY, value: TEST_VALUE }, controller);

            // Test 4b: Read
            const readResponse = await _mockHandleMessage({ action: 'getSetting', key: TEST_KEY }, controller);
            if (readResponse.success && readResponse.data === TEST_VALUE) {
                logResult('Storage R/W (Write/Read)', 'PASS');
            } else {
                logResult('Storage R/W (Write/Read)', 'FAIL', readResponse.data);
            }

            // Test 4c: Clear
            await _mockHandleMessage({ action: 'removeSetting', key: TEST_KEY }, controller);
            const clearResponse = await _mockHandleMessage({ action: 'getSetting', key: TEST_KEY }, controller);
            if (clearResponse.success && clearResponse.data === undefined) {
                logResult('Storage R/W (Clear)', 'PASS');
            } else {
                logResult('Storage R/W (Clear)', 'FAIL', clearResponse.data);
            }

        } catch (e) {
            logResult('Storage R/W', 'FAIL (Exception)', { error: e.message });
        }
        
        // ============================================================
        // 5. Exporter Availability Check
        // ============================================================
        try {
            // NOTE: We only check for availability, not a full export process
            const msg = { action: 'export' };
            const response = await _mockHandleMessage(msg, controller);

            // Expect success, or a controlled failure (e.g. 'No data to export') if Exporter is available.
            // We consider it 'available' if the error is not "Exporter not available"
            if (response.success || (response.error && !response.error.includes('Exporter not available'))) {
                 logResult('Exporter Availability', 'PASS');
            } else {
                 logResult('Exporter Availability', 'FAIL', response.error || 'Exporter module missing or failed to init.');
            }
        } catch (e) {
            logResult('Exporter Availability', 'FAIL (Exception)', { error: e.message });
        }


        // ============================================================
        // 📊 Final Report Generation (HTML)
        // ============================================================
        const finalStatus = globalPass ? '✅ PASS' : '❌ FAIL';
        
        let htmlContent = `
            <html>
            <head>
                <meta charset="UTF-8">
                <title>ChatSavePro Diagnostics Runner V2</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; background-color: #f4f7f9; }
                    .report-container { max-width: 800px; margin: 0 auto; background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    h1 { color: #1e3a8a; border-bottom: 3px solid #bfdbfe; padding-bottom: 10px; }
                    .status-box { padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: center; font-size: 1.5em; font-weight: bold; }
                    .PASS { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
                    .FAIL { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
                    .WARN { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
                    .test-result { margin-bottom: 15px; padding: 10px; border-left: 5px solid; border-radius: 4px; background-color: #f9f9f9; }
                    .test-result.PASS { border-left-color: #10b981; }
                    .test-result.FAIL { border-left-color: #ef4444; }
                    .test-result.WARN { border-left-color: #f59e0b; }
                    .test-name { font-weight: bold; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; }
                    .test-details { font-size: 0.8em; color: #555; white-space: pre-wrap; background-color: #eee; padding: 8px; border-radius: 4px; margin-top: 5px; max-height: 150px; overflow-y: auto; }
                    .tag { padding: 2px 8px; border-radius: 4px; font-size: 0.75em; }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <h1>ChatSavePro R8 Core Diagnostics (Runner V2)</h1>
                    <div class="status-box ${globalPass ? 'PASS' : 'FAIL'}">FINAL STATUS: ${finalStatus}</div>
                    <h2>Individual Test Results</h2>
        `;

        testResults.forEach(res => {
            htmlContent += `
                <div class="test-result ${res.status}">
                    <div class="test-name">
                        <span>${res.name}</span>
                        <span class="tag ${res.status}">${res.status}</span>
                    </div>
                    ${res.status !== 'PASS' ? `<pre class="test-details"><code>${res.details}</code></pre>` : ''}
                </div>
            `;
        });

        htmlContent += `
                </div>
            </body>
            </html>
        `;

        // Output the final HTML content for the user to view in a separate tab
        const htmlOutput = htmlContent;

        console.log('================================================');
        console.log(`Final Status: ${finalStatus}`);
        console.log('================================================');

        return {
            results: testResults,
            finalStatus: globalPass ? 'PASS' : 'FAIL',
            htmlOutput: htmlOutput
        };
    };
}
