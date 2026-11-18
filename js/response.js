/**
 * Response Viewer helpers
 */

const ResponseViewer = {
  current: null,

  render(ctx) {
    this.current = ctx;
    const metaEl = document.getElementById('response-meta');
    const prettyEl = document.getElementById('response-pretty');
    const rawEl = document.getElementById('response-raw');
    const previewEl = document.getElementById('response-preview');
    const headersEl = document.getElementById('response-headers');
    const analyzerEl = document.getElementById('response-analyzer');

    if (!metaEl) return;

    const cat = Utils.statusCategory(ctx.status);
    const statusLabel = ctx.status != null
      ? `${ctx.status} ${ctx.statusText || Utils.statusText(ctx.status)}`
      : '—';

    metaEl.innerHTML = `
      <div class="meta-item">
        <span class="label">Status:</span>
        <span class="status-badge ${cat}">${Utils.escapeHtml(statusLabel)}</span>
      </div>
      <div class="meta-item">
        <span class="label">Time:</span>
        <span>${Utils.formatDuration(ctx.duration)}</span>
      </div>
      <div class="meta-item">
        <span class="label">Size:</span>
        <span>${Utils.formatBytes(ctx.size)}</span>
      </div>
      <div class="meta-item">
        <span class="label">Type:</span>
        <span>${Utils.escapeHtml(ctx.contentType || '—')}</span>
      </div>
    `;

    if (ctx.body) {
      const parsed = Utils.tryParseJSON(ctx.body);
      if (parsed.ok) {
        prettyEl.innerHTML = `<pre class="response-content">${Utils.syntaxHighlight(parsed.data)}</pre>`;
      } else {
        prettyEl.innerHTML = `<pre class="response-content">${Utils.escapeHtml(ctx.body)}</pre>`;
      }
    } else {
      prettyEl.innerHTML = `<div class="empty-state"><div class="icon">∅</div><p>Empty response</p></div>`;
    }

    rawEl.innerHTML = ctx.body
      ? `<pre class="response-content">${Utils.escapeHtml(ctx.body)}</pre>`
      : `<div class="empty-state"><p>Empty</p></div>`;

    previewEl.innerHTML = '';
    if (ctx.body) {
      const ct = (ctx.contentType || '').toLowerCase();
      if (ct.includes('image/')) {
        previewEl.innerHTML = `<div class="empty-state"><p>Image content received (${Utils.escapeHtml(ct)}). Switch to Raw/Pretty to inspect.</p></div>`;
      } else if (ct.includes('text/html') || /^\s*</.test(ctx.body.trim())) {
        previewEl.innerHTML = `<div class="empty-state"><p>HTML content is not rendered for security. View Raw or Pretty instead.</p></div>`;
      } else {
        const parsed = Utils.tryParseJSON(ctx.body);
        if (parsed.ok) {
          previewEl.innerHTML = `<pre class="response-content">${Utils.syntaxHighlight(parsed.data)}</pre>`;
        } else {
          previewEl.innerHTML = `<pre class="response-content">${Utils.escapeHtml(ctx.body.slice(0, 5000))}</pre>`;
        }
      }
    } else {
      previewEl.innerHTML = `<div class="empty-state"><p>No content</p></div>`;
    }

    if (ctx.headers && Object.keys(ctx.headers).length) {
      let rows = '';
      for (const [k, v] of Object.entries(ctx.headers)) {
        rows += `<tr><td class="font-mono text-sm">${Utils.escapeHtml(k)}</td><td class="font-mono text-sm">${Utils.escapeHtml(String(v))}</td></tr>`;
      }
      headersEl.innerHTML = `
        <table class="kv-table">
          <thead><tr><th>Name</th><th>Value</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    } else {
      headersEl.innerHTML = `<div class="empty-state"><p>No headers</p></div>`;
    }

    const analysis = Analyzer.analyze(ctx);
    analyzerEl.innerHTML = this._renderAnalysis(analysis);
  },

  _renderAnalysis(a) {
    const icon = a.severity === 'success' ? '✓' : a.severity === 'error' ? '✕' : '⚠';
    let details = '';
    if (a.details && a.details.length) {
      details = '<ul>' + a.details.map(d => `<li>${Utils.escapeHtml(d)}</li>`).join('') + '</ul>';
    }
    return `
      <div class="analyzer-card" style="border-color: var(--${a.severity === 'success' ? 'success' : a.severity === 'error' ? 'error' : 'warning'})">
        <h4>${icon} Analysis</h4>
        <p><strong>${Utils.escapeHtml(a.summary)}</strong></p>
        ${details}
      </div>`;
  },

  clear() {
    this.current = null;
    const ids = ['response-meta', 'response-pretty', 'response-raw', 'response-preview', 'response-headers', 'response-analyzer'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });
  },

  showEmpty() {
    this.clear();
    const pretty = document.getElementById('response-pretty');
    if (pretty) {
      pretty.innerHTML = `<div class="empty-state"><div class="icon">📡</div><p data-i18n="send_to_see">Send a request to see the response</p></div>`;
    }
  }
};

window.ResponseViewer = ResponseViewer;
