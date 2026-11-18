/**
 * Rule-based Response Analyzer
 */

const Analyzer = {
  analyze(ctx) {
    const result = {
      summary: '',
      details: [],
      type: 'unknown',
      severity: 'info',
      structure: null
    };

    if (ctx.error) {
      return this._analyzeError(ctx.error, result);
    }

    const status = ctx.status;
    if (status == null) {
      result.summary = 'No response received.';
      result.severity = 'error';
      return result;
    }

    result.details.push(`HTTP Status: ${status} ${ctx.statusText || Utils.statusText(status)}`);

    if (status >= 200 && status < 300) {
      result.severity = 'success';
      result.summary = 'Request completed successfully.';
    } else if (status === 401) {
      result.severity = 'warning';
      result.summary = 'Authentication failed. Check your API key, token, or authentication configuration.';
    } else if (status === 403) {
      result.severity = 'warning';
      result.summary = 'The server denied access. This may be caused by permissions, IP restrictions, or security protection.';
    } else if (status === 404) {
      result.severity = 'warning';
      result.summary = 'The requested endpoint was not found. Verify the Base URL and Endpoint.';
    } else if (status === 429) {
      result.severity = 'warning';
      result.summary = 'Rate limit or usage quota may have been exceeded. Wait and retry, or check your plan limits.';
    } else if (status >= 500) {
      result.severity = 'error';
      result.summary = 'Server error. The remote service encountered a problem.';
    } else if (status >= 400) {
      result.severity = 'warning';
      result.summary = 'Client error. The request was rejected by the server.';
    } else {
      result.severity = 'info';
      result.summary = `Received HTTP ${status}.`;
    }

    const body = ctx.body || '';
    const contentType = (ctx.headers && (ctx.headers['content-type'] || ctx.headers['Content-Type'])) || '';

    if (!body.trim()) {
      result.type = 'empty';
      result.details.push('Response body is empty.');
      return result;
    }

    const parsed = Utils.tryParseJSON(body);
    if (parsed.ok) {
      result.type = 'json';
      result.structure = this._analyzeJSON(parsed.data);
      result.details.push(...result.structure.notes);

      if (parsed.data.error || parsed.data.errors || (parsed.data.message && status >= 400)) {
        const errMsg = this._extractErrorMessage(parsed.data);
        if (errMsg) {
          result.details.push('API error message: ' + errMsg);
          if (result.severity === 'success') result.severity = 'warning';
        }
      }

      if (parsed.data.choices || parsed.data.model || parsed.data.usage) {
        result.details.push('Detected OpenAI-compatible response structure.');
      }

      if (result.severity === 'success') {
        result.summary = 'Request completed successfully. The server returned a valid JSON response.';
      }
    } else if (contentType.includes('html') || /^\s*<(!DOCTYPE|html|head|body)/i.test(body)) {
      result.type = 'html';
      result.details.push('Response appears to be HTML.');
      if (result.severity === 'success') {
        result.summary = 'Request completed. Server returned HTML content.';
      }
    } else if (contentType.includes('xml') || /^\s*<\?xml/i.test(body)) {
      result.type = 'xml';
      result.details.push('Response appears to be XML.');
    } else {
      result.type = 'text';
      result.details.push('Response is plain text.');
      if (result.severity === 'success') {
        result.summary = 'Request completed successfully. The server returned plain text.';
      }
    }

    result.details.push(`Response size: ${Utils.formatBytes(new Blob([body]).size)}`);
    result.details.push(`Duration: ${Utils.formatDuration(ctx.duration)}`);

    return result;
  },

  _analyzeError(err, result) {
    result.severity = 'error';
    const msg = (err && err.message) ? err.message : String(err);

    if (err.name === 'AbortError') {
      result.summary = 'Request was cancelled or timed out.';
      result.details.push('The request was aborted by the user or reached the configured timeout.');
      return result;
    }

    if (/Failed to fetch|NetworkError|network/i.test(msg)) {
      result.summary = 'Network request failed.';
      result.details.push(
        'Possible causes: the server is unreachable, DNS failure, SSL/TLS problem, or a CORS restriction.',
        'CORS: If the remote server does not allow requests from this origin (GitHub Pages / localhost), the browser blocks the response. This cannot be fixed purely on the client side.',
        'Check the browser console (Network tab) for more precise information.'
      );
      return result;
    }

    if (/CORS|cross-origin|Access-Control/i.test(msg)) {
      result.summary = 'CORS restriction detected.';
      result.details.push(
        'The remote server did not send the required Access-Control-Allow-Origin headers for this origin.',
        'Browser security prevents reading the response. This is controlled by the API provider, not by API LAB.'
      );
      return result;
    }

    result.summary = 'Request failed: ' + msg;
    result.details.push(msg);
    return result;
  },

  _analyzeJSON(data) {
    const notes = [];
    const structure = { rootType: Array.isArray(data) ? 'array' : typeof data, notes };

    if (Array.isArray(data)) {
      notes.push(`Root is an array with ${data.length} item(s).`);
      if (data.length > 0 && typeof data[0] === 'object') {
        notes.push('First item keys: ' + Object.keys(data[0]).slice(0, 8).join(', '));
      }
    } else if (data && typeof data === 'object') {
      const keys = Object.keys(data);
      notes.push(`Root is an object with ${keys.length} propert${keys.length === 1 ? 'y' : 'ies'}.`);
      notes.push('Top-level keys: ' + keys.slice(0, 12).join(', ') + (keys.length > 12 ? '…' : ''));

      if (data.id) notes.push('Contains an "id" field.');
      if (data.model) notes.push(`Model: ${data.model}`);
      if (data.choices && Array.isArray(data.choices)) {
        notes.push(`Contains "choices" array (${data.choices.length} item(s)).`);
      }
      if (data.data) notes.push('Contains a "data" field.');
      if (data.usage) {
        const u = data.usage;
        notes.push(`Token usage: prompt=${u.prompt_tokens ?? '—'}, completion=${u.completion_tokens ?? '—'}, total=${u.total_tokens ?? '—'}`);
      }
      if (data.error) notes.push('Contains an "error" field.');
    } else {
      notes.push(`Root value is a ${typeof data}.`);
    }

    return structure;
  },

  _extractErrorMessage(data) {
    if (!data) return null;
    if (typeof data.error === 'string') return data.error;
    if (data.error && data.error.message) return data.error.message;
    if (data.message) return data.message;
    if (Array.isArray(data.errors) && data.errors[0]) {
      return typeof data.errors[0] === 'string' ? data.errors[0] : (data.errors[0].message || JSON.stringify(data.errors[0]));
    }
    return null;
  }
};

window.Analyzer = Analyzer;
