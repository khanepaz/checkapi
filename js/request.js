/**
 * Request Builder & Executor
 */

const RequestEngine = {
  controller: null,

  async send(config) {
    if (this.controller) {
      this.controller.abort();
    }
    this.controller = new AbortController();

    const timeout = Settings.get('timeout') || 30000;
    const timeoutId = setTimeout(() => this.controller.abort(), timeout);

    const start = performance.now();
    let status = null;
    let statusText = '';
    let body = '';
    let headers = {};
    let contentType = '';
    let size = 0;
    let error = null;

    try {
      let url;
      try {
        url = new URL(config.url);
      } catch {
        throw new Error('Invalid URL. Please check the request URL.');
      }

      const finalHeaders = { ...config.headers };

      let bodyPayload = undefined;
      if (config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH') {
        if (config.body && config.body.trim()) {
          const ct = finalHeaders['Content-Type'] || finalHeaders['content-type'] || '';
          if (ct.includes('json') || !ct) {
            const parsed = Utils.tryParseJSON(config.body);
            if (!parsed.ok) {
              throw new Error('Invalid JSON body: ' + parsed.error);
            }
            bodyPayload = config.body;
            if (!ct) finalHeaders['Content-Type'] = 'application/json';
          } else {
            bodyPayload = config.body;
          }
        }
      }

      const fetchOpts = {
        method: config.method,
        headers: finalHeaders,
        signal: this.controller.signal
      };

      if (bodyPayload !== undefined) {
        fetchOpts.body = bodyPayload;
      }

      const response = await fetch(url.toString(), fetchOpts);
      status = response.status;
      statusText = response.statusText;

      response.headers.forEach((v, k) => {
        headers[k] = v;
      });
      contentType = headers['content-type'] || headers['Content-Type'] || '';

      body = await response.text();
      size = new Blob([body]).size;

    } catch (err) {
      error = err;
    } finally {
      clearTimeout(timeoutId);
      this.controller = null;
    }

    const duration = performance.now() - start;
    const success = !error && status != null && status >= 200 && status < 400;

    const result = {
      status,
      statusText,
      body,
      headers,
      contentType,
      size,
      duration,
      error,
      success,
      method: config.method,
      url: config.url,
      timestamp: Date.now()
    };

    return result;
  },

  cancel() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
};

window.RequestEngine = RequestEngine;
