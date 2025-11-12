// ============================================================
// ChatSavePro/modules/debug-mode.js — MV3‑SAFE Drop‑Replace
// Version: R8 Final Stable
// ============================================================

class DebugMode {
    static enable() {
        try {
            self.DEBUG = true;
            console.log('🔧 Debug mode enabled (MV3‑Safe)');

            const originalSend = self.moduleBridge?.sendToModule;
            if (!originalSend) {
                console.warn('⚠️ ModuleBridge not found — sendToModule logging skipped');
                return;
            }

            self.moduleBridge.sendToModule = async function(target, message) {
                console.log(`📤 [DEBUG] Sending → ${target}:`, message);
                const result = await originalSend.call(this, target, message);
                console.log(`📥 [DEBUG] Response ← ${target}:`, result);
                return result;
            };
        } catch (err) {
            console.error('❌ DebugMode.enable() failed:', err);
        }
    }

    static async simulateData() {
        try {
            const testData = [
                {
                    id: 1,
                    title: 'Test Page 1',
                    url: 'https://example.com/page1',
                    timestamp: Date.now() - 1000000,
                    snippet: 'This is a test snippet for debugging purposes'
                },
                {
                    id: 2,
                    title: 'Test Page 2',
                    url: 'https://example.com/page2',
                    timestamp: Date.now() - 500000,
                    snippet: 'Another test snippet for the debug mode'
                }
            ];

            // ✅ ذخیره ایمن برای Worker و Popup هر دو
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                await new Promise((resolve) => {
                    chrome.storage.local.set({ debugTestData: testData }, () => {
                        console.log('🧪 Test data stored in chrome.storage.local:', testData);
                        resolve(true);
                    });
                });
            } else if (typeof localStorage !== 'undefined') {
                localStorage.setItem('debugTestData', JSON.stringify(testData));
                console.log('🧪 Test data stored in localStorage (UI context):', testData);
            } else {
                console.warn('⚠️ No storage backend detected for debug test data');
            }
        } catch (e) {
            console.error('❌ DebugMode.simulateData() failed:', e);
        }
    }
}

// ============================================================
// 🧩 MV3 Safe Global Attach for Worker & UI
// ============================================================
if (typeof self !== 'undefined') self.DebugMode = DebugMode;
else if (typeof globalThis !== 'undefined') globalThis.DebugMode = DebugMode;

console.log('✅ DebugMode (MV3‑Safe R8 Final Stable) loaded');
