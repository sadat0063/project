// File: modules/modal-stack.js
// ============================================================

class ModalStack {
    constructor() {
        this.stack = [];
        this.backHandlers = new Map();
        this.init();
    }

    init() {
        // Add global back button handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.stack.length > 0) {
                this.pop();
            }
        });

        // Add backdrop click handler
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop') && this.stack.length > 0) {
                this.pop();
            }
        });
    }

    push(modalElement, options = {}) {
        const {
            backdrop = true,
            closeOnEscape = true,
            closeOnBackdrop = true,
            onClose = null,
            onOpen = null
        } = options;

        // Hide previous modal if any
        if (this.stack.length > 0) {
            const previousModal = this.stack[this.stack.length - 1];
            previousModal.element.style.display = 'none';
        }

        // Create backdrop if needed
        let backdropElement;
        if (backdrop) {
            backdropElement = this.createBackdrop();
        }

        // Show new modal
        modalElement.style.display = 'block';
        if (onOpen) onOpen();

        // Add to stack
        const modalData = {
            element: modalElement,
            backdrop: backdropElement,
            options: {
                closeOnEscape,
                closeOnBackdrop,
                onClose
            }
        };

        this.stack.push(modalData);

        // Add to back handlers
        this.setupBackHandler(modalElement);

        return modalData;
    }

    pop() {
        if (this.stack.length === 0) return null;

        const modalData = this.stack.pop();
        
        // Hide current modal
        modalData.element.style.display = 'none';
        
        // Remove backdrop
        if (modalData.backdrop && modalData.backdrop.parentNode) {
            modalData.backdrop.parentNode.removeChild(modalData.backdrop);
        }

        // Call onClose callback
        if (modalData.options.onClose) {
            modalData.options.onClose();
        }

        // Show previous modal if any
        if (this.stack.length > 0) {
            const previousModal = this.stack[this.stack.length - 1];
            previousModal.element.style.display = 'block';
            
            if (previousModal.backdrop) {
                document.body.appendChild(previousModal.backdrop);
            }
        }

        return modalData;
    }

    createBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
        `;
        
        document.body.appendChild(backdrop);
        return backdrop;
    }

    setupBackHandler(modalElement) {
        const backButton = modalElement.querySelector('[data-modal-back]');
        if (backButton) {
            const handler = () => this.pop();
            backButton.addEventListener('click', handler);
            this.backHandlers.set(backButton, handler);
        }
    }

    clear() {
        while (this.stack.length > 0) {
            this.pop();
        }
        
        // Clean up back handlers
        this.backHandlers.forEach((handler, element) => {
            element.removeEventListener('click', handler);
        });
        this.backHandlers.clear();
    }

    getCurrent() {
        return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
    }

    getStackSize() {
        return this.stack.length;
    }

    // Quick modal show method
    quickShow(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with id ${modalId} not found`);
            return null;
        }

        return this.push(modal, options);
    }

    // Check if modal is in stack
    contains(modalElement) {
        return this.stack.some(item => item.element === modalElement);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalStack;
}