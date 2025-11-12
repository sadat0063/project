// ============================================================
// ChatSavePro/modules/EventBus.js (MV3‑SAFE Drop‑Replace)
// Version: R8 Final Stable
// ============================================================

class EventBus {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        if (!callback) {
            delete this.listeners[event];
            return;
        }
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, payload = null) {
        const callbacks = this.listeners[event];
        if (!callbacks || callbacks.length === 0) return;
        for (const cb of callbacks) {
            try {
                cb(payload);
            } catch (e) {
                console.error(`[EventBus] handler for ${event} failed:`, e);
            }
        }
    }

    once(event, callback) {
        const wrapper = (data) => {
            this.off(event, wrapper);
            callback(data);
        };
        this.on(event, wrapper);
    }
}

// ✅ MV3-safe global attach
const eventBus = new EventBus();
if (typeof self !== 'undefined') self.eventBus = eventBus;
else if (typeof globalThis !== 'undefined') globalThis.eventBus = eventBus;
