/**
 * Application Settings Manager
 */

const Settings = {
  KEY: 'api_lab_settings',

  defaults: {
    theme: 'dark',
    language: 'en',
    timeout: 30000,
    historyLimit: 50,
    defaultAuth: 'auto'
  },

  data: null,

  init() {
    this.load();
    this.apply();
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this.data = raw ? { ...this.defaults, ...JSON.parse(raw) } : { ...this.defaults };
    } catch {
      this.data = { ...this.defaults };
    }
  },

  save() {
    localStorage.setItem(this.KEY, JSON.stringify(this.data));
  },

  get(key) {
    return this.data[key];
  },

  set(key, value) {
    this.data[key] = value;
    this.save();
    this.apply();
  },

  apply() {
    // Theme
    document.documentElement.setAttribute('data-theme', this.data.theme);

    // Language & RTL
    const isFa = this.data.language === 'fa';
    document.body.classList.toggle('rtl', isFa);
    document.documentElement.lang = isFa ? 'fa' : 'en';
    document.documentElement.dir = isFa ? 'rtl' : 'ltr';

    // Update UI language if i18n is ready
    if (window.I18n) {
      I18n.setLanguage(this.data.language);
    }
  },

  toggleTheme() {
    const next = this.data.theme === 'dark' ? 'light' : 'dark';
    this.set('theme', next);
    return next;
  },

  toggleLanguage() {
    const next = this.data.language === 'en' ? 'fa' : 'en';
    this.set('language', next);
    return next;
  },

  clearAllData() {
    localStorage.removeItem(this.KEY);
    localStorage.removeItem('api_lab_history');
    localStorage.removeItem('api_lab_custom_providers');
    this.data = { ...this.defaults };
    this.apply();
  }
};

window.Settings = Settings;
