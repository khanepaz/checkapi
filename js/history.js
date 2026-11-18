/**
 * Request History (credentials are NEVER stored)
 */

const History = {
  KEY: 'api_lab_history',
  items: [],

  init() {
    this.load();
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this.items = raw ? JSON.parse(raw) : [];
    } catch {
      this.items = [];
    }
  },

  save() {
    const limit = Settings.get('historyLimit') || 50;
    if (this.items.length > limit) {
      this.items = this.items.slice(0, limit);
    }
    localStorage.setItem(this.KEY, JSON.stringify(this.items));
  },

  add(entry) {
    const safe = {
      id: Utils.uid(),
      providerId: entry.providerId || null,
      providerName: entry.providerName || 'Custom',
      method: entry.method,
      url: entry.url,
      status: entry.status,
      duration: entry.duration,
      success: entry.success,
      timestamp: entry.timestamp || Date.now(),
      endpoint: entry.endpoint || '',
      bodyPreview: entry.bodyPreview || null
    };
    this.items.unshift(safe);
    this.save();
    return safe;
  },

  getAll() {
    return this.items;
  },

  get(id) {
    return this.items.find(i => i.id === id);
  },

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
  },

  clear() {
    this.items = [];
    this.save();
  },

  stats() {
    const total = this.items.length;
    const success = this.items.filter(i => i.success).length;
    const failed = total - success;
    return { total, success, failed };
  }
};

window.History = History;
