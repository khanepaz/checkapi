/**
 * Authentication Manager
 */

const Auth = {
  types: [
    { id: 'auto', label: 'Auto Suggest' },
    { id: 'bearer', label: 'Bearer Token' },
    { id: 'apiKeyHeader', label: 'API Key (Header)' },
    { id: 'apiKeyQuery', label: 'API Key (Query)' },
    { id: 'basic', label: 'Basic Auth' },
    { id: 'custom', label: 'Custom Header' },
    { id: 'none', label: 'No Auth' }
  ],

  suggest(provider) {
    if (!provider || !provider.auth) return 'none';
    const t = provider.auth.type;
    if (t === 'bearer') return 'bearer';
    if (t === 'apiKeyQuery') return 'apiKeyQuery';
    if (t === 'apiKeyHeader') return 'apiKeyHeader';
    if (t === 'basic') return 'basic';
    return 'none';
  },

  build(authType, fields, provider) {
    const headers = {};
    const queryParams = [];

    switch (authType) {
      case 'bearer': {
        const token = (fields.token || '').trim();
        if (token) {
          const prefix = (provider?.auth?.prefix) || 'Bearer ';
          const headerName = (provider?.auth?.headerName) || 'Authorization';
          headers[headerName] = prefix + token;
        }
        break;
      }
      case 'apiKeyHeader': {
        const key = (fields.apiKey || '').trim();
        const name = (fields.headerName || 'X-API-Key').trim();
        if (key && name) {
          headers[name] = key;
        }
        break;
      }
      case 'apiKeyQuery': {
        const key = (fields.apiKey || '').trim();
        const param = (fields.paramName || provider?.auth?.paramName || 'key').trim();
        if (key && param) {
          queryParams.push({ key: param, value: key, enabled: true });
        }
        break;
      }
      case 'basic': {
        const user = (fields.username || '').trim();
        const pass = (fields.password || '').trim();
        if (user) {
          const encoded = btoa(user + ':' + pass);
          headers['Authorization'] = 'Basic ' + encoded;
        }
        break;
      }
      case 'custom': {
        const name = (fields.headerName || '').trim();
        const value = (fields.headerValue || '').trim();
        if (name && value) {
          headers[name] = value;
        }
        break;
      }
      case 'none':
      case 'auto':
      default:
        break;
    }

    return { headers, queryParams };
  },

  mask(value) {
    if (!value) return '';
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••' + value.slice(-4);
  }
};

window.Auth = Auth;
