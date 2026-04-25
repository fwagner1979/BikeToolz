/**
 * i18n system for BikeToolz.info
 *
 * Loads translations from `lang/<lang>.json` siblings of this script's
 * directory. Each page can use the same i18n.js — the lang/ path is
 * derived from this script's own URL, so it works from index.html (root)
 * or from any tool page (subdirectory) without per-page configuration.
 */

// Capture the script URL at load time (document.currentScript is only
// defined during initial top-level execution).
const I18N_LANG_BASE = (function () {
    const src = (document.currentScript && document.currentScript.src) || '';
    return src.replace(/js\/i18n\.js(\?.*)?$/, 'lang/');
})();

class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.fallbackLanguage = 'en';
        this.supportedLanguages = ['en', 'de', 'pt', 'es'];

        this.detectLanguage();
        this.loadTranslations();
    }

    detectLanguage() {
        // 1. Saved preference
        const savedLang = localStorage.getItem('bikeToolz_language');
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            this.currentLanguage = savedLang;
            return;
        }

        // 2. Browser primary language
        const browserLang = navigator.language.substring(0, 2);
        if (this.supportedLanguages.includes(browserLang)) {
            this.currentLanguage = browserLang;
            return;
        }

        // 3. Browser accept-language list
        const acceptLanguages = navigator.languages || [navigator.language];
        for (const lang of acceptLanguages) {
            const langCode = lang.substring(0, 2);
            if (this.supportedLanguages.includes(langCode)) {
                this.currentLanguage = langCode;
                return;
            }
        }

        // 4. Default
        this.currentLanguage = 'en';
    }

    async loadTranslations() {
        try {
            const response = await fetch(`${I18N_LANG_BASE}${this.currentLanguage}.json`);
            if (response.ok) {
                this.translations[this.currentLanguage] = await response.json();
            } else {
                throw new Error(`Failed to load ${this.currentLanguage}.json`);
            }

            if (this.currentLanguage !== this.fallbackLanguage) {
                const fallbackResponse = await fetch(`${I18N_LANG_BASE}${this.fallbackLanguage}.json`);
                if (fallbackResponse.ok) {
                    this.translations[this.fallbackLanguage] = await fallbackResponse.json();
                }
            }

            this.applyTranslations();
        } catch (error) {
            console.error('Error loading translations:', error);
            if (this.currentLanguage !== 'en') {
                this.currentLanguage = 'en';
                this.loadTranslations();
            }
        }
    }

    t(keyPath, replacements = {}) {
        const keys = keyPath.split('.');
        let value = this.translations[this.currentLanguage];

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                value = this.translations[this.fallbackLanguage];
                for (const fallbackKey of keys) {
                    if (value && typeof value === 'object' && fallbackKey in value) {
                        value = value[fallbackKey];
                    } else {
                        console.warn(`Translation key not found: ${keyPath}`);
                        return keyPath;
                    }
                }
                break;
            }
        }

        if (typeof value !== 'string') {
            console.warn(`Translation value is not a string: ${keyPath}`);
            return keyPath;
        }

        let result = value;
        for (const [placeholder, replacement] of Object.entries(replacements)) {
            result = result.replace(new RegExp(`{${placeholder}}`, 'g'), replacement);
        }
        return result;
    }

    async changeLanguage(languageCode) {
        if (!this.supportedLanguages.includes(languageCode)) {
            console.error(`Unsupported language: ${languageCode}`);
            return;
        }

        this.currentLanguage = languageCode;
        localStorage.setItem('bikeToolz_language', languageCode);

        if (!this.translations[languageCode]) {
            try {
                const response = await fetch(`${I18N_LANG_BASE}${languageCode}.json`);
                if (response.ok) {
                    this.translations[languageCode] = await response.json();
                }
            } catch (error) {
                console.error(`Error loading ${languageCode} translations:`, error);
                return;
            }
        }

        this.applyTranslations();

        if (typeof debouncedCalculate === 'function') {
            debouncedCalculate();
        }
    }

    applyTranslations() {
        // Note: <title> elements with data-i18n attributes are handled by the
        // generic [data-i18n] loop below — setting textContent on a <title>
        // updates the page title. Pages without data-i18n on <title> keep their
        // hardcoded title untouched.

        // Helper: only overwrite an element's text/attribute when the key is
        // actually translated. Falls back to the markup's own inline text
        // when neither the current language nor English has the key — keeps
        // Phase-3-era English-only strings (e.g. climb-planner.html new keys)
        // showing the inline English instead of the raw key path in DE/ES/PT.
        const hasAny = (key) =>
            this.hasTranslation(key, this.currentLanguage) ||
            this.hasTranslation(key, this.fallbackLanguage);

        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (!hasAny(key)) return;
            const replacements = this.getReplacements(element);
            if (element.hasAttribute('data-i18n-html')) {
                element.innerHTML = this.t(key, replacements);
            } else {
                element.textContent = this.t(key, replacements);
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (!hasAny(key)) return;
            element.placeholder = this.t(key);
        });

        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (!hasAny(key)) return;
            element.title = this.t(key);
        });

        document.querySelectorAll('[data-i18n-value]').forEach(element => {
            const key = element.getAttribute('data-i18n-value');
            if (!hasAny(key)) return;
            element.value = this.t(key);
        });

        if (typeof this.updateWheelSizeOptions === 'function') {
            this.updateWheelSizeOptions();
        }

        this.updateUnitDisplays();
        this.updateLanguageSelector();

        // Reflect language on the <html lang="..."> attribute for accessibility / SEO
        document.documentElement.lang = this.currentLanguage;
    }

    hasTranslation(keyPath, language) {
        const lang = language || this.currentLanguage;
        const keys = keyPath.split('.');
        let value = this.translations[lang];
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return false;
            }
        }
        return typeof value === 'string';
    }

    getReplacements(element) {
        const replacements = {};
        if (element.id === 'explanationPower' || element.closest('.power-explanation')) {
            const powerInput = document.getElementById('power');
            if (powerInput && powerInput.value) {
                replacements.power = powerInput.value;
            }
        }
        return replacements;
    }

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

    updateUnitDisplays() {
        const isMetric = window.isMetric !== undefined ? window.isMetric : true;

        const unitToggle = document.getElementById('unitToggle');
        if (unitToggle) {
            const span = unitToggle.querySelector('span');
            if (span) {
                span.textContent = isMetric ? this.t('navigation.unitsMetric') : this.t('navigation.unitsImperial');
            }
        }

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

    updateLanguageSelector() {
        const selector = document.getElementById('languageSelector');
        if (selector) {
            selector.value = this.currentLanguage;
        }
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }

    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    updatePage() {
        this.applyTranslations();
    }
}

const i18n = new I18n();
window.i18n = i18n;
