// File: theme-manager.js - قرارگیری در پوشه ریشه یا modules/
// ============================================================

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.initialize();
    }

    initialize() {
        // Load saved theme or detect system preference
        this.loadSavedTheme();
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
    }

    loadSavedTheme() {
        try {
            const savedTheme = localStorage.getItem('chatsavepro_theme');
            if (savedTheme) {
                this.currentTheme = savedTheme;
            } else {
                // Detect system preference
                this.currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
        } catch (error) {
            console.warn('Failed to load theme:', error);
            this.currentTheme = 'light';
        }
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        document.body.className = `theme-${theme}`;
        
        // Update CSS variables
        this.updateCSSVariables(theme);
        
        // Save preference
        try {
            localStorage.setItem('chatsavepro_theme', theme);
        } catch (error) {
            console.warn('Failed to save theme:', error);
        }
    }

    updateCSSVariables(theme) {
        const root = document.documentElement;
        
        if (theme === 'dark') {
            root.style.setProperty('--primary-color', '#6b8cff');
            root.style.setProperty('--primary-dark', '#5a7ae6');
            root.style.setProperty('--secondary-color', '#a0aec0');
            root.style.setProperty('--success-color', '#48bb78');
            root.style.setProperty('--danger-color', '#f56565');
            root.style.setProperty('--warning-color', '#ed8936');
            root.style.setProperty('--info-color', '#4299e1');
            root.style.setProperty('--light-color', '#2d3748');
            root.style.setProperty('--dark-color', '#e2e8f0');
            root.style.setProperty('--border-color', '#4a5568');
            root.style.setProperty('--bg-primary', '#1a202c');
            root.style.setProperty('--bg-secondary', '#2d3748');
            root.style.setProperty('--text-primary', '#e2e8f0');
            root.style.setProperty('--text-secondary', '#a0aec0');
            root.style.setProperty('--shadow', '0 2px 10px rgba(0,0,0,0.3)');
        } else {
            root.style.setProperty('--primary-color', '#4a90e2');
            root.style.setProperty('--primary-dark', '#357abd');
            root.style.setProperty('--secondary-color', '#6c757d');
            root.style.setProperty('--success-color', '#28a745');
            root.style.setProperty('--danger-color', '#dc3545');
            root.style.setProperty('--warning-color', '#ffc107');
            root.style.setProperty('--info-color', '#17a2b8');
            root.style.setProperty('--light-color', '#f8f9fa');
            root.style.setProperty('--dark-color', '#343a40');
            root.style.setProperty('--border-color', '#dee2e6');
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f8f9fa');
            root.style.setProperty('--text-primary', '#333333');
            root.style.setProperty('--text-secondary', '#6c757d');
            root.style.setProperty('--shadow', '0 2px 10px rgba(0,0,0,0.1)');
        }
    }

    setupThemeToggle() {
        // Add theme toggle button to popup and dashboard
        this.injectThemeToggle();
    }

    injectThemeToggle() {
        // Inject theme toggle into popup
        const popupHeader = document.querySelector('.header');
        if (popupHeader && !document.getElementById('themeToggle')) {
            const themeToggle = document.createElement('button');
            themeToggle.id = 'themeToggle';
            themeToggle.className = 'theme-toggle';
            themeToggle.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
            themeToggle.title = `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`;
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
            
            popupHeader.appendChild(themeToggle);
        }

        // Inject theme toggle into dashboard
        const dashboardHeader = document.querySelector('.dashboard-header');
        if (dashboardHeader && !document.getElementById('dashboardThemeToggle')) {
            const dashboardToggle = document.createElement('button');
            dashboardToggle.id = 'dashboardThemeToggle';
            dashboardToggle.className = 'theme-toggle';
            dashboardToggle.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
            dashboardToggle.title = `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`;
            dashboardToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
            
            dashboardHeader.appendChild(dashboardToggle);
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        // Update toggle buttons
        const toggles = document.querySelectorAll('.theme-toggle');
        toggles.forEach(toggle => {
            toggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
            toggle.title = `Switch to ${newTheme === 'dark' ? 'light' : 'dark'} mode`;
        });

        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    // Method to check if dark mode is active
    isDarkMode() {
        return this.currentTheme === 'dark';
    }
}

// Global theme manager instance
window.themeManager = new ThemeManager();

// Initialize theme manager when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager.initialize();
    });
} else {
    window.themeManager.initialize();
}