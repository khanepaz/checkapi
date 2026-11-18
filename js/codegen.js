/**
 * Code Generator – generates curl, Python, JavaScript snippets
 * for learning purposes. Never includes real secrets in the output
 * (uses placeholders instead).
 */

const CodeGen = {
  generate(cfg) {
    const method = (cfg.method || 'GET').toUpperCase();
    const url = cfg.url || '';
    const headers = this._safeHeaders(cfg.headers || {});
    const body = cfg.body || '';

    return {
      curl: this._curl(method, url, headers, body),
      python: this._python(method, url, headers, body),
      javascript: this._javascript(method, url, headers, body),
      fetch: this._fetch(method, url, headers, body)
    };
  },

  _safeHeaders(headers) {
    const safe = {};
    const secretKeys = ['authorization', 'x-api-key', 'api-key', 'x-auth-token', 'token'];
    for (const [k, v] of Object.entries(headers)) {
      const lower = k.toLowerCase();
      if (secretKeys.some(s => lower.includes(s)) || lower.includes('key') || lower.includes('token')) {
        safe[k] = 'YOUR_API_KEY_OR_TOKEN';
      } else {
        safe[k] = v;
      }
    }
    return safe;
  },

  _escapeShell(str) {
    return String(str).replace(/'/g, "'\\''");
  },

  _curl(method, url, headers, body) {
    let lines = [`curl -X ${method} '${this._escapeShell(url)}'`];

    for (const [k, v] of Object.entries(headers)) {
      lines.push(`  -H '${this._escapeShell(k)}: ${this._escapeShell(v)}'`);
    }

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const compact = body.replace(/\s+/g, ' ').trim();
      lines.push(`  -d '${this._escapeShell(compact)}'`);
    }

    return lines.join(' \\\n');
  },

  _python(method, url, headers, body) {
    const headerLines = Object.entries(headers)
      .map(([k, v]) => `    "${k}": "${v.replace(/"/g, '\\"')}",`)
      .join('\n');

    let code = `import requests\n\nurl = "${url}"\n\nheaders = {\n${headerLines}\n}\n\n`;

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      code += `payload = ${body}\n\n`;
      code += `response = requests.${method.toLowerCase()}(url, headers=headers, json=payload)\n`;
    } else {
      code += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`;
    }

    code += `\nprint("Status:", response.status_code)\nprint("Body:", response.text)\n`;
    return code;
  },

  _javascript(method, url, headers, body) {
    const headerObj = JSON.stringify(headers, null, 2)
      .split('\n')
      .map((l, i) => (i === 0 ? l : '  ' + l))
      .join('\n');

    let code = `const url = "${url}";\n\nconst headers = ${headerObj};\n\n`;

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      code += `const body = ${body};\n\n`;
      code += `fetch(url, {\n  method: "${method}",\n  headers,\n  body: JSON.stringify(body)\n})\n`;
    } else {
      code += `fetch(url, {\n  method: "${method}",\n  headers\n})\n`;
    }

    code += `  .then(res => {\n    console.log("Status:", res.status);\n    return res.text();\n  })\n  .then(text => console.log("Body:", text))\n  .catch(err => console.error(err));\n`;
    return code;
  },

  _fetch(method, url, headers, body) {
    return this._javascript(method, url, headers, body);
  },

  render(cfg, containerId = 'response-code') {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!cfg || !cfg.url) {
      el.innerHTML = `<div class="empty-state"><p>Send a request first to generate code snippets</p></div>`;
      return;
    }

    const snippets = this.generate(cfg);

    el.innerHTML = `
      <div class="code-tabs">
        <button class="code-tab-btn active" data-lang="curl">cURL</button>
        <button class="code-tab-btn" data-lang="python">Python</button>
        <button class="code-tab-btn" data-lang="javascript">JavaScript</button>
      </div>
      <div class="code-block-wrapper">
        <button class="btn btn-sm btn-ghost code-copy-btn" title="Copy">Copy</button>
        <pre class="code-block" id="code-content">${Utils.escapeHtml(snippets.curl)}</pre>
      </div>
      <p class="text-sm text-muted mt-2">Secrets are replaced with placeholders. Replace them with your real key before running.</p>
    `;

    el.querySelectorAll('.code-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.code-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const lang = btn.dataset.lang;
        const content = snippets[lang] || snippets.curl;
        document.getElementById('code-content').textContent = content;
      });
    });

    el.querySelector('.code-copy-btn')?.addEventListener('click', async () => {
      const text = document.getElementById('code-content')?.textContent || '';
      const ok = await Utils.copyToClipboard(text);
      if (window.App) App.toast(ok ? 'Copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
    });
  }
};

window.CodeGen = CodeGen;
