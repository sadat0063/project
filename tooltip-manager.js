// File: modules/tooltip-manager.js
// ============================================================

class TooltipManager {
    constructor() {
        this.tooltips = new Map();
        this.defaultDelay = 200;
        this.initStyles();
    }

    initStyles() {
        if (document.getElementById('tooltip-styles')) return;

        const styles = `
            .chat-tooltip {
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 500;
                white-space: nowrap;
                z-index: 10000;
                pointer-events: none;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                max-width: 200px;
                text-align: center;
            }

            .chat-tooltip.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .chat-tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 5px solid transparent;
                border-top-color: rgba(0, 0, 0, 0.9);
            }

            .chat-tooltip.top::after {
                top: auto;
                bottom: 100%;
                border-top-color: transparent;
                border-bottom-color: rgba(0, 0, 0, 0.9);
            }

            .chat-tooltip.left::after {
                left: 10px;
                transform: translateX(0);
            }

            .chat-tooltip.right::after {
                left: auto;
                right: 10px;
                transform: translateX(0);
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'tooltip-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    createTooltip(element, text, options = {}) {
        const {
            position = 'top',
            delay = this.defaultDelay,
            offset = 10,
            customClass = ''
        } = options;

        // Remove existing tooltip if any
        this.removeTooltip(element);

        let timeoutId;
        const tooltip = document.createElement('div');
        tooltip.className = `chat-tooltip ${position} ${customClass}`;
        tooltip.textContent = text;

        const showTooltip = () => {
            document.body.appendChild(tooltip);
            this.positionTooltip(element, tooltip, position, offset);
            
            requestAnimationFrame(() => {
                tooltip.classList.add('visible');
            });
        };

        const hideTooltip = () => {
            if (timeoutId) clearTimeout(timeoutId);
            tooltip.classList.remove('visible');
            
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 200);
        };

        // Event handlers
        element.addEventListener('mouseenter', () => {
            timeoutId = setTimeout(showTooltip, delay);
        });

        element.addEventListener('mouseleave', hideTooltip);
        element.addEventListener('focus', () => {
            timeoutId = setTimeout(showTooltip, delay);
        });

        element.addEventListener('blur', hideTooltip);

        // Store tooltip reference
        this.tooltips.set(element, {
            tooltip,
            hideTooltip,
            timeoutId
        });

        return {
            show: () => {
                if (timeoutId) clearTimeout(timeoutId);
                showTooltip();
            },
            hide: hideTooltip,
            update: (newText) => {
                tooltip.textContent = newText;
                this.positionTooltip(element, tooltip, position, offset);
            },
            destroy: () => this.removeTooltip(element)
        };
    }

    positionTooltip(element, tooltip, position, offset) {
        const elementRect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const scrollX = window.pageXOffset;
        const scrollY = window.pageYOffset;

        let top, left;

        switch (position) {
            case 'top':
                top = elementRect.top + scrollY - tooltipRect.height - offset;
                left = elementRect.left + scrollX + (elementRect.width - tooltipRect.width) / 2;
                break;
            case 'bottom':
                top = elementRect.bottom + scrollY + offset;
                left = elementRect.left + scrollX + (elementRect.width - tooltipRect.width) / 2;
                break;
            case 'left':
                top = elementRect.top + scrollY + (elementRect.height - tooltipRect.height) / 2;
                left = elementRect.left + scrollX - tooltipRect.width - offset;
                break;
            case 'right':
                top = elementRect.top + scrollY + (elementRect.height - tooltipRect.height) / 2;
                left = elementRect.right + scrollX + offset;
                break;
        }

        // Keep tooltip within viewport
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        if (left < 5) left = 5;
        if (left + tooltipRect.width > viewport.width - 5) {
            left = viewport.width - tooltipRect.width - 5;
        }
        if (top < 5) top = 5;
        if (top + tooltipRect.height > viewport.height - 5) {
            top = viewport.height - tooltipRect.height - 5;
        }

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    }

    removeTooltip(element) {
        const existing = this.tooltips.get(element);
        if (existing) {
            if (existing.timeoutId) clearTimeout(existing.timeoutId);
            existing.hideTooltip();
            this.tooltips.delete(element);
        }
    }

    // Quick tooltip method for common use cases
    quickTooltip(selector, text, options = {}) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            this.createTooltip(element, text, options);
        });
    }

    // Initialize tooltips for data attributes
    initDataTooltips() {
        const elements = document.querySelectorAll('[data-tooltip]');
        elements.forEach(element => {
            const text = element.getAttribute('data-tooltip');
            const position = element.getAttribute('data-tooltip-position') || 'top';
            const delay = parseInt(element.getAttribute('data-tooltip-delay')) || this.defaultDelay;
            
            this.createTooltip(element, text, { position, delay });
        });
    }

    // Destroy all tooltips
    destroyAll() {
        this.tooltips.forEach((_, element) => {
            this.removeTooltip(element);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TooltipManager;
}