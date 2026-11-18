/**
 * API LAB - Main Application
 */

const App = {
  state: {
    currentProviderId: 'openai',
    method: 'POST',
    urlMode: 'provider',
    endpoint: '',
    customUrl: '',
    queryParams: [],
    headers: [],
    authType: 'auto',
    authFields: {},
    body: '',
    isSending: false
  },

  i18n: {
    en: {
      dashboard: 'Dashboard', request: 'Request', history: 'History', providers: 'Providers', settings: 'Settings',
      send: 'Send', cancel: 'Cancel', total_requests: 'Total Requests', successful: 'Successful', failed: 'Failed',
      recent_tests: 'Recent Tests', available_providers: 'Available Providers', method: 'Method', url: 'URL',
      provider: 'Provider', endpoint: 'Endpoint', auth: 'Authentication', headers: 'Headers', body: 'Body',
      query: 'Query Params', pretty: 'Pretty', raw: 'Raw', preview: 'Preview', analysis: 'Analysis',
      add_header: 'Add Header', add_param: 'Add Parameter', clear_history: 'Clear History', export: 'Export',
      import: 'Import', theme: 'Theme', language: 'Language', timeout: 'Timeout (ms)', clear_data: 'Clear All Data',
      security_note: 'Credentials are never stored in history. Browser requests may be blocked by CORS.',
      send_to_see: 'Send a request to see the response', no_history: 'No requests yet', loading: 'Sending request…'
    },
    fa: {
      dashboard: 'داشبورد', request: 'درخواست', history: 'تاریخچه', providers: 'ارائه‌دهندگان', settings: 'تنظیمات',
      send: 'ارسال', cancel: 'لغو', total_requests: 'کل درخواست‌ها', successful: 'موفق', failed: 'ناموفق',
      recent_tests: 'تست‌های اخیر', available_providers: 'ارائه‌دهندگان موجود', method: 'متد', url: 'آدرس',
      provider: 'ارائه‌دهنده', endpoint: 'اندپوینت', auth: 'احراز هویت', headers: 'هدرها', body: 'بدنه',
      query: 'پارامترهای کوئری', pretty: 'زیبا', raw: 'خام', preview: 'پیش‌نمایش', analysis: 'تحلیل',
      add_header: 'افزودن هدر', add_param: 'افزودن پارامتر', clear_history: 'پاک کردن تاریخچه', export: 'خروجی',
      import: 'ورودی', theme: 'تم', language: 'زبان', timeout: 'تایم‌اوت (میلی‌ثانیه)', clear_data: 'پاک کردن همه داده‌ها',
      security_note: 'کلیدها در تاریخچه ذخیره نمی‌شوند. درخواست‌های مرورگر ممکن است توسط CORS مسدود شوند.',
      send_to_see: 'یک درخواست ارسال کنید تا پاسخ را ببینید', no_history: 'هنوز درخواستی ثبت نشده', loading: 'در حال ارسال درخواست…'
    }
  },

  t(key) {
    const lang = Settings.get('language') || 'en';
    return (this.i18n[lang] && this.i18n[lang][key]) || this.i18n.en[key] || key;
  },

  async init() {
    Settings.init();
    History.init();
    await Providers.init();
    this.bindEvents();
    this.renderProviderSelect();
    this.loadProvider(this.state.currentProviderId);
    this.renderDashboard();
    this.renderHistory();
    this.renderProvidersPanel();
    this.applyI18n();
    ResponseViewer.showEmpty();
    this.applyTemplate();
  },

  bindEvents() {
    document.querySelectorAll('.nav-item[data-panel]').forEach(btn => {
      btn.addEventListener('click', () => this.showPanel(btn.dataset.panel));
    });

    document.getElementById('btn-theme')?.addEventListener('click', () => {
      Settings.toggleTheme();
      this.applyI18n();
    });
    document.getElementById('btn-lang')?.addEventListener('click', () => {
      Settings.toggleLanguage();
      this.applyI18n();
      this.renderDashboard();
      this.renderHistory();
      this.renderProvidersPanel();
    });

    document.getElementById('btn-menu')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
    });

    document.querySelectorAll('.method-seg button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.method-seg button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.method = btn.dataset.method;
        this.updateBodyEnabled();
        this.updateFinalUrl();
      });
    });

    document.getElementById('provider-select')?.addEventListener('change', (e) => {
      this.loadProvider(e.target.value);
    });

    document.querySelectorAll('.url-mode-seg button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.url-mode-seg button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.urlMode = btn.dataset.mode;
        this.updateUrlModeUI();
        this.updateFinalUrl();
      });
    });

    document.getElementById('endpoint-input')?.addEventListener('input', (e) => {
      this.state.endpoint = e.target.value;
      this.updateFinalUrl();
    });
    document.getElementById('custom-url-input')?.addEventListener('input', (e) => {
      this.state.customUrl = e.target.value;
      this.updateFinalUrl();
    });

    document.getElementById('auth-type')?.addEventListener('change', (e) => {
      this.state.authType = e.target.value;
      this.renderAuthFields();
    });

    document.getElementById('body-editor')?.addEventListener('input', (e) => {
      this.state.body = e.target.value;
    });

    document.getElementById('btn-format-json')?.addEventListener('click', () => {
      const el = document.getElementById('body-editor');
      if (!el) return;
      const parsed = Utils.tryParseJSON(el.value);
      if (parsed.ok) {
        el.value = JSON.stringify(parsed.data, null, 2);
        this.state.body = el.value;
        this.toast('JSON formatted', 'success');
      } else {
        this.toast('Invalid JSON: ' + parsed.error, 'error');
      }
    });

    document.getElementById('btn-clear-body')?.addEventListener('click', () => {
      document.getElementById('body-editor').value = '';
      this.state.body = '';
    });

    document.getElementById('btn-send')?.addEventListener('click', () => this.sendRequest());
    document.getElementById('btn-cancel')?.addEventListener('click', () => {
      RequestEngine.cancel();
      this.setSending(false);
    });

    document.querySelectorAll('.config-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.config-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.config-side .tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab)?.classList.add('active');
      });
    });

    document.querySelectorAll('.response-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.response-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.response-side .tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab)?.classList.add('active');
      });
    });

    document.getElementById('btn-add-header')?.addEventListener('click', () => this.addHeaderRow());
    document.getElementById('btn-add-param')?.addEventListener('click', () => this.addParamRow());

    document.getElementById('btn-clear-history')?.addEventListener('click', () => {
      if (confirm('Clear all history?')) {
        History.clear();
        this.renderHistory();
        this.renderDashboard();
        this.toast('History cleared', 'info');
      }
    });

    document.getElementById('setting-timeout')?.addEventListener('change', (e) => {
      Settings.set('timeout', parseInt(e.target.value, 10) || 30000);
    });
    document.getElementById('btn-clear-data')?.addEventListener('click', () => {
      if (confirm('This will clear all local data (settings, history, custom providers). Continue?')) {
        Settings.clearAllData();
        History.clear();
        Providers.restoreDefaults();
        location.reload();
      }
    });

    document.getElementById('btn-export')?.addEventListener('click', () => this.exportConfig());
    document.getElementById('btn-import')?.addEventListener('click', () => {
      document.getElementById('import-file')?.click();
    });
    document.getElementById('import-file')?.addEventListener('change', (e) => this.importConfig(e));
  },

  showPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('panel-' + name)?.classList.add('active');
    document.querySelector(`.nav-item[data-panel="${name}"]`)?.classList.add('active');
    document.querySelector('.sidebar')?.classList.remove('open');
    if (name === 'dashboard') this.renderDashboard();
    if (name === 'history') this.renderHistory();
    if (name === 'providers') this.renderProvidersPanel();
  },

  renderProviderSelect() {
    const sel = document.getElementById('provider-select');
    if (!sel) return;
    sel.innerHTML = Providers.getAll().map(p =>
      `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`
    ).join('');
    sel.value = this.state.currentProviderId;
  },

  loadProvider(id) {
    const p = Providers.getById(id);
    if (!p) return;
    this.state.currentProviderId = id;
    this.state.endpoint = p.defaultEndpoint || '';
    this.state.authType = Auth.suggest(p);
    this.state.headers = Object.entries(p.defaultHeaders || {}).map(([k, v]) => ({
      enabled: true, key: k, value: v
    }));
    this.state.queryParams = [];
    const ep = document.getElementById('endpoint-input');
    if (ep) ep.value = this.state.endpoint;
    const authSel = document.getElementById('auth-type');
    if (authSel) authSel.value = this.state.authType;
    this.renderHeaders();
    this.renderParams();
    this.renderAuthFields();
    this.updateFinalUrl();
    this.applyTemplate();
    this.updateBodyEnabled();
  },

  applyTemplate() {
    const p = Providers.getById(this.state.currentProviderId);
    if (!p || !p.templates) return;
    const keys = Object.keys(p.templates);
    if (!keys.length) return;
    const tpl = p.templates[keys[0]];
    const el = document.getElementById('body-editor');
    if (el && this.state.method === 'POST') {
      el.value = JSON.stringify(tpl, null, 2);
      this.state.body = el.value;
    }
  },

  updateUrlModeUI() {
    const providerMode = this.state.urlMode === 'provider';
    document.getElementById('provider-url-group')?.classList.toggle('hidden', !providerMode);
    document.getElementById('custom-url-group')?.classList.toggle('hidden', providerMode);
  },

  updateFinalUrl() {
    const el = document.getElementById('final-url');
    if (!el) return;
    let url = '';
    if (this.state.urlMode === 'custom') {
      url = this.state.customUrl || '';
    } else {
      const p = Providers.getById(this.state.currentProviderId);
      const base = (p?.baseUrl || '').replace(/\/$/, '');
      let ep = this.state.endpoint || '';
      if (ep && !ep.startsWith('/')) ep = '/' + ep;
      url = base + ep;
    }
    const q = Utils.buildQuery(this.state.queryParams);
    el.textContent = url + q;
    el.title = url + q;
  },

  updateBodyEnabled() {
    const isPost = this.state.method === 'POST';
    const editor = document.getElementById('body-editor');
    const actions = document.getElementById('body-actions');
    if (editor) {
      editor.disabled = !isPost;
      editor.placeholder = isPost ? '{\n  "key": "value"\n}' : 'Body disabled for GET';
    }
    if (actions) actions.style.opacity = isPost ? '1' : '0.4';
  },

  renderAuthFields() {
    const container = document.getElementById('auth-fields');
    if (!container) return;
    const type = this.state.authType;
    const p = Providers.getById(this.state.currentProviderId);
    let html = '';

    if (type === 'auto') {
      const suggested = Auth.suggest(p);
      html = `<p class="text-sm text-muted">Suggested: <strong>${suggested}</strong> (based on provider preset). Select a specific method to configure credentials.</p>`;
    } else if (type === 'bearer') {
      html = `
        <div class="form-group">
          <label>Token</label>
          <div class="masked-input-wrapper">
            <input type="password" class="form-control" id="auth-token" placeholder="sk-..." autocomplete="off">
            <button type="button" class="toggle-mask" data-target="auth-token">👁</button>
          </div>
        </div>`;
    } else if (type === 'apiKeyHeader') {
      html = `
        <div class="form-group">
          <label>Header Name</label>
          <input type="text" class="form-control" id="auth-header-name" value="X-API-Key" placeholder="X-API-Key">
        </div>
        <div class="form-group">
          <label>API Key</label>
          <div class="masked-input-wrapper">
            <input type="password" class="form-control" id="auth-api-key" placeholder="Your API key" autocomplete="off">
            <button type="button" class="toggle-mask" data-target="auth-api-key">👁</button>
          </div>
        </div>`;
    } else if (type === 'apiKeyQuery') {
      const param = p?.auth?.paramName || 'key';
      html = `
        <div class="form-group">
          <label>Query Parameter Name</label>
          <input type="text" class="form-control" id="auth-param-name" value="${Utils.escapeHtml(param)}">
        </div>
        <div class="form-group">
          <label>API Key</label>
          <div class="masked-input-wrapper">
            <input type="password" class="form-control" id="auth-api-key" placeholder="Your API key" autocomplete="off">
            <button type="button" class="toggle-mask" data-target="auth-api-key">👁</button>
          </div>
        </div>`;
    } else if (type === 'basic') {
      html = `
        <div class="form-group">
          <label>Username</label>
          <input type="text" class="form-control" id="auth-username" autocomplete="off">
        </div>
        <div class="form-group">
          <label>Password</label>
          <div class="masked-input-wrapper">
            <input type="password" class="form-control" id="auth-password" autocomplete="off">
            <button type="button" class="toggle-mask" data-target="auth-password">👁</button>
          </div>
        </div>`;
    } else if (type === 'custom') {
      html = `
        <div class="form-group">
          <label>Header Name</label>
          <input type="text" class="form-control" id="auth-header-name" placeholder="X-Custom-Auth">
        </div>
        <div class="form-group">
          <label>Header Value</label>
          <div class="masked-input-wrapper">
            <input type="password" class="form-control" id="auth-header-value" autocomplete="off">
            <button type="button" class="toggle-mask" data-target="auth-header-value">👁</button>
          </div>
        </div>`;
    } else {
      html = `<p class="text-sm text-muted">No authentication will be sent.</p>`;
    }

    container.innerHTML = html;
    container.querySelectorAll('.toggle-mask').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (input) input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
  },

  collectAuthFields() {
    const f = {};
    const get = id => document.getElementById(id)?.value || '';
    f.token = get('auth-token');
    f.apiKey = get('auth-api-key');
    f.headerName = get('auth-header-name');
    f.paramName = get('auth-param-name');
    f.username = get('auth-username');
    f.password = get('auth-password');
    f.headerValue = get('auth-header-value');
    return f;
  },

  renderHeaders() {
    const tbody = document.querySelector('#headers-table tbody');
    if (!tbody) return;
    tbody.innerHTML = this.state.headers.map((h, i) => `
      <tr>
        <td class="enabled-cell"><input type="checkbox" ${h.enabled ? 'checked' : ''} data-idx="${i}" class="hdr-enabled"></td>
        <td><input type="text" value="${Utils.escapeHtml(h.key)}" data-idx="${i}" class="hdr-key" placeholder="Header"></td>
        <td><input type="text" value="${Utils.escapeHtml(h.value)}" data-idx="${i}" class="hdr-value" placeholder="Value"></td>
        <td class="action-cell"><button class="btn btn-sm btn-ghost hdr-del" data-idx="${i}">✕</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.hdr-enabled').forEach(el => {
      el.addEventListener('change', e => { this.state.headers[e.target.dataset.idx].enabled = e.target.checked; });
    });
    tbody.querySelectorAll('.hdr-key').forEach(el => {
      el.addEventListener('input', e => { this.state.headers[e.target.dataset.idx].key = e.target.value; });
    });
    tbody.querySelectorAll('.hdr-value').forEach(el => {
      el.addEventListener('input', e => { this.state.headers[e.target.dataset.idx].value = e.target.value; });
    });
    tbody.querySelectorAll('.hdr-del').forEach(el => {
      el.addEventListener('click', e => {
        this.state.headers.splice(+e.target.dataset.idx, 1);
        this.renderHeaders();
      });
    });
  },

  addHeaderRow() {
    this.state.headers.push({ enabled: true, key: '', value: '' });
    this.renderHeaders();
  },

  renderParams() {
    const tbody = document.querySelector('#params-table tbody');
    if (!tbody) return;
    tbody.innerHTML = this.state.queryParams.map((p, i) => `
      <tr>
        <td class="enabled-cell"><input type="checkbox" ${p.enabled !== false ? 'checked' : ''} data-idx="${i}" class="prm-enabled"></td>
        <td><input type="text" value="${Utils.escapeHtml(p.key)}" data-idx="${i}" class="prm-key" placeholder="Key"></td>
        <td><input type="text" value="${Utils.escapeHtml(p.value)}" data-idx="${i}" class="prm-value" placeholder="Value"></td>
        <td class="action-cell"><button class="btn btn-sm btn-ghost prm-del" data-idx="${i}">✕</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.prm-enabled').forEach(el => {
      el.addEventListener('change', e => {
        this.state.queryParams[e.target.dataset.idx].enabled = e.target.checked;
        this.updateFinalUrl();
      });
    });
    tbody.querySelectorAll('.prm-key, .prm-value').forEach(el => {
      el.addEventListener('input', e => {
        const idx = e.target.dataset.idx;
        if (e.target.classList.contains('prm-key')) this.state.queryParams[idx].key = e.target.value;
        else this.state.queryParams[idx].value = e.target.value;
        this.updateFinalUrl();
      });
    });
    tbody.querySelectorAll('.prm-del').forEach(el => {
      el.addEventListener('click', e => {
        this.state.queryParams.splice(+e.target.dataset.idx, 1);
        this.renderParams();
        this.updateFinalUrl();
      });
    });
  },

  addParamRow() {
    this.state.queryParams.push({ enabled: true, key: '', value: '' });
    this.renderParams();
  },

  async sendRequest() {
    if (this.state.isSending) return;

    let baseUrl = '';
    if (this.state.urlMode === 'custom') {
      baseUrl = this.state.customUrl.trim();
    } else {
      const p = Providers.getById(this.state.currentProviderId);
      const base = (p?.baseUrl || '').replace(/\/$/, '');
      let ep = this.state.endpoint || '';
      if (ep && !ep.startsWith('/')) ep = '/' + ep;
      baseUrl = base + ep;
    }

    if (!baseUrl) {
      this.toast('Please enter a valid URL', 'error');
      return;
    }

    let authType = this.state.authType;
    if (authType === 'auto') {
      authType = Auth.suggest(Providers.getById(this.state.currentProviderId));
    }
    const authFields = this.collectAuthFields();
    const provider = Providers.getById(this.state.currentProviderId);
    const authResult = Auth.build(authType, authFields, provider);

    const headers = { ...authResult.headers };
    this.state.headers.forEach(h => {
      if (h.enabled && h.key) headers[h.key] = h.value;
    });

    const allParams = [...this.state.queryParams, ...authResult.queryParams];
    const query = Utils.buildQuery(allParams);
    const finalUrl = baseUrl + query;
    const body = this.state.method === 'POST' ? this.state.body : '';

    this.setSending(true);

    const config = {
      method: this.state.method,
      url: finalUrl,
      headers,
      body
    };

    const result = await RequestEngine.send(config);
    this.setSending(false);

    ResponseViewer.render(result);

    const safeUrl = this._stripSecretsFromUrl(baseUrl, allParams);
    History.add({
      providerId: this.state.currentProviderId,
      providerName: provider?.name || 'Custom',
      method: this.state.method,
      url: safeUrl,
      status: result.status,
      duration: result.duration,
      success: result.success,
      endpoint: this.state.endpoint
    });

    this.renderDashboard();
    this.renderHistory();

    if (result.error) {
      this.toast(result.error.message || 'Request failed', 'error');
    } else {
      this.toast(`Response ${result.status}`, result.success ? 'success' : 'info');
    }
  },

  _stripSecretsFromUrl(url, params) {
    try {
      const u = new URL(url, 'https://placeholder.local');
      const secretKeys = ['key', 'api_key', 'apikey', 'token', 'access_token', 'secret'];
      secretKeys.forEach(k => u.searchParams.delete(k));
      params.forEach(p => {
        if (p.key && secretKeys.includes(p.key.toLowerCase())) {
          u.searchParams.delete(p.key);
        }
      });
      return u.origin === 'https://placeholder.local' ? u.pathname + u.search : u.toString();
    } catch {
      return url;
    }
  },

  setSending(on) {
    this.state.isSending = on;
    const btn = document.getElementById('btn-send');
    const cancel = document.getElementById('btn-cancel');
    const overlay = document.getElementById('loading-overlay');
    if (btn) btn.disabled = on;
    if (cancel) cancel.classList.toggle('hidden', !on);
    if (overlay) overlay.classList.toggle('hidden', !on);
  },

  renderDashboard() {
    const stats = History.stats();
    const elTotal = document.getElementById('stat-total');
    const elOk = document.getElementById('stat-success');
    const elFail = document.getElementById('stat-failed');
    if (elTotal) elTotal.textContent = stats.total;
    if (elOk) elOk.textContent = stats.success;
    if (elFail) elFail.textContent = stats.failed;

    const list = document.getElementById('recent-list');
    if (!list) return;
    const recent = History.getAll().slice(0, 8);
    if (!recent.length) {
      list.innerHTML = `<div class="empty-state"><p>${this.t('no_history')}</p></div>`;
      return;
    }
    list.innerHTML = recent.map(h => `
      <div class="history-item" data-id="${h.id}">
        <span class="method">${h.method}</span>
        <span class="url">${Utils.escapeHtml(h.url)}</span>
        <span class="status status-badge ${Utils.statusCategory(h.status)}">${h.status ?? '—'}</span>
        <span class="time">${Utils.formatDuration(h.duration)}</span>
      </div>
    `).join('');
  },

  renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    const items = History.getAll();
    if (!items.length) {
      list.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>${this.t('no_history')}</p></div>`;
      return;
    }
    list.innerHTML = items.map(h => `
      <div class="history-item">
        <span class="method">${h.method}</span>
        <span class="url" title="${Utils.escapeHtml(h.url)}">${Utils.escapeHtml(h.url)}</span>
        <span class="status status-badge ${Utils.statusCategory(h.status)}">${h.status ?? 'ERR'}</span>
        <span class="time">${Utils.formatTime(h.timestamp)}</span>
        <button class="btn btn-sm btn-ghost hist-del" data-id="${h.id}">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.hist-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        History.remove(btn.dataset.id);
        this.renderHistory();
        this.renderDashboard();
      });
    });
  },

  renderProvidersPanel() {
    const grid = document.getElementById('providers-grid');
    if (!grid) return;
    grid.innerHTML = Providers.getAll().map(p => `
      <div class="provider-card">
        <h4>${Utils.escapeHtml(p.name)}</h4>
        <div class="base-url">${Utils.escapeHtml(p.baseUrl || '—')}</div>
        <div class="text-sm text-muted">Auth: ${p.auth?.type || 'none'}</div>
        ${p.docsUrl ? `<a href="${Utils.escapeHtml(p.docsUrl)}" target="_blank" rel="noopener">Docs ↗</a>` : ''}
      </div>
    `).join('');
  },

  exportConfig() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      method: this.state.method,
      urlMode: this.state.urlMode,
      providerId: this.state.currentProviderId,
      endpoint: this.state.endpoint,
      customUrl: this.state.customUrl,
      queryParams: this.state.queryParams,
      headers: this.state.headers,
      authType: this.state.authType,
      body: this.state.body
    };
    Utils.downloadFile('api-lab-request.json', JSON.stringify(data, null, 2));
    this.toast('Exported (without credentials)', 'success');
  },

  importConfig(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.method) this.state.method = data.method;
        if (data.urlMode) this.state.urlMode = data.urlMode;
        if (data.providerId) this.state.currentProviderId = data.providerId;
        if (data.endpoint != null) this.state.endpoint = data.endpoint;
        if (data.customUrl != null) this.state.customUrl = data.customUrl;
        if (data.queryParams) this.state.queryParams = data.queryParams;
        if (data.headers) this.state.headers = data.headers;
        if (data.authType) this.state.authType = data.authType;
        if (data.body != null) this.state.body = data.body;

        document.querySelectorAll('.method-seg button').forEach(b => {
          b.classList.toggle('active', b.dataset.method === this.state.method);
        });
        document.querySelectorAll('.url-mode-seg button').forEach(b => {
          b.classList.toggle('active', b.dataset.mode === this.state.urlMode);
        });
        const sel = document.getElementById('provider-select');
        if (sel) sel.value = this.state.currentProviderId;
        const ep = document.getElementById('endpoint-input');
        if (ep) ep.value = this.state.endpoint;
        const cu = document.getElementById('custom-url-input');
        if (cu) cu.value = this.state.customUrl;
        const be = document.getElementById('body-editor');
        if (be) be.value = this.state.body;
        const at = document.getElementById('auth-type');
        if (at) at.value = this.state.authType;

        this.updateUrlModeUI();
        this.renderHeaders();
        this.renderParams();
        this.renderAuthFields();
        this.updateFinalUrl();
        this.updateBodyEnabled();
        this.toast('Configuration imported', 'success');
      } catch (err) {
        this.toast('Invalid import file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  },

  applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });
    const langBtn = document.getElementById('btn-lang');
    if (langBtn) langBtn.textContent = Settings.get('language') === 'fa' ? 'EN' : 'فا';
  },

  toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
