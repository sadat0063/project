// File: filter-manager.js (Advanced Filter Management)
// ============================================================

class FilterManager {
    constructor() {
        this.filters = {
            platform: 'all',
            dateRange: 'all',
            scanLevel: 'all', 
            contentType: 'all',
            customDate: {
                start: null,
                end: null
            }
        };
        this.availablePlatforms = new Set();
        this.availableDates = new Set();
        this.filterCallbacks = [];
    }

    // Initialize filter manager with data
    async initialize(scanData) {
        console.log('🎛️ FilterManager initializing...');
        this.extractAvailableFilters(scanData);
        this.setupFilterListeners();
        this.updateFilterUI();
        console.log('✅ FilterManager initialized');
    }

    // Extract available platforms and dates from scan data
    extractAvailableFilters(scanData) {
        scanData.forEach(scan => {
            // Extract platforms
            if (scan.platform) {
                this.availablePlatforms.add(scan.platform);
            }
            
            // Extract dates
            if (scan.timestamp) {
                const date = new Date(scan.timestamp).toISOString().split('T')[0];
                this.availableDates.add(date);
            }
        });

        console.log('📊 Available filters:', {
            platforms: Array.from(this.availablePlatforms),
            dates: Array.from(this.availableDates).sort().reverse().slice(0, 10)
        });
    }

    // Setup event listeners for filter controls
    setupFilterListeners() {
        // Platform filter
        const platformFilter = document.getElementById('platformFilter');
        if (platformFilter) {
            platformFilter.addEventListener('change', (e) => {
                this.filters.platform = e.target.value;
                this.applyFilters();
            });
        }

        // Date range filter
        const dateRangeFilter = document.getElementById('dateRangeFilter');
        if (dateRangeFilter) {
            dateRangeFilter.addEventListener('change', (e) => {
                this.filters.dateRange = e.target.value;
                if (e.target.value === 'custom') {
                    this.showCustomDatePicker();
                } else {
                    this.applyFilters();
                }
            });
        }

        // Scan level filter
        const scanLevelFilter = document.getElementById('scanLevelFilter');
        if (scanLevelFilter) {
            scanLevelFilter.addEventListener('change', (e) => {
                this.filters.scanLevel = e.target.value;
                this.applyFilters();
            });
        }

        // Content type filter
        const contentTypeFilter = document.getElementById('contentTypeFilter');
        if (contentTypeFilter) {
            contentTypeFilter.addEventListener('change', (e) => {
                this.filters.contentType = e.target.value;
                this.applyFilters();
            });
        }

        // Custom date pickers
        const startDatePicker = document.getElementById('startDatePicker');
        const endDatePicker = document.getElementById('endDatePicker');
        
        if (startDatePicker && endDatePicker) {
            startDatePicker.addEventListener('change', () => this.updateCustomDateFilter());
            endDatePicker.addEventListener('change', () => this.updateCustomDateFilter());
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
    }

    // Update filter UI with available options
    updateFilterUI() {
        this.updatePlatformFilter();
        this.updateDateRangeFilter();
        this.updateScanLevelFilter();
        this.updateContentTypeFilter();
    }

    // Update platform filter dropdown
    updatePlatformFilter() {
        const platformFilter = document.getElementById('platformFilter');
        if (!platformFilter) return;

        // Clear existing options except "All"
        while (platformFilter.children.length > 1) {
            platformFilter.removeChild(platformFilter.lastChild);
        }

        // Add available platforms
        this.availablePlatforms.forEach(platform => {
            const option = document.createElement('option');
            option.value = platform;
            option.textContent = platform;
            platformFilter.appendChild(option);
        });
    }

    // Update date range filter
    updateDateRangeFilter() {
        const dates = Array.from(this.availableDates).sort().reverse();
        if (dates.length === 0) return;

        // Calculate date ranges
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        // You can add more date range logic here
        console.log('📅 Available dates for filtering:', dates.slice(0, 5));
    }

    // Update scan level filter
    updateScanLevelFilter() {
        const scanLevelFilter = document.getElementById('scanLevelFilter');
        if (!scanLevelFilter) return;

        // Ensure all scan levels are available
        const levels = ['light', 'moderate', 'deep'];
        levels.forEach(level => {
            if (!Array.from(scanLevelFilter.options).some(opt => opt.value === level)) {
                const option = document.createElement('option');
                option.value = level;
                option.textContent = this.formatScanLevelName(level);
                scanLevelFilter.appendChild(option);
            }
        });
    }

    // Update content type filter
    updateContentTypeFilter() {
        const contentTypeFilter = document.getElementById('contentTypeFilter');
        if (!contentTypeFilter) return;

        // Content types based on scan analysis
        const contentTypes = [
            'article', 'product', 'documentation', 
            'form', 'chat', 'ecommerce', 'general'
        ];

        contentTypes.forEach(type => {
            if (!Array.from(contentTypeFilter.options).some(opt => opt.value === type)) {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = this.formatContentTypeName(type);
                contentTypeFilter.appendChild(option);
            }
        });
    }

    // Show custom date picker
    showCustomDatePicker() {
        const customDateSection = document.getElementById('customDateSection');
        if (customDateSection) {
            customDateSection.style.display = 'block';
            
            // Set default dates (last 7 days)
            const endDate = new Date();
            const startDate = new Date(Date.now() - 7 * 86400000);
            
            const startDatePicker = document.getElementById('startDatePicker');
            const endDatePicker = document.getElementById('endDatePicker');
            
            if (startDatePicker && endDatePicker) {
                startDatePicker.value = startDate.toISOString().split('T')[0];
                endDatePicker.value = endDate.toISOString().split('T')[0];
                this.updateCustomDateFilter();
            }
        }
    }

    // Update custom date filter
    updateCustomDateFilter() {
        const startDatePicker = document.getElementById('startDatePicker');
        const endDatePicker = document.getElementById('endDatePicker');
        
        if (startDatePicker && endDatePicker && startDatePicker.value && endDatePicker.value) {
            this.filters.customDate.start = startDatePicker.value;
            this.filters.customDate.end = endDatePicker.value;
            this.applyFilters();
        }
    }

    // Apply all active filters
    applyFilters() {
        console.log('🔍 Applying filters:', this.filters);
        
        // Notify all registered callbacks
        this.filterCallbacks.forEach(callback => {
            callback(this.filters);
        });

        this.updateActiveFiltersDisplay();
    }

    // Clear all filters
    clearFilters() {
        this.filters = {
            platform: 'all',
            dateRange: 'all',
            scanLevel: 'all',
            contentType: 'all',
            customDate: {
                start: null,
                end: null
            }
        };

        // Reset UI elements
        this.resetFilterUI();
        this.applyFilters();
        
        console.log('🧹 All filters cleared');
    }

    // Reset filter UI to default state
    resetFilterUI() {
        const elements = [
            'platformFilter', 'dateRangeFilter', 
            'scanLevelFilter', 'contentTypeFilter'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = 'all';
        });

        const customDateSection = document.getElementById('customDateSection');
        if (customDateSection) customDateSection.style.display = 'none';
    }

    // Update active filters display
    updateActiveFiltersDisplay() {
        const activeFiltersElement = document.getElementById('activeFilters');
        if (!activeFiltersElement) return;

        const activeFilters = [];
        
        if (this.filters.platform !== 'all') {
            activeFilters.push(`Platform: ${this.filters.platform}`);
        }
        
        if (this.filters.dateRange !== 'all') {
            activeFilters.push(`Date: ${this.formatDateRange(this.filters.dateRange)}`);
        }
        
        if (this.filters.scanLevel !== 'all') {
            activeFilters.push(`Level: ${this.formatScanLevelName(this.filters.scanLevel)}`);
        }
        
        if (this.filters.contentType !== 'all') {
            activeFilters.push(`Type: ${this.formatContentTypeName(this.filters.contentType)}`);
        }

        if (activeFilters.length > 0) {
            activeFiltersElement.innerHTML = `
                <strong>Active Filters:</strong> ${activeFilters.join(' • ')}
                <button id="clearFiltersBtn" class="clear-filters-btn">✕</button>
            `;
            
            // Re-attach clear button event
            const clearBtn = document.getElementById('clearFiltersBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => this.clearFilters());
            }
        } else {
            activeFiltersElement.innerHTML = '';
        }
    }

    // Register filter change callback
    onFilterChange(callback) {
        this.filterCallbacks.push(callback);
    }

    // Filter scan data based on active filters
    filterScanData(scanData) {
        return scanData.filter(scan => {
            // Platform filter
            if (this.filters.platform !== 'all' && scan.platform !== this.filters.platform) {
                return false;
            }

            // Date range filter
            if (!this.passesDateFilter(scan.timestamp)) {
                return false;
            }

            // Scan level filter
            if (this.filters.scanLevel !== 'all' && scan.scanLevel !== this.filters.scanLevel) {
                return false;
            }

            // Content type filter
            if (this.filters.contentType !== 'all' && 
                scan.analysis?.contentType !== this.filters.contentType) {
                return false;
            }

            return true;
        });
    }

    // Check if scan passes date filter
    passesDateFilter(timestamp) {
        if (this.filters.dateRange === 'all') return true;
        if (!timestamp) return false;

        const scanDate = new Date(timestamp);
        const today = new Date();

        switch (this.filters.dateRange) {
            case 'today':
                return scanDate.toDateString() === today.toDateString();
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return scanDate.toDateString() === yesterday.toDateString();
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return scanDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return scanDate >= monthAgo;
            case 'custom':
                if (this.filters.customDate.start && this.filters.customDate.end) {
                    const startDate = new Date(this.filters.customDate.start);
                    const endDate = new Date(this.filters.customDate.end);
                    endDate.setHours(23, 59, 59, 999); // End of day
                    return scanDate >= startDate && scanDate <= endDate;
                }
                return true;
            default:
                return true;
        }
    }

    // Format scan level name for display
    formatScanLevelName(level) {
        const names = {
            light: 'Light',
            moderate: 'Standard',
            deep: 'Advanced'
        };
        return names[level] || level;
    }

    // Format content type name for display
    formatContentTypeName(type) {
        const names = {
            article: 'Article',
            product: 'Product',
            documentation: 'Documentation',
            form: 'Form',
            chat: 'Chat',
            ecommerce: 'E-commerce',
            general: 'General'
        };
        return names[type] || type;
    }

    // Format date range for display
    formatDateRange(range) {
        const names = {
            today: 'Today',
            yesterday: 'Yesterday',
            week: 'Last 7 Days',
            month: 'Last 30 Days',
            custom: 'Custom Range'
        };
        return names[range] || range;
    }

    // Get current filter state
    getFilterState() {
        return { ...this.filters };
    }

    // Get filter statistics
    getFilterStats(originalData, filteredData) {
        return {
            total: originalData.length,
            filtered: filteredData.length,
            percentage: originalData.length > 0 ? 
                Math.round((filteredData.length / originalData.length) * 100) : 0,
            activeFilters: Object.values(this.filters).filter(val => 
                val !== 'all' && !(typeof val === 'object' && Object.values(val).every(v => !v))
            ).length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterManager;
}