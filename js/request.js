
/**
 * Request Builder & Executor
 * Sends requests through Netlify Proxy to avoid browser CORS restrictions.
 */

const RequestEngine = {
  controller: null,

  PROXY_URL: 'https://checkapi1.netlify.app/.netlify/functions/proxy',
  TOKEN_KEY: 'checkapi_proxy_token',

  getProxyToken() {
    let token = sessionStorage.getItem(this.TOKEN_KEY);

    if (!token) {
      token = window.prompt('Enter your Checkapi Proxy Token:');

      if (!token || !token.trim()) {
        throw new Error('Proxy token is required.');
      }

      token = token.trim();
      sessionStorage.setItem(this.TOKEN_KEY, token);
    }

    return token;
  },

  async send(config) {
    if (this.controller) {
      this.controller.abort();
    }

    const controller = new AbortController();
    this.controller = controller;

    const timeout = Settings.get('timeout') || 30000;
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout
    );

    const start = performance.now();

    let status = null;
    let statusText = '';
    let body = '';
    let headers = {};
    let contentType = '';
    let size = 0;
    let error = null;

    try {
      const url = new URL(config.url);

      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported.');
      }

      const token = this.getProxyToken();

      const finalHeaders = { ...config.headers };

      let bodyPayload = undefined;

      if (
        ['POST', 'PUT', 'PATCH'].includes(config.method) &&
        config.body &&
        config.body.trim()
      ) {
        const ct =
          finalHeaders['Content-Type'] ||
          finalHeaders['content-type'] ||
          '';

        if (ct.includes('json') || !ct) {
          const parsed = Utils.tryParseJSON(config.body);

          if (!parsed.ok) {
            throw new Error(
              'Invalid JSON body: ' + parsed.error
            );
          }

          bodyPayload = config.body;

          if (!ct) {
            finalHeaders['Content-Type'] = 'application/json';
          }
        } else {
          bodyPayload = config.body;
        }
      }

      const response = await fetch(this.PROXY_URL, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'X-Checkapi-Token': token
        },

        body: JSON.stringify({
          url: url.toString(),
          method: config.method,
          headers: finalHeaders,
          body: bodyPayload
        }),

        signal: controller.signal
      });

      status = response.status;
      statusText = response.statusText;

      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      contentType =
        headers['content-type'] || '';

      body = await response.text();

      size = new Blob([body]).size;

    } catch (err) {
      error = err;

      if (err && err.name === 'AbortError') {
        error = new Error('Request cancelled or timed out.');
      }

    } finally {
      clearTimeout(timeoutId);

      if (this.controller === controller) {
        this.controller = null;
      }
    }

    const duration = performance.now() - start;

    const success =
      !error &&
      status != null &&
      status >= 200 &&
      status < 400;

    return {
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
  },

  cancel() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
};

window.RequestEngine = RequestEngine;
