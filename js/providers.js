/**
 * Provider Management
 */

const Providers = {
  defaults: [],
  custom: [],
  all: [],

  async init() {
    try {
      const res = await fetch('data/providers.json');
      this.defaults = await res.json();
    } catch (e) {
      console.error('Failed to load providers.json', e);
      this.defaults = [];
    }
    this.loadCustom();
    this.merge();
  },

  loadCustom() {
    try {
      const raw = localStorage.getItem('api_lab_custom_providers');
      this.custom = raw ? JSON.parse(raw) : [];
    } catch {
      this.custom = [];
    }
  },

  saveCustom() {
    localStorage.setItem('api_lab_custom_providers', JSON.stringify(this.custom));
  },

  merge() {
    const map = new Map();
    this.defaults.forEach(p => map.set(p.id, { ...p, isDefault: true }));
    this.custom.forEach(p => map.set(p.id, { ...p, isDefault: false }));
    this.all = Array.from(map.values());
  },

  getAll() {
    return this.all;
  },

  getById(id) {
    return this.all.find(p => p.id === id) || null;
  },

  add(provider) {
    provider.id = provider.id || Utils.uid();
    this.custom.push(provider);
    this.saveCustom();
    this.merge();
    return provider;
  },

  update(id, updates) {
    const idx = this.custom.findIndex(p => p.id === id);
    if (idx >= 0) {
      this.custom[idx] = { ...this.custom[idx], ...updates };
      this.saveCustom();
      this.merge();
      return true;
    }
    const def = this.defaults.find(p => p.id === id);
    if (def) {
      const copy = { ...def, ...updates, id, isDefault: false };
      this.custom.push(copy);
      this.saveCustom();
      this.merge();
      return true;
    }
    return false;
  },

  remove(id) {
    const idx = this.custom.findIndex(p => p.id === id);
    if (idx >= 0) {
      this.custom.splice(idx, 1);
      this.saveCustom();
      this.merge();
      return true;
    }
    return false;
  },

  restoreDefaults() {
    this.custom = [];
    this.saveCustom();
    this.merge();
  }
};

window.Providers = Providers;
