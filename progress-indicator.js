// File: modules/progress-indicator.js
// ============================================================

class ProgressIndicator {
    constructor() {
        this.indicators = new Map();
        this.initStyles();
    }

    initStyles() {
        if (document.getElementById('progress-indicator-styles')) return;

        const styles = `
            .chat-progress-container {
                position: relative;
                width: 100%;
                height: 4px;
                background: #e9ecef;
                border-radius: 2px;
                overflow: hidden;
                margin: 8px 0;
            }

            .chat-progress-bar {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: linear-gradient(90deg, #4a90e2, #357abd);
                border-radius: 2px;
                transition: width 0.3s ease;
                width: 0%;
            }

            .chat-progress-bar.indeterminate {
                background: linear-gradient(90deg, #4a90e2, #357abd, #4a90e2);
                background-size: 200% 100%;
                animation: progressShimmer 1.5s infinite linear;
            }

            .chat-progress-text {
                font-size: 11px;
                color: #6c757d;
                text-align: center;
                margin-top: 4px;
                font-weight: 500;
            }

            .chat-progress-success {
                background: linear-gradient(90deg, #28a745, #20c997) !important;
            }

            .chat-progress-error {
                background: linear-gradient(90deg, #dc3545, #e83e8c) !important;
            }

            .chat-progress-warning {
                background: linear-gradient(90deg, #ffc107, #fd7e14) !important;
            }

            @keyframes progressShimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            .progress-pulse {
                animation: progressPulse 2s infinite;
            }

            @keyframes progressPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'progress-indicator-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    create(container, options = {}) {
        const {
            showText = true,
            height = '4px',
            borderRadius = '2px',
            customClass = ''
        } = options;

        // Remove existing progress if any
        this.destroy(container);

        const progressContainer = document.createElement('div');
        progressContainer.className = `chat-progress-container ${customClass}`;
        progressContainer.style.height = height;
        progressContainer.style.borderRadius = borderRadius;

        const progressBar = document.createElement('div');
        progressBar.className = 'chat-progress-bar';
        progressContainer.appendChild(progressBar);

        let progressText = null;
        if (showText) {
            progressText = document.createElement('div');
            progressText.className = 'chat-progress-text';
            progressText.textContent = '0%';
            progressContainer.appendChild(progressText);
        }

        container.appendChild(progressContainer);

        const indicator = {
            container: progressContainer,
            bar: progressBar,
            text: progressText,
            value: 0
        };

        this.indicators.set(container, indicator);
        return indicator;
    }

    update(container, percentage, text = null) {
        const indicator = this.indicators.get(container);
        if (!indicator) return;

        percentage = Math.max(0, Math.min(100, percentage));
        indicator.value = percentage;

        indicator.bar.style.width = percentage + '%';
        indicator.bar.setAttribute('data-progress', percentage);

        if (indicator.text) {
            indicator.text.textContent = text || `${Math.round(percentage)}%`;
        }

        // Update color based on progress
        this.updateProgressColor(indicator.bar, percentage);

        return indicator;
    }

    updateProgressColor(progressBar, percentage) {
        progressBar.classList.remove('chat-progress-success', 'chat-progress-error', 'chat-progress-warning');

        if (percentage >= 100) {
            progressBar.classList.add('chat-progress-success');
        } else if (percentage >= 75) {
            progressBar.classList.add('chat-progress-warning');
        } else if (percentage >= 50) {
            // Keep default color
        }
    }

    setIndeterminate(container) {
        const indicator = this.indicators.get(container);
        if (!indicator) return;

        indicator.bar.classList.add('indeterminate');
        indicator.bar.style.width = '100%';

        if (indicator.text) {
            indicator.text.textContent = 'Processing...';
        }
    }

    setDeterminate(container) {
        const indicator = this.indicators.get(container);
        if (!indicator) return;

        indicator.bar.classList.remove('indeterminate');
        this.update(container, indicator.value);
    }

    setSuccess(container, message = 'Completed!') {
        const indicator = this.indicators.get(container);
        if (!indicator) return;

        indicator.bar.classList.remove('indeterminate');
        indicator.bar.classList.add('chat-progress-success');
        indicator.bar.style.width = '100%';

        if (indicator.text) {
            indicator.text.textContent = message;
        }

        // Auto-hide after success
        setTimeout(() => {
            this.hide(container);
        }, 2000);
    }

    setError(container, message = 'Failed!') {
        const indicator = this.indicators.get(container);
        if (!indicator) return;

        indicator.bar.classList.remove('indeterminate');
        indicator.bar.classList.add('chat-progress-error');
        indicator.bar.style.width = '100%';

        if (indicator.text) {
            indicator.text.textContent = message;
        }
    }

    pulse(container) {
        const indicator = this.indicators.get(container);
        if (!indicator) return;

        indicator.bar.classList.add('progress-pulse');
        
        setTimeout(() => {
            indicator.bar.classList.remove('progress-pulse');
        }, 2000);
    }

    hide(container) {
        const indicator = this.indicators.get(container);
        if (!indicator) return;

        indicator.container.style.opacity = '0';
        setTimeout(() => {
            if (indicator.container.parentNode) {
                indicator.container.parentNode.removeChild(indicator.container);
            }
            this.indicators.delete(container);
        }, 300);
    }

    destroy(container) {
        const indicator = this.indicators.get(container);
        if (!indicator) return;

        if (indicator.container.parentNode) {
            indicator.container.parentNode.removeChild(indicator.container);
        }
        this.indicators.delete(container);
    }

    // Quick progress creation
    quickProgress(parentSelector, options = {}) {
        const parent = document.querySelector(parentSelector);
        if (!parent) return null;
        
        return this.create(parent, options);
    }

    // Animate progress from one value to another
    animateProgress(container, from, to, duration = 1000) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const indicator = this.indicators.get(container);
            
            if (!indicator) {
                resolve();
                return;
            }

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const currentValue = from + (to - from) * progress;
                this.update(container, currentValue);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            
            requestAnimationFrame(animate);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProgressIndicator;
}