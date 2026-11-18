
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { timingSafeEqual } from "node:crypto";

const ALLOWED_ORIGINS = new Set([
  "https://khanepaz.github.io",
  "https://checkapi1.netlify.app"
]);

const MAX_REQUEST_SIZE = 1024 * 1024;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

const BLOCKED_HEADERS = new Set([
  "host", "content-length", "connection", "keep-alive",
  "proxy-authenticate", "proxy-authorization", "te",
  "trailer", "transfer-encoding", "upgrade",
  "x-checkapi-token"
]);

function cors(origin) {
  const h = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Checkapi-Token",
    "Access-Control-Max-Age": "600"
  };

  if (ALLOWED_ORIGINS.has(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
  }

  return h;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function secureEqual(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));

  return x.length > 0 &&
    x.length === y.length &&
    timingSafeEqual(x, y);
}

function isPrivateIP(ip) {
  if (isIP(ip) === 4) {
    const p = ip.split(".").map(Number);
    const a = p[0], b = p[1], c = p[2];

    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19));
  }

  const s = ip.toLowerCase();

  if (
    s === "::" || s === "::1" ||
    s.startsWith("fc") || s.startsWith("fd") ||
    s.startsWith("fe8") || s.startsWith("fe9") ||
    s.startsWith("fea") || s.startsWith("feb") ||
    s.startsWith("ff")
  ) return true;

  if (s.startsWith("::ffff:")) {
    const mapped = s.slice(7);
    if (isIP(mapped) === 4) return isPrivateIP(mapped);
  }

  return false;
}

async function validateURL(raw) {
  let url;

  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS are supported.");
  }

  if (url.username || url.password) {
    throw new Error("Credentials in URL are not allowed.");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    throw new Error("Target host is blocked.");
  }

  let addresses;

  try {
    addresses = isIP(host)
      ? [{ address: host }]
      : await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new Error("Hostname resolution failed.");
  }

  if (
    !addresses.length ||
    addresses.some(x => isPrivateIP(x.address))
  ) {
    throw new Error("Private or reserved IP addresses are blocked.");
  }

  return url;
}

export default async function handler(req) {
  const origin = req.headers.get("origin") || "";
  const headers = cors(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: ALLOWED_ORIGINS.has(origin) ? 204 : 403,
      headers
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, headers);
  }

  if (!ALLOWED_ORIGINS.has(origin)) {
    return json({ error: "Origin not allowed." }, 403, headers);
  }

  const expected = Netlify.env.get("CHECKAPI_PROXY_TOKEN");
  const supplied = req.headers.get("x-checkapi-token");

  if (!expected || !secureEqual(supplied, expected)) {
    return json({ error: "Invalid proxy token." }, 401, headers);
  }

  let raw;

  try {
    raw = await req.text();

    if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_SIZE) {
      return json({ error: "Request exceeds 1 MB." }, 413, headers);
    }
  } catch {
    return json({ error: "Cannot read request." }, 400, headers);
  }

  let input;

  try {
    input = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON." }, 400, headers);
  }

  const method = String(input.method || "GET").toUpperCase();

  const allowed = [
    "GET", "HEAD", "POST", "PUT",
    "PATCH", "DELETE", "OPTIONS"
  ];

  if (!allowed.includes(method)) {
    return json({ error: "Unsupported HTTP method." }, 400, headers);
  }

  if (
    input.body != null &&
    !["string", "number", "boolean"].includes(typeof input.body)
  ) {
    return json({ error: "Body must be text." }, 400, headers);
  }

  let target;

  try {
    target = await validateURL(input.url);
  } catch (e) {
    return json({ error: e.message }, 400, headers);
  }

  const requestHeaders = new Headers();

  if (
    input.headers &&
    typeof input.headers === "object" &&
    !Array.isArray(input.headers)
  ) {
    for (const [key, value] of Object.entries(input.headers)) {
      if (
        !BLOCKED_HEADERS.has(key.toLowerCase()) &&
        value != null
      ) {
        try {
          requestHeaders.set(key, String(value));
        } catch {
          return json({ error: "Invalid header: " + key }, 400, headers);
        }
      }
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);

  try {
    const options = {
      method,
      headers: requestHeaders,
      redirect: "manual",
      signal: controller.signal
    };

    if (
      !["GET", "HEAD"].includes(method) &&
      input.body != null &&
      String(input.body) !== ""
    ) {
      options.body = String(input.body);
    }

    const response = await fetch(target.toString(), options);
    const buffer = await response.arrayBuffer();

    if (buffer.byteLength > MAX_RESPONSE_SIZE) {
      return json({ error: "Response exceeds 5 MB." }, 502, headers);
    }

    const responseHeaders = new Headers(headers);

    response.headers.forEach((value, key) => {
      const k = key.toLowerCase();

      if (![
        "connection", "keep-alive",
        "proxy-authenticate", "proxy-authorization",
        "te", "trailer", "transfer-encoding",
        "upgrade", "content-length",
        "content-encoding", "set-cookie"
      ].includes(k)) {
        responseHeaders.set(key, value);
      }
    });

    responseHeaders.set("Cache-Control", "no-store");

    const noBody = [204, 205, 304].includes(response.status);

    return new Response(noBody ? null : buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (e) {
    const timeout = e.name === "AbortError";

    return json({
      error: timeout
        ? "Request timeout after 55 seconds."
        : "Upstream request failed: " + e.message
    }, timeout ? 504 : 502, headers);

  } finally {
    clearTimeout(timer);
  }
}
