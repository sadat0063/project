// File: audio-feedback.js (Audio/Visual Feedback System)
// Place in: /modules/audio-feedback.js
// ============================================================

class AudioFeedbackManager {
    constructor() {
        this.MODULE_VERSION = "1.0.0";
        this.MODULE_NAME = "AudioFeedbackManager";
        this.audioContext = null;
        this.isAudioEnabled = true;
        this.isHapticEnabled = true;
        this.init();
    }

    async init() {
        try {
            // Initialize Web Audio API
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load user preferences
            const prefs = await this.loadPreferences();
            this.isAudioEnabled = prefs.audioEnabled;
            this.isHapticEnabled = prefs.hapticEnabled;
            
            console.log(`[${this.MODULE_NAME}] Initialized - Audio: ${this.isAudioEnabled}, Haptic: ${this.isHapticEnabled}`);
        } catch (error) {
            console.warn(`[${this.MODULE_NAME}] Audio context not available, falling back to visual feedback only`);
            this.isAudioEnabled = false;
        }
    }

    async loadPreferences() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['audioEnabled', 'hapticEnabled'], (result) => {
                resolve({
                    audioEnabled: result.audioEnabled !== false, // default true
                    hapticEnabled: result.hapticEnabled !== false // default true
                });
            });
        });
    }

    // Sound effects for different actions
    playScanStart() {
        if (!this.isAudioEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
            
            this.vibrate(50); // Short haptic feedback
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }

    playScanComplete() {
        if (!this.isAudioEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
            
            this.vibrate(100); // Success haptic feedback
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }

    playExportSuccess() {
        if (!this.isAudioEnabled || !this.audioContext) return;
        
        try {
            // Pleasant success chime
            const times = [0, 0.1, 0.2, 0.3];
            const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            
            times.forEach((time, index) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequencies[index], this.audioContext.currentTime + time);
                
                gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime + time);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + 0.2);
                
                oscillator.start(this.audioContext.currentTime + time);
                oscillator.stop(this.audioContext.currentTime + time + 0.2);
            });
            
            this.vibrate(150); // Celebration haptic
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }

    playErrorSound() {
        if (!this.isAudioEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Error sound - descending harsh tone
            oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.4);
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.4);
            
            this.vibrate(200); // Error haptic - longer vibration
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }

    playButtonClick() {
        if (!this.isAudioEnabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.05);
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.05);
            
            this.vibrate(30); // Subtle click feedback
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }

    // Haptic feedback (vibration)
    vibrate(duration = 100) {
        if (!this.isHapticEnabled) return;
        
        try {
            if (navigator.vibrate) {
                navigator.vibrate(duration);
            }
        } catch (error) {
            console.warn('Vibration not supported:', error);
        }
    }

    // Visual feedback methods
    showVisualFeedback(element, type = 'success') {
        const originalBackground = element.style.backgroundColor;
        const originalTransform = element.style.transform;
        
        // Visual feedback based on type
        switch (type) {
            case 'success':
                element.style.backgroundColor = 'var(--success-color, #4CAF50)';
                element.style.transform = 'scale(1.05)';
                break;
            case 'error':
                element.style.backgroundColor = 'var(--error-color, #f44336)';
                element.style.transform = 'scale(0.95)';
                break;
            case 'warning':
                element.style.backgroundColor = 'var(--warning-color, #ff9800)';
                element.style.transform = 'scale(1.02)';
                break;
            default:
                element.style.backgroundColor = 'var(--primary-color, #4a90e2)';
                element.style.transform = 'scale(1.03)';
        }
        
        // Reset after animation
        setTimeout(() => {
            element.style.backgroundColor = originalBackground;
            element.style.transform = originalTransform;
        }, 300);
    }

    // Pulse animation for loading states
    startPulseAnimation(element) {
        element.classList.add('pulse-animation');
    }

    stopPulseAnimation(element) {
        element.classList.remove('pulse-animation');
    }

    // Comprehensive feedback method
    provideFeedback(action, element = null) {
        switch (action) {
            case 'scan_start':
                this.playScanStart();
                if (element) this.startPulseAnimation(element);
                break;
                
            case 'scan_complete':
                this.playScanComplete();
                if (element) {
                    this.stopPulseAnimation(element);
                    this.showVisualFeedback(element, 'success');
                }
                break;
                
            case 'export_success':
                this.playExportSuccess();
                if (element) this.showVisualFeedback(element, 'success');
                break;
                
            case 'button_click':
                this.playButtonClick();
                if (element) this.showVisualFeedback(element, 'default');
                break;
                
            case 'error':
                this.playErrorSound();
                if (element) this.showVisualFeedback(element, 'error');
                break;
                
            case 'warning':
                if (element) this.showVisualFeedback(element, 'warning');
                break;
        }
    }

    // Toggle methods
    toggleAudio(enabled) {
        this.isAudioEnabled = enabled;
        chrome.storage.local.set({ audioEnabled: enabled });
    }

    toggleHaptic(enabled) {
        this.isHapticEnabled = enabled;
        chrome.storage.local.set({ hapticEnabled: enabled });
    }

    // Cleanup
    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioFeedbackManager;
}