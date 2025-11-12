// File: modules/ExportScopeManager.js
// Location: modules/ExportScopeManager.js
// ============================================================

class ExportScopeManager {
    constructor() {
        this.scopeTypes = {
            full: {
                name: 'Full Data',
                description: 'Export all fields and metadata',
                includes: ['content', 'metadata', 'analytics', 'performance'],
                icon: '📊'
            },
            summary: {
                name: 'Summary Data', 
                description: 'Title, URL and snippet only',
                includes: ['title', 'url', 'snippet', 'timestamp'],
                icon: '📋'
            },
            custom: {
                name: 'Custom Selection',
                description: 'Choose specific fields to export',
                includes: [],
                icon: '🎛️'
            }
        };
        this.currentScope = 'full';
        this.customFields = [];
    }

    initialize() {
        this.bindScopeEvents();
        this.renderScopeOptions();
    }

    bindScopeEvents() {
        // Bind scope change events
        document.querySelectorAll('input[name="exportScope"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleScopeChange(e.target.value);
            });
        });

        // Bind custom field selection
        document.getElementById('customFieldsToggle')?.addEventListener('click', () => {
            this.toggleCustomFields();
        });
    }

    handleScopeChange(scope) {
        this.currentScope = scope;
        this.updateScopeUI();
        this.updateExportPreview();
        
        // Animation
        this.animateScopeTransition(scope);
    }

    updateScopeUI() {
        const scopeConfig = this.scopeTypes[this.currentScope];
        
        // Update scope description
        const scopeDesc = document.getElementById('scopeDescription');
        if (scopeDesc) {
            scopeDesc.innerHTML = `
                <h4>${scopeConfig.icon} ${scopeConfig.name}</h4>
                <p>${scopeConfig.description}</p>
                <div class="scope-features">
                    <strong>Includes:</strong>
                    <ul>
                        ${scopeConfig.includes.map(field => `<li>${field}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Show/hide custom fields panel
        const customPanel = document.getElementById('customFieldsPanel');
        if (customPanel) {
            customPanel.style.display = this.currentScope === 'custom' ? 'block' : 'none';
        }
    }

    animateScopeTransition(newScope) {
        const scopeElement = document.querySelector(`input[name="exportScope"][value="${newScope}"]`);
        if (scopeElement) {
            const label = scopeElement.closest('.scope-option');
            if (label) {
                label.style.transform = 'scale(1.05)';
                label.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.3)';
                
                setTimeout(() => {
                    label.style.transform = 'scale(1)';
                    label.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }, 300);
            }
        }
    }

    renderScopeOptions() {
        const scopeContainer = document.getElementById('exportScopeContainer');
        if (!scopeContainer) return;

        scopeContainer.innerHTML = Object.entries(this.scopeTypes).map(([key, config]) => `
            <label class="scope-option enhanced-scope">
                <input type="radio" name="exportScope" value="${key}" ${key === 'full' ? 'checked' : ''}>
                <span class="scope-icon">${config.icon}</span>
                <span class="scope-content">
                    <span class="scope-name">${config.name}</span>
                    <span class="scope-desc">${config.description}</span>
                </span>
            </label>
        `).join('');

        this.bindScopeEvents();
    }

    getExportConfig() {
        const scopeConfig = this.scopeTypes[this.currentScope];
        
        return {
            scope: this.currentScope,
            fields: this.currentScope === 'custom' ? this.customFields : scopeConfig.includes,
            timestamp: Date.now(),
            config: scopeConfig
        };
    }

    validateExportData(data, config) {
        const requiredFields = config.fields;
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        return true;
    }
}