/**
 * Enhanced i18n system for BikeToolz.info multi-tool architecture
 */
class I18n {
    constructor(isFramed = false) {
        this.currentLanguage = 'en';
        this.translations = {};
        this.fallbackLanguage = 'en';
        this.supportedLanguages = ['en', 'de', 'pt', 'es'];
        this.isFramed = isFramed; // Whether this i18n instance is running in a frame
        this.parentI18n = null; // Reference to parent i18n if in frame

        // Initialize
        this.detectLanguage();
        this.loadTranslations();
        this.setupMessageHandling();
    }

    /**
     * Setup message handling for frame communication
     */
    setupMessageHandling() {
        if (this.isFramed) {
            // Listen for messages from parent
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type) {
                    switch (event.data.type) {
                        case 'initialize':
                            this.handleParentInitialize(event.data);
                            break;
                        case 'languageChange':
                            this.changeLanguage(event.data.language);
                            break;
                        case 'themeChange':
                            this.handleThemeChange(event.data.theme);
                            break;
                        case 'unitSystemChange':
                            this.handleUnitSystemChange(event.data.isMetric);
                            break;
                    }
                }
            });

            // Notify parent that we're ready
            this.postMessageToParent({ type: 'toolReady' });
        }
    }

    /**
     * Handle initialization from parent frame
     */
    handleParentInitialize(data) {
        if (data.language && data.language !== this.currentLanguage) {
            this.changeLanguage(data.language);
        }
        if (data.theme) {
            this.handleThemeChange(data.theme);
        }
        if (data.isMetric !== undefined) {
            this.handleUnitSystemChange(data.isMetric);
        }
    }

    /**
     * Handle theme change from parent
     */
    handleThemeChange(theme) {
        const body = document.body;
        if (theme === 'dark') {
            body.setAttribute('data-theme', 'dark');
        } else {
            body.removeAttribute('data-theme');
        }
    }

    /**
     * Handle unit system change from parent
     */
    handleUnitSystemChange(isMetric) {
        // Set global unit system
        window.isMetric = isMetric;

        // Update displays if this is the climb calculator
        if (typeof updateUnitDisplays === 'function') {
            updateUnitDisplays();
        }

        // Update any i18n unit displays
        this.updateUnitDisplays();

        // Trigger recalculation if applicable
        if (typeof debouncedCalculate === 'function') {
            debouncedCalculate();
        }
    }

    /**
     * Send message to parent frame
     */
    postMessageToParent(message) {
        if (this.isFramed && window.parent && window.parent !== window) {
            try {
                window.parent.postMessage(message, '*');
            } catch (error) {
                console.log('Could not send message to parent:', error);
            }
        }
    }

    /**
     * Detect user's preferred language
     */
    detectLanguage() {
        // 1. Check localStorage for saved preference
        const savedLang = localStorage.getItem('bikeToolz_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLanguage = savedLang;
            return;
        }

        // 2. Check browser language
        const browserLang = navigator.language.substring(0, 2);
        if (this.supportedLanguages.includes(browserLang)) {
            this.currentLanguage = browserLang;
            return;
        }

        // 3. Check accept-language header approximation
        const acceptLanguages = navigator.languages || [navigator.language];
        for (const lang of acceptLanguages) {
            const langCode = lang.substring(0, 2);
            if (this.supportedLanguages.includes(langCode)) {
                this.currentLanguage = langCode;
                return;
            }
        }

        // 4. Default to English
        this.currentLanguage = 'en';
    }

    /**
     * Load translation files
     */
    async loadTranslations() {
        try {
            // Determine the correct path based on whether we're in a frame
            const basePath = this.isFramed ? '../lang/' : './lang/';

            // Load current language
            const response = await fetch(`${basePath}${this.currentLanguage}.json`);
            if (response.ok) {
                this.translations[this.currentLanguage] = await response.json();
            } else {
                throw new Error(`Failed to load ${this.currentLanguage}.json`);
            }

            // Load fallback if different from current
            if (this.currentLanguage !== this.fallbackLanguage) {
                const fallbackResponse = await fetch(`${basePath}${this.fallbackLanguage}.json`);
                if (fallbackResponse.ok) {
                    this.translations[this.fallbackLanguage] = await fallbackResponse.json();
                }
            }

            // Apply translations to the page
            this.applyTranslations();

        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to English if current language fails
            if (this.currentLanguage !== 'en') {
                this.currentLanguage = 'en';
                this.loadTranslations();
            }
        }
    }

    /**
     * Get translated text by key path
     */
    t(keyPath, replacements = {}) {
        const keys = keyPath.split('.');
        let value = this.translations[this.currentLanguage];

        // Navigate through the nested object
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                // Fallback to English
                value = this.translations[this.fallbackLanguage];
                for (const fallbackKey of keys) {
                    if (value && typeof value === 'object' && fallbackKey in value) {
                        value = value[fallbackKey];
                    } else {
                        console.warn(`Translation key not found: ${keyPath}`);
                        return keyPath; // Return the key if translation is missing
                    }
                }
                break;
            }
        }

        if (typeof value !== 'string') {
            console.warn(`Translation value is not a string: ${keyPath}`);
            return keyPath;
        }

        // Replace placeholders
        let result = value;
        for (const [placeholder, replacement] of Object.entries(replacements)) {
            result = result.replace(new RegExp(`{${placeholder}}`, 'g'), replacement);
        }

        return result;
    }

    /**
     * Change language
     */
    async changeLanguage(languageCode) {
        if (!this.supportedLanguages.includes(languageCode)) {
            console.error(`Unsupported language: ${languageCode}`);
            return;
        }

        this.currentLanguage = languageCode;
        localStorage.setItem('bikeToolz_language', languageCode);

        // Load new translations if not already loaded
        if (!this.translations[languageCode]) {
            try {
                const basePath = this.isFramed ? '../lang/' : './lang/';
                const response = await fetch(`${basePath}${languageCode}.json`);
                if (response.ok) {
                    this.translations[languageCode] = await response.json();
                }
            } catch (error) {
                console.error(`Error loading ${languageCode} translations:`, error);
                return;
            }
        }

        // Apply new translations
        this.applyTranslations();

        // Recalculate to update dynamic content if applicable
        if (typeof debouncedCalculate === 'function') {
            debouncedCalculate();
        }
    }

    /**
     * Apply translations to DOM elements
     */
    applyTranslations() {
        // Update document title
        const titleKey = this.isFramed ? 'tools.currentTool.title' : 'site.title';
        if (this.hasTranslation(titleKey)) {
            document.title = this.t(titleKey);
        } else if (!this.isFramed) {
            document.title = this.t('site.title');
        }

        // Update elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const replacements = this.getReplacements(element);

            if (element.hasAttribute('data-i18n-html')) {
                element.innerHTML = this.t(key, replacements);
            } else {
                element.textContent = this.t(key, replacements);
            }
        });

        // Update placeholder texts
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Update title attributes (tooltips)
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Update value attributes
        document.querySelectorAll('[data-i18n-value]').forEach(element => {
            const key = element.getAttribute('data-i18n-value');
            element.value = this.t(key);
        });

        // Update wheel size options if applicable
        if (typeof this.updateWheelSizeOptions === 'function') {
            this.updateWheelSizeOptions();
        }

        // Update unit displays based on current unit system
        this.updateUnitDisplays();

        // Update language selector if not in frame
        if (!this.isFramed) {
            this.updateLanguageSelector();
        }
    }

    /**
     * Check if translation exists
     */
    hasTranslation(keyPath) {
        const keys = keyPath.split('.');
        let value = this.translations[this.currentLanguage];

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return false;
            }
        }

        return typeof value === 'string';
    }

    /**
     * Get replacement values for dynamic content
     */
    getReplacements(element) {
        const replacements = {};

        // Check for power value in explanation
        if (element.id === 'explanationPower' || element.closest('.power-explanation')) {
            const powerInput = document.getElementById('power');
            if (powerInput && powerInput.value) {
                replacements.power = powerInput.value;
            }
        }

        return replacements;
    }

    /**
     * Update wheel size options with current language
     */
    updateWheelSizeOptions() {
        const wheelSizeSelect = document.getElementById('wheelSize');
        if (!wheelSizeSelect) return;

        const currentValue = wheelSizeSelect.value;
        const isMetric = window.isMetric !== undefined ? window.isMetric : true;

        wheelSizeSelect.innerHTML = `
            <option value="2.1">${this.t('calculator.wheelSizes.road700c')} (${isMetric ? '2.1m' : '6.9ft'})</option>
            <option value="2.0">${this.t('calculator.wheelSizes.mtb26')} (${isMetric ? '2.0m' : '6.6ft'})</option>
            <option value="2.15">${this.t('calculator.wheelSizes.mtb275')} (${isMetric ? '2.15m' : '7.1ft'})</option>
            <option value="2.3">${this.t('calculator.wheelSizes.mtb29')} (${isMetric ? '2.3m' : '7.5ft'})</option>
            <option value="custom">${this.t('calculator.wheelSizes.custom')}</option>
        `;

        wheelSizeSelect.value = currentValue;
    }

    /**
     * Update unit displays
     */
    updateUnitDisplays() {
        const isMetric = window.isMetric !== undefined ? window.isMetric : true;

        // Update unit system toggle text (only in main frame)
        if (!this.isFramed) {
            const unitSystemText = document.getElementById('unitToggle');
            if (unitSystemText) {
                unitSystemText.querySelector('span').textContent = isMetric ?
                    this.t('navigation.unitsMetric') :
                    this.t('navigation.unitsImperial');
            }
        }

        // Update individual unit displays
        const unitMappings = [
            { id: 'distanceUnit', metric: 'km', imperial: 'mi' },
            { id: 'elevationUnit', metric: 'm', imperial: 'ft' },
            { id: 'riderWeightUnit', metric: 'kg', imperial: 'lbs' },
            { id: 'equipmentWeightUnit', metric: 'kg', imperial: 'lbs' },
            { id: 'circumferenceUnit', metric: 'm', imperial: 'ft' }
        ];

        unitMappings.forEach(mapping => {
            const element = document.getElementById(mapping.id);
            if (element) {
                const unit = isMetric ? mapping.metric : mapping.imperial;
                element.textContent = this.t(`units.${unit}`);
            }
        });
    }

    /**
     * Update language selector
     */
    updateLanguageSelector() {
        const selector = document.getElementById('languageSelector');
        if (selector) {
            selector.value = this.currentLanguage;
        }
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    /**
     * Update page (compatibility method)
     */
    updatePage() {
        this.applyTranslations();
    }
}

// Initialize i18n system
// Check if we're in a frame by comparing window with parent
const isFramed = window !== window.parent;
const i18n = new I18n(isFramed);

// Export for global use
window.i18n = i18n;
