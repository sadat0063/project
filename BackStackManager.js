// File: modules/BackStackManager.js  
// Location: modules/BackStackManager.js
// ============================================================

class BackStackManager {
    constructor() {
        this.stack = [];
        this.maxStackSize = 10;
        this.currentState = null;
    }

    pushState(state) {
        if (this.stack.length >= this.maxStackSize) {
            this.stack.shift(); // Remove oldest
        }
        
        this.stack.push({
            ...state,
            timestamp: Date.now()
        });
        
        this.currentState = state;
        this.updateBackButton();
    }

    popState() {
        if (this.stack.length > 1) {
            this.stack.pop(); // Remove current
            this.currentState = this.stack[this.stack.length - 1];
            this.updateBackButton();
            return this.currentState;
        }
        return null;
    }

    updateBackButton() {
        const backBtn = document.getElementById('backButton');
        if (backBtn) {
            const canGoBack = this.stack.length > 1;
            backBtn.style.display = canGoBack ? 'block' : 'none';
            backBtn.style.opacity = canGoBack ? '1' : '0.5';
        }
    }

    handleBackAction() {
        const previousState = this.popState();
        if (previousState) {
            this.restoreState(previousState);
            return true;
        }
        return false;
    }

    restoreState(state) {
        // Restore modal state
        if (state.modal) {
            this.showModal(state.modal);
        }
        
        // Restore description state
        if (state.description) {
            this.showDescription(state.description);
        }
        
        // Restore scan level
        if (state.scanLevel) {
            this.setScanLevel(state.scanLevel);
        }

        // Animation
        this.animateStateRestoration();
    }

    animateStateRestoration() {
        const container = document.querySelector('.container');
        if (container) {
            container.style.transform = 'translateX(-10px)';
            container.style.opacity = '0.9';
            
            setTimeout(() => {
                container.style.transform = 'translateX(0)';
                container.style.opacity = '1';
            }, 150);
        }
    }

    clearStack() {
        this.stack = [];
        this.currentState = null;
        this.updateBackButton();
    }

    getStackInfo() {
        return {
            size: this.stack.length,
            current: this.currentState,
            history: this.stack.map(s => ({
                type: s.modal || s.description,
                timestamp: s.timestamp
            }))
        };
    }
}