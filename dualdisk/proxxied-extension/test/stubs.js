// Minimal browser stub so recorder.js can run under JavaScriptCore (osascript -l JavaScript).
ObjC.import('Foundation');
function readFile(p) {
  return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null));
}

const G = globalThis;
globalThis.out = [];
G.console = { log: (...a) => out.push(a.map(String).join(' ')) };

// --- base64 (for the JWT claim decoder)
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
G.atob = function (s) {
  s = String(s).replace(/=+$/, '');
  let bits = 0, acc = 0, res = '';
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) continue;
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; res += String.fromCharCode((acc >> bits) & 0xff); }
  }
  return res;
};
G.btoa = function (s) {
  let res = '';
  for (let i = 0; i < s.length; i += 3) {
    const a = s.charCodeAt(i), b = s.charCodeAt(i + 1), c = s.charCodeAt(i + 2);
    const n = (a << 16) | ((isNaN(b) ? 0 : b) << 8) | (isNaN(c) ? 0 : c);
    res += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (isNaN(b) ? '=' : B64[(n >> 6) & 63]) + (isNaN(c) ? '=' : B64[n & 63]);
  }
  return res;
};

// --- URL / URLSearchParams
class SP2 {
  constructor(q) {
    this._ = [];
    String(q || '').replace(/^\?/, '').split('&').filter(Boolean).forEach((kv) => {
      const i = kv.indexOf('=');
      this._.push(i < 0 ? [decodeURIComponent(kv), ''] : [decodeURIComponent(kv.slice(0, i)), decodeURIComponent(kv.slice(i + 1))]);
    });
  }
  get(k) { const f = this._.find((p) => p[0] === k); return f ? f[1] : null; }
  has(k) { return this._.some((p) => p[0] === k); }
  set(k, v) { const f = this._.find((p) => p[0] === k); if (f) f[1] = v; else this._.push([k, v]); }
  forEach(fn) { this._.forEach(([k, v]) => fn(v, k)); }
  toString() { return this._.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&'); }
}
G.URLSearchParams = SP2;
G.URL = class {
  constructor(url, base) {
    let u = String(url);
    if (!/^https?:/.test(u) && base) u = String(base).replace(/(^https?:\/\/[^/]+).*/, '$1') + (u.startsWith('/') ? u : '/' + u);
    const m = u.match(/^(https?:)\/\/([^/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/);
    if (!m) throw new Error('bad url ' + url);
    this.protocol = m[1]; this.host = m[2]; this.origin = m[1] + '//' + m[2];
    this.pathname = m[3] || '/'; this.search = m[4] || ''; this.hash = m[5] || '';
    this.searchParams = new SP2(this.search);
    this.href = u;
  }
  static createObjectURL(b) { G.__lastBlob = b; return 'blob:stub'; }
  static revokeObjectURL() {}
};

// --- Headers
G.Headers = class {
  constructor(init) {
    this._ = new Map();
    if (init instanceof G.Headers) init._.forEach((v, k) => this._.set(k, v));
    else if (Array.isArray(init)) init.forEach(([k, v]) => this._.set(String(k).toLowerCase(), v));
    else if (init && typeof init === 'object') Object.keys(init).forEach((k) => this._.set(k.toLowerCase(), init[k]));
  }
  get(k) { return this._.has(String(k).toLowerCase()) ? this._.get(String(k).toLowerCase()) : null; }
  forEach(fn) { this._.forEach((v, k) => fn(v, k)); }
};
G.Request = class {};
G.Blob = class { constructor(parts) { this.parts = parts; this.text = () => Promise.resolve(parts.join('')); } };
G.FormData = class {};

// --- DOM
const listeners = {};
G.__downloads = [];
G.document = {
  addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
  dispatchEvent: (ev) => { (listeners[ev.type] || []).forEach((fn) => fn(ev)); return true; },
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, set href(v) {}, click() { G.__downloads.push({ name: this.download, text: (G.__lastBlob && G.__lastBlob.parts.join('')) || '' }); }, remove() {} }),
  body: { appendChild: () => {} },
  cookie: 'cf_clearance=abc; sb-access=1',
};
G.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = (init && init.detail) || null; } };
G.location = { href: 'https://proxxied.com/project/abc', origin: 'https://proxxied.com', reload: () => { globalThis.__reloaded = true; } };
G.performance = { now: () => Date.now(), getEntriesByType: () => [] };
G.navigator = {};
// Fire on the microtask queue so awaited sleeps actually resolve.
G.setTimeout = (fn) => { Promise.resolve().then(fn); return 0; };
G.localStorage = {
  _: { 'sb-xyz-auth-token': JSON.stringify({ access_token: 'header.' + G.btoa(JSON.stringify({ role: 'authenticated', sub: 'user-1', exp: 1800000000 })) + '.sig', refresh_token: 'r', user: { id: 'user-1', role: 'authenticated', aud: 'authenticated' } }) },
  get length() { return Object.keys(this._).length; },
  key(i) { return Object.keys(this._)[i]; },
  getItem(k) { return this._[k]; },
};

// --- fetch (the "original" the recorder wraps)
G.__fetchLog = [];
G.fetch = function (url, init) {
  G.__fetchLog.push(String(url));
  // Scryfall's bulk endpoint, answered from the per-card fixtures.
  if (String(url).includes('api.scryfall.com/cards/collection')) {
    const ids = JSON.parse(init.body).identifiers;
    const data = [], not_found = [];
    for (const id of ids) {
      const key = `https://api.proxxied.com/api/scryfall/cards/${id.set}/${id.collector_number}?lang=en`;
      const miss = G.__collectionMisses && G.__collectionMisses.has(id.set + '|' + id.collector_number);
      const fx = miss ? null : G.__responses[key];
      if (fx) { const c = JSON.parse(fx.body); c.set = id.set; c.collector_number = id.collector_number; data.push(c); }
      else not_found.push(id);
    }
    const body = JSON.stringify({ data, not_found });
    const mk2 = () => ({ status: 200, ok: true, headers: new G.Headers({ 'content-type': 'application/json' }),
      text: () => Promise.resolve(body), json: () => Promise.resolve(JSON.parse(body)), clone: mk2 });
    return Promise.resolve(mk2());
  }
  const r = G.__responses[String(url)] || { status: 404, body: '{}', ct: 'application/json' };
  const mk = () => ({
    status: r.status,
    headers: new G.Headers({ 'content-type': r.ct }),
    text: () => Promise.resolve(r.body),
    json: () => Promise.resolve(JSON.parse(r.body)),
    clone: mk,
    ok: r.status >= 200 && r.status < 300,
  });
  return Promise.resolve(mk());
};
G.__responses = {};

// --- XHR / WebSocket stubs (recorder patches their prototypes)
G.XMLHttpRequest = class { open() {} send() {} setRequestHeader() {} addEventListener() {} };
G.WebSocket = class { constructor() {} send() {} addEventListener() {} };
G.window = G;

