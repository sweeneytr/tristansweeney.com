// API discovery engine. Runs in the page's own JS realm (world: "MAIN") at
// document_start, before the app's bundle boots, so it sees every request the
// app makes from the very first one.
//
// Everything here is passive by default: it patches the network primitives to
// record traffic, and never changes what the page sends. The active parts
// (bundle scan, PostgREST OpenAPI probe) only run when explicitly triggered
// from the popup.
(function () {
  'use strict';

  const MAX_ENTRIES = 3000;
  const MAX_BODY_CHARS = 250000;
  const MAX_TOTAL_BODY_CHARS = 48000000; // ~48M chars of captured bodies
  const MAX_ARRAY_SAMPLES = 1000;
  const MAX_DEPTH = 14;

  const state = {
    seq: 0,
    entries: [],
    bodyChars: 0,
    // Last-seen project_data per project id, so an outgoing write can be
    // diffed against what the app most recently read.
    projectData: new Map(),
    diffs: [],
    ids: null,
    bundleScan: null,
    openapi: null,
    authNotes: null,
    revealSecrets: false,
    // Raw Authorization observed on Supabase traffic. Kept in memory only so
    // the importer can authenticate as the app does; deliberately never
    // included in buildJson()/buildMarkdown().
    rawAuthorization: null,
  };
  window.__proxxiedRecorder = state;

  // ---------------------------------------------------------------- utilities

  const SECRET_HEADERS = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'x-supabase-auth',
    'proxy-authorization',
  ]);
  // The Supabase anon `apikey` is public by design (it ships in the JS bundle)
  // and is useless without it in the report, so it is not treated as a secret.
  const SECRET_BODY_KEYS = /^(access_token|refresh_token|password|id_token|provider_token|provider_refresh_token|client_secret)$/i;

  function fingerprint(value) {
    const s = String(value);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return `<redacted len=${s.length} fp=${(h >>> 0).toString(16)}>`;
  }

  // A JWT's claims are the single most useful thing for understanding an auth
  // model (anon vs authenticated role, which project ref, expiry), and none of
  // them are the secret - the signature is. Keep the claims, drop the rest.
  function describeJwt(token) {
    try {
      const parts = String(token).replace(/^Bearer\s+/i, '').split('.');
      if (parts.length !== 3) return null;
      const claims = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return {
        role: claims.role,
        iss: claims.iss,
        ref: claims.ref,
        sub: claims.sub,
        aud: claims.aud,
        email: claims.email ? '<present>' : undefined,
        exp: claims.exp ? new Date(claims.exp * 1000).toISOString() : undefined,
        is_anon: claims.role === 'anon',
      };
    } catch (e) {
      return null;
    }
  }

  function redactHeaderValue(name, value) {
    if (state.revealSecrets) return value;
    if (!SECRET_HEADERS.has(name.toLowerCase())) return value;
    const jwt = describeJwt(value);
    return jwt ? `<redacted jwt ${JSON.stringify(jwt)}>` : fingerprint(value);
  }

  function redactBody(value, depth) {
    depth = depth || 0;
    if (state.revealSecrets || depth > MAX_DEPTH) return value;
    if (Array.isArray(value)) return value.map((v) => redactBody(v, depth + 1));
    if (value && typeof value === 'object') {
      const out = {};
      for (const k of Object.keys(value)) {
        out[k] = SECRET_BODY_KEYS.test(k) ? fingerprint(value[k]) : redactBody(value[k], depth + 1);
      }
      return out;
    }
    return value;
  }

  function headersToObject(h) {
    const out = {};
    if (!h) return out;
    try {
      if (typeof Headers !== 'undefined' && h instanceof Headers) {
        h.forEach((v, k) => (out[k] = redactHeaderValue(k, v)));
      } else if (Array.isArray(h)) {
        for (const [k, v] of h) out[k] = redactHeaderValue(k, v);
      } else if (typeof h === 'object') {
        for (const k of Object.keys(h)) out[k] = redactHeaderValue(k, h[k]);
      }
    } catch (e) {
      /* headers are best-effort */
    }
    return out;
  }

  function parseBody(text, contentType) {
    if (text == null || text === '') return { body: null, json: null };
    const truncated = text.length > MAX_BODY_CHARS;
    const slice = truncated ? text.slice(0, MAX_BODY_CHARS) : text;
    if (!truncated && /json/i.test(contentType || '')) {
      try {
        return { body: undefined, json: redactBody(JSON.parse(slice)), truncated: false };
      } catch (e) {
        /* fall through to raw text */
      }
    }
    if (!truncated) {
      // Some endpoints return JSON without saying so.
      const trimmed = slice.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return { body: undefined, json: redactBody(JSON.parse(trimmed)), truncated: false };
        } catch (e) {
          /* not json after all */
        }
      }
    }
    return { body: slice, json: null, truncated };
  }

  async function bodyToText(body) {
    if (body == null) return null;
    if (typeof body === 'string') return body;
    try {
      if (body instanceof URLSearchParams) return body.toString();
      if (body instanceof Blob) return body.size <= MAX_BODY_CHARS ? await body.text() : `<blob ${body.size} bytes>`;
      if (body instanceof ArrayBuffer) return `<arraybuffer ${body.byteLength} bytes>`;
      if (body instanceof FormData) {
        const parts = [];
        body.forEach((v, k) => parts.push(`${k}=${typeof v === 'string' ? v : '<file ' + (v.name || '') + '>'}`));
        return parts.join('&');
      }
      if (ArrayBuffer.isView(body)) return `<binary ${body.byteLength} bytes>`;
    } catch (e) {
      /* fall through */
    }
    return '<unreadable body>';
  }

  // Collapse ids out of a path so repeated calls to the same endpoint group
  // together in the inventory.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function pathTemplate(pathname) {
    return pathname
      .split('/')
      .map((seg) => {
        if (!seg) return seg;
        if (UUID_RE.test(seg)) return ':uuid';
        if (/^\d+$/.test(seg)) return ':n';
        if (/^[0-9a-f]{24,}$/i.test(seg)) return ':hash';
        return seg;
      })
      .join('/');
  }

  function callerStack() {
    try {
      return (new Error().stack || '')
        .split('\n')
        .slice(1)
        .filter((l) => !l.includes('recorder.js') && !l.includes('main-world.js'))
        .slice(0, 4)
        .map((l) => l.trim())
        .join(' | ');
    } catch (e) {
      return '';
    }
  }

  // emit() reaches the popup and the on-page overlay; debug() only the console.
  function emit(line) {
    document.dispatchEvent(new CustomEvent('proxxied-import-progress', { detail: { line } }));
  }

  function debug(line) {
    console.log('[proxxied-recorder]', line);
  }

  // ------------------------------------------------------------- entry record

  function entryWeight(entry) {
    return (
      (typeof entry.requestBody === 'string' ? entry.requestBody.length : 0) +
      (typeof entry.responseBody === 'string' ? entry.responseBody.length : 0) +
      (entry.requestJson ? JSON.stringify(entry.requestJson).length : 0) +
      (entry.responseJson ? JSON.stringify(entry.responseJson).length : 0)
    );
  }

  function record(entry) {
    entry.id = ++state.seq;
    entry.weight = entryWeight(entry);
    state.entries.push(entry);
    state.bodyChars += entry.weight;
    // learnFrom() has already extracted what matters from older entries, so
    // dropping their raw bodies is safe; the inventory keeps the shapes.
    while (state.entries.length > MAX_ENTRIES || (state.bodyChars > MAX_TOTAL_BODY_CHARS && state.entries.length > 1)) {
      const dropped = state.entries.shift();
      state.bodyChars -= dropped.weight || 0;
    }
    learnFrom(entry);
    document.dispatchEvent(new CustomEvent('proxxied-recorder-tick', { detail: stats() }));
    return entry;
  }

  function stats() {
    const endpoints = new Set();
    for (const e of state.entries) if (e.template) endpoints.add(`${e.method} ${e.template}`);
    return {
      count: state.entries.length,
      endpoints: endpoints.size,
      diffs: state.diffs.length,
      ids: state.ids,
      revealSecrets: state.revealSecrets,
    };
  }

  // Pull out everything that matters for the app's own data model as traffic
  // goes by: the project/owner/apikey triple, project_data snapshots, and a
  // diff for every write.
  function learnFrom(entry) {
    try {
      if (!entry.url || !entry.url.includes('/rest/v1/projects')) return;
      const u = new URL(entry.url, location.href);
      const owner = (u.searchParams.get('owner_user_id') || '').replace(/^eq\./, '');
      const projectId = (u.searchParams.get('id') || '').replace(/^eq\./, '');
      const apikey = (entry.requestHeaders && (entry.requestHeaders.apikey || entry.requestHeaders.Apikey)) || u.searchParams.get('apikey');
      if (owner && projectId && apikey && !String(apikey).startsWith('<redacted')) {
        state.ids = { ownerUserId: owner, projectId, supabaseOrigin: u.origin, apikey };
      }

      const rows = entry.responseJson;
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row && row.id && row.project_data) state.projectData.set(row.id, row.project_data);
        }
      }

      const isWrite = entry.method === 'PATCH' || entry.method === 'POST' || entry.method === 'PUT';
      if (isWrite && entry.requestJson && entry.requestJson.project_data) {
        const before = state.projectData.get(projectId) || null;
        const after = entry.requestJson.project_data;
        const diff = before ? diffProjectData(before, after) : [{ path: '', op: 'no-baseline', note: 'no prior read of this project to diff against' }];
        state.diffs.push({
          entryId: entry.id,
          at: entry.startedAt,
          projectId,
          method: entry.method,
          stack: entry.stack,
          changes: diff,
        });
        state.projectData.set(projectId, after);
        debug(`${entry.method} project_data -> ${diff.length} change(s)`);
      }
    } catch (e) {
      /* observation must never break the page */
    }
  }

  // ------------------------------------------------------------------- diffing

  // Cards are identified by uuid, so a diff keyed on uuid says "the UI added
  // these two objects" instead of "every index after 40 shifted".
  function diffProjectData(before, after) {
    const changes = [];
    diffValue(before, after, '', changes);
    return changes.slice(0, 500);
  }

  function isCardArray(v) {
    return Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === 'object' && typeof x.uuid === 'string');
  }

  function diffValue(a, b, path, out) {
    if (a === b) return;
    if (out.length > 500) return;

    if (isCardArray(a) || isCardArray(b)) {
      const mapA = new Map((a || []).map((c) => [c.uuid, c]));
      const mapB = new Map((b || []).map((c) => [c.uuid, c]));
      for (const [uuid, card] of mapB) {
        if (!mapA.has(uuid)) out.push({ path: `${path}[uuid=${uuid}]`, op: 'added', to: card });
        else diffValue(mapA.get(uuid), card, `${path}[uuid=${uuid}]`, out);
      }
      for (const [uuid, card] of mapA) {
        if (!mapB.has(uuid)) out.push({ path: `${path}[uuid=${uuid}]`, op: 'removed', from: card });
      }
      return;
    }

    const ta = Array.isArray(a) ? 'array' : a === null ? 'null' : typeof a;
    const tb = Array.isArray(b) ? 'array' : b === null ? 'null' : typeof b;
    if (ta !== tb) {
      out.push({ path, op: 'changed', from: a, to: b });
      return;
    }

    if (ta === 'array') {
      const n = Math.max(a.length, b.length);
      if (a.length !== b.length) out.push({ path, op: 'length', from: a.length, to: b.length });
      for (let i = 0; i < n; i++) diffValue(a[i], b[i], `${path}[${i}]`, out);
      return;
    }

    if (ta === 'object') {
      for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
        const has_a = a && Object.prototype.hasOwnProperty.call(a, k);
        const has_b = b && Object.prototype.hasOwnProperty.call(b, k);
        const p = path ? `${path}.${k}` : k;
        if (!has_a) out.push({ path: p, op: 'added', to: b[k] });
        else if (!has_b) out.push({ path: p, op: 'removed', from: a[k] });
        else diffValue(a[k], b[k], p, out);
      }
      return;
    }

    out.push({ path, op: 'changed', from: a, to: b });
  }

  // ---------------------------------------------------------------- profiling

  // Merges every observed instance of a value into one shape, tracking how
  // often each field is actually present. That optionality is the part a
  // single captured example can never tell you.
  function newNode() {
    return { n: 0, types: Object.create(null), props: null, item: null, samples: [] };
  }

  function profileAdd(node, value, depth) {
    depth = depth || 0;
    node.n++;
    const t = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    node.types[t] = (node.types[t] || 0) + 1;

    if (depth > MAX_DEPTH) return;

    if (t === 'array') {
      node.item = node.item || newNode();
      for (const v of value.slice(0, MAX_ARRAY_SAMPLES)) profileAdd(node.item, v, depth + 1);
      return;
    }
    if (t === 'object') {
      node.props = node.props || Object.create(null);
      for (const k of Object.keys(value)) {
        node.props[k] = node.props[k] || newNode();
        profileAdd(node.props[k], value[k], depth + 1);
      }
      return;
    }
    if (t !== 'null' && node.samples.length < 4) {
      const s = typeof value === 'string' && value.length > 80 ? value.slice(0, 80) + '...' : value;
      if (!node.samples.some((x) => x === s)) node.samples.push(s);
    }
  }

  function typeLabel(node) {
    return Object.keys(node.types)
      .sort((a, b) => node.types[b] - node.types[a])
      .join(' | ');
  }

  function samplesLabel(node) {
    return node.samples.length ? 'e.g. ' + node.samples.map((s) => JSON.stringify(s)).join(', ') : '';
  }

  function renderNode(node, indent) {
    const pad = '  '.repeat(indent);
    const lines = [];

    if (node.props) {
      for (const k of Object.keys(node.props).sort()) {
        const child = node.props[k];
        const optional = child.n < node.n;
        const meta = [];
        if (optional) meta.push(`present ${child.n}/${node.n}`);

        let label = typeLabel(child);
        let recurseInto = child.props ? child : null;
        if (child.item) {
          if (child.item.n === 0) label += ' (always empty)';
          else if (child.item.props) {
            label += ` of object (${child.item.n} seen)`;
            recurseInto = child.item;
          } else {
            label += ` of ${typeLabel(child.item)}`;
            const s = samplesLabel(child.item);
            if (s) meta.push(s);
          }
        } else {
          const s = samplesLabel(child);
          if (s) meta.push(s);
        }

        lines.push(`${pad}${k}${optional ? '?' : ''}: ${label}` + (meta.length ? `   // ${meta.join('; ')}` : ''));
        if (recurseInto) lines.push(...renderNode(recurseInto, indent + 1));
      }
      return lines;
    }

    if (node.item) {
      if (node.item.n === 0) return [`${pad}${typeLabel(node)} (always empty)`];
      if (node.item.props) {
        lines.push(`${pad}${typeLabel(node)} of object (${node.item.n} seen):`);
        lines.push(...renderNode(node.item, indent + 1));
        return lines;
      }
      const s = samplesLabel(node.item);
      return [`${pad}${typeLabel(node)} of ${typeLabel(node.item)}${s ? '   // ' + s : ''}`];
    }

    const s = samplesLabel(node);
    return [`${pad}${typeLabel(node)}${s ? '   // ' + s : ''}`];
  }

  // ------------------------------------------------------------ card profiles

  // The importer's whole risk is guessing the card object's shape. Merge every
  // card ever seen, split by role, so fronts/backs/singles each get a real
  // union schema with per-field optionality instead of a one-example guess.
  function profileCards() {
    const groups = {};
    const add = (role, card) => {
      groups[role] = groups[role] || newNode();
      profileAdd(groups[role], card, 0);
    };
    for (const data of state.projectData.values()) {
      const cards = data && data.cards;
      if (!Array.isArray(cards)) continue;
      for (const c of cards) {
        if (!c || typeof c !== 'object') continue;
        if (c.linkedBackId) add('front (has linkedBackId)', c);
        else if (c.linkedFrontId) add('back (has linkedFrontId)', c);
        else add('unlinked', c);
        if (c.isUserUpload) add('user upload', c);
        if (c.isToken) add('token', c);
      }
    }
    return groups;
  }

  // ------------------------------------------------------- endpoint inventory

  function inventory() {
    const map = new Map();
    for (const e of state.entries) {
      if (!e.template) continue;
      const key = `${e.method} ${e.origin}${e.template}`;
      let rec = map.get(key);
      if (!rec) {
        rec = {
          key,
          method: e.method,
          origin: e.origin,
          template: e.template,
          count: 0,
          statuses: {},
          queryParams: new Map(),
          requestHeaderNames: new Set(),
          reqProfile: newNode(),
          resProfile: newNode(),
          reqSamples: 0,
          resSamples: 0,
          sample: null,
          kinds: new Set(),
        };
        map.set(key, rec);
      }
      rec.count++;
      rec.kinds.add(e.kind);
      rec.statuses[e.status] = (rec.statuses[e.status] || 0) + 1;
      rec.sample = rec.sample || e;
      for (const name of Object.keys(e.requestHeaders || {})) rec.requestHeaderNames.add(name.toLowerCase());
      try {
        const u = new URL(e.url, location.href);
        u.searchParams.forEach((v, k) => {
          const seen = rec.queryParams.get(k) || new Set();
          if (seen.size < 4) seen.add(v.length > 60 ? v.slice(0, 60) + '...' : v);
          rec.queryParams.set(k, seen);
        });
      } catch (err) {
        /* non-absolute urls are fine to skip */
      }
      if (e.requestJson !== undefined && e.requestJson !== null) {
        profileAdd(rec.reqProfile, e.requestJson, 0);
        rec.reqSamples++;
      }
      if (e.responseJson !== undefined && e.responseJson !== null) {
        profileAdd(rec.resProfile, e.responseJson, 0);
        rec.resSamples++;
      }
    }
    return [...map.values()].sort((a, b) => (a.origin + a.template).localeCompare(b.origin + b.template) || a.method.localeCompare(b.method));
  }

  // ------------------------------------------------------------ fetch / XHR

  // Bound to window: this file is strict mode, so a strict-mode caller would
  // otherwise forward `this === undefined` into native fetch.
  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    let entry = null;
    let reqTextPromise = null;
    try {
      const req = input instanceof Request ? input : null;
      const url = req ? req.url : typeof input === 'string' ? input : input && input.url ? input.url : String(input);
      const method = ((init && init.method) || (req && req.method) || 'GET').toUpperCase();
      const u = new URL(url, location.href);
      const headers = new Headers((init && init.headers) || (req && req.headers) || {});
      const rawAuth = headers.get('authorization');
      if (rawAuth && /supabase\.co$/.test(u.hostname)) state.rawAuthorization = rawAuth;
      entry = {
        kind: 'fetch',
        startedAt: new Date().toISOString(),
        t0: performance.now(),
        method,
        url,
        origin: u.origin,
        path: u.pathname,
        template: pathTemplate(u.pathname),
        requestHeaders: headersToObject(headers),
        stack: callerStack(),
      };
      const rawBody = (init && init.body) || null;
      reqTextPromise = rawBody != null ? bodyToText(rawBody) : req && req.clone ? req.clone().text().catch(() => null) : Promise.resolve(null);
    } catch (e) {
      entry = null;
    }

    const promise = originalFetch.apply(this, arguments);
    if (!entry) return promise;

    promise.then(
      async (response) => {
        // Clone synchronously, before any await: the page's own code may read
        // the body first, and clone() on a disturbed Response throws - which
        // is how the importer's PATCH response went unrecorded.
        let clone = null;
        let cloneError = null;
        try {
          clone = response.clone();
        } catch (err) {
          cloneError = String(err && err.message);
        }
        try {
          const reqText = await reqTextPromise;
          const parsedReq = parseBody(reqText, entry.requestHeaders['content-type']);
          entry.requestBody = parsedReq.body;
          entry.requestJson = parsedReq.json;
          entry.status = response.status;
          entry.responseHeaders = headersToObject(response.headers);
          entry.durationMs = Math.round(performance.now() - entry.t0);
          const ct = response.headers.get('content-type') || '';
          if (!clone) {
            entry.responseBody = `<body not captured: ${cloneError || 'response already consumed'}>`;
          } else if (/json|text|xml|javascript/i.test(ct) || ct === '') {
            const text = await clone.text().catch(() => null);
            const parsed = parseBody(text, ct);
            entry.responseBody = parsed.body;
            entry.responseJson = parsed.json;
            entry.responseTruncated = parsed.truncated;
          } else {
            entry.responseBody = `<${ct || 'binary'}>`;
          }
        } catch (e) {
          entry.error = String(e && e.message);
        }
        delete entry.t0;
        record(entry);
      },
      (err) => {
        entry.status = 0;
        entry.error = String(err && err.message);
        entry.durationMs = Math.round(performance.now() - entry.t0);
        delete entry.t0;
        record(entry);
      }
    );

    return promise;
  };

  const OrigXHR = window.XMLHttpRequest;
  const xhrOpen = OrigXHR.prototype.open;
  const xhrSend = OrigXHR.prototype.send;
  const xhrSetHeader = OrigXHR.prototype.setRequestHeader;

  OrigXHR.prototype.open = function (method, url) {
    this.__px = { method: String(method || 'GET').toUpperCase(), url: String(url), headers: {} };
    return xhrOpen.apply(this, arguments);
  };
  OrigXHR.prototype.setRequestHeader = function (name, value) {
    if (this.__px) {
      this.__px.headers[name] = redactHeaderValue(name, value);
      if (String(name).toLowerCase() === 'authorization' && /supabase\.co/.test(this.__px.url)) {
        state.rawAuthorization = value;
      }
    }
    return xhrSetHeader.apply(this, arguments);
  };
  OrigXHR.prototype.send = function (body) {
    const px = this.__px;
    if (px) {
      const t0 = performance.now();
      const startedAt = new Date().toISOString();
      const stack = callerStack();
      this.addEventListener('loadend', async () => {
        try {
          const u = new URL(px.url, location.href);
          const reqText = await bodyToText(body);
          const parsedReq = parseBody(reqText, px.headers['Content-Type'] || px.headers['content-type']);
          let respText = null;
          try {
            respText = this.responseType === '' || this.responseType === 'text' ? this.responseText : `<responseType=${this.responseType}>`;
          } catch (e) {
            respText = `<unreadable: ${e && e.message}>`;
          }
          const ct = (this.getResponseHeader && this.getResponseHeader('content-type')) || '';
          const parsedResp = parseBody(respText, ct);
          record({
            kind: 'xhr',
            startedAt,
            method: px.method,
            url: px.url,
            origin: u.origin,
            path: u.pathname,
            template: pathTemplate(u.pathname),
            requestHeaders: px.headers,
            requestBody: parsedReq.body,
            requestJson: parsedReq.json,
            status: this.status,
            responseBody: parsedResp.body,
            responseJson: parsedResp.json,
            durationMs: Math.round(performance.now() - t0),
            stack,
          });
        } catch (e) {
          /* ignore */
        }
      });
    }
    return xhrSend.apply(this, arguments);
  };

  const origBeacon = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
  if (origBeacon) {
    navigator.sendBeacon = function (url, data) {
      bodyToText(data).then((text) => {
        try {
          const u = new URL(url, location.href);
          const parsed = parseBody(text, 'application/json');
          record({
            kind: 'beacon',
            startedAt: new Date().toISOString(),
            method: 'POST',
            url: String(url),
            origin: u.origin,
            path: u.pathname,
            template: pathTemplate(u.pathname),
            requestHeaders: {},
            requestBody: parsed.body,
            requestJson: parsed.json,
            status: 0,
            stack: callerStack(),
          });
        } catch (e) {
          /* ignore */
        }
      });
      return origBeacon(url, data);
    };
  }

  // ------------------------------------------------------------- WebSocket

  // Subclassing (rather than the usual wrapper function) keeps `instanceof`
  // and the readyState constants intact for the app's own code.
  const OrigWS = window.WebSocket;
  const wsFrames = [];
  state.wsFrames = wsFrames;

  function recordFrame(url, dir, data) {
    let payload = typeof data === 'string' ? data : `<binary ${(data && (data.byteLength || data.size)) || '?'} bytes>`;
    let json = null;
    if (typeof payload === 'string') {
      if (payload.length > MAX_BODY_CHARS) payload = payload.slice(0, MAX_BODY_CHARS) + '...';
      try {
        json = redactBody(JSON.parse(payload));
      } catch (e) {
        /* phoenix heartbeats etc. may not be json */
      }
    }
    wsFrames.push({ at: new Date().toISOString(), url, dir, json, raw: json ? undefined : payload });
    if (wsFrames.length > MAX_ENTRIES) wsFrames.shift();
  }

  class RecordingWebSocket extends OrigWS {
    constructor(url, protocols) {
      protocols === undefined ? super(url) : super(url, protocols);
      const u = String(url);
      recordFrame(u, 'open', `protocols=${JSON.stringify(protocols || null)}`);
      this.addEventListener('message', (ev) => recordFrame(u, 'recv', ev.data));
      this.addEventListener('close', (ev) => recordFrame(u, 'close', `code=${ev.code} reason=${ev.reason}`));
      this.__pxUrl = u;
    }
    send(data) {
      recordFrame(this.__pxUrl, 'send', data);
      return super.send(data);
    }
  }
  Object.defineProperty(RecordingWebSocket, 'name', { value: 'WebSocket' });
  window.WebSocket = RecordingWebSocket;

  // ----------------------------------------------------- active: bundle scan

  // The app's own JS bundle names every table, RPC, storage bucket and REST
  // path it can reach - including the ones the UI never happened to call while
  // recording. Scraping it turns a sample of observed traffic into something
  // closer to the full surface.
  async function scanBundles() {
    const urls = new Set();
    for (const s of document.querySelectorAll('script[src]')) urls.add(new URL(s.src, location.href).href);
    try {
      for (const r of performance.getEntriesByType('resource')) {
        if (/\.js(\?|$)/.test(r.name)) urls.add(r.name);
      }
    } catch (e) {
      /* resource timing is best-effort */
    }

    const result = {
      scannedAt: new Date().toISOString(),
      scripts: [],
      apiPaths: new Set(),
      restPaths: new Set(),
      tables: new Set(),
      rpcs: new Set(),
      buckets: new Set(),
      channels: new Set(),
      supabaseOrigins: new Set(),
      anonKeys: new Set(),
      decoderCalls: 0,
    };

    for (const url of urls) {
      if (!/^https?:/.test(url)) continue;
      try {
        const resp = await originalFetch(url);
        if (!resp.ok) continue;
        const text = await resp.text();
        result.scripts.push({ url, bytes: text.length });

        const grab = (re, set, group) => {
          let m;
          while ((m = re.exec(text)) !== null) {
            const v = group ? m[group] : m[0];
            if (v && v.length < 200) set.add(v);
          }
        };
        // proxxied.com ships obfuscated: string literals are split and pulled
        // from an encoded lookup table, e.g.
        //   fetch(S('/api/accou' + av(0x206,'yN(y')))
        // so a literal grep yields truncated fragments and misses table/rpc
        // names entirely. Count the decoder call signature to say so plainly.
        const decoderCalls = (text.match(/\w{1,3}\(0x[0-9a-f]{2,}\s*,\s*['"`]/g) || []).length;
        result.decoderCalls += decoderCalls;

        grab(/\/api\/[A-Za-z0-9_\-\/\.]+/g, result.apiPaths);
        grab(/\/rest\/v1\/[A-Za-z0-9_]*/g, result.restPaths);
        // Table names are snake_case; requiring that filters out matches like
        // `.from("getAllResponseHeaders")` off unrelated objects.
        grab(/\.from\(\s*["'`]([a-z][a-z0-9_]*)["'`]/g, result.tables, 1);
        grab(/\.rpc\(\s*["'`]([a-z][a-z0-9_]*)["'`]/g, result.rpcs, 1);
        grab(/storage\s*\.\s*from\(\s*["'`]([A-Za-z0-9_\-]+)["'`]/g, result.buckets, 1);
        grab(/\.channel\(\s*["'`]([^"'`]+)["'`]/g, result.channels, 1);
        grab(/https:\/\/[a-z0-9]+\.supabase\.co/g, result.supabaseOrigins);
        grab(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, result.anonKeys);
      } catch (e) {
        result.scripts.push({ url, error: String(e && e.message) });
      }
    }

    const keys = [...result.anonKeys].map((k) => ({
      key: state.revealSecrets ? k : k.slice(0, 12) + '...' + k.slice(-6),
      claims: describeJwt(k),
    }));

    const obfuscated = result.decoderCalls > 50;
    state.bundleScan = {
      scannedAt: result.scannedAt,
      scripts: result.scripts,
      obfuscated,
      decoderCalls: result.decoderCalls,
      traffic: surfaceFromTraffic(),
      apiPaths: [...result.apiPaths].sort(),
      restPaths: [...result.restPaths].sort(),
      tables: [...result.tables].sort(),
      rpcs: [...result.rpcs].sort(),
      buckets: [...result.buckets].sort(),
      channels: [...result.channels].sort(),
      supabaseOrigins: [...result.supabaseOrigins].sort(),
      keys,
    };
    emit(
      `Scanned ${result.scripts.length} scripts: ${state.bundleScan.tables.length} tables, ` +
        `${state.bundleScan.rpcs.length} RPCs, ${state.bundleScan.apiPaths.length} API paths.`
    );
    if (obfuscated) {
      emit(
        `⚠ The app's code is obfuscated, so those results are unreliable. Using what the traffic showed ` +
          `instead: ${state.bundleScan.traffic.tables.length} tables, ${state.bundleScan.traffic.rpcs.length} RPCs.`
      );
    }
    return state.bundleScan;
  }

  // ------------------------------------------- active: PostgREST OpenAPI spec

  // PostgREST self-documents: a GET at the REST root returns a Swagger doc
  // describing every table and column the anon key can see. This is the
  // authoritative schema, as opposed to whatever the UI happened to send.
  async function probeOpenApi() {
    if (!state.ids) throw new Error('no Supabase apikey observed yet - load a project first');
    const { supabaseOrigin, apikey } = state.ids;
    const resp = await originalFetch(`${supabaseOrigin}/rest/v1/`, {
      headers: { apikey, accept: 'application/openapi+json' },
    });
    const text = await resp.text();
    if (!resp.ok) {
      // Supabase's newer `sb_publishable_...` keys are refused here ("Secret API
      // key required"), so this probe is a dead end on such projects.
      const surface = surfaceFromTraffic();
      state.openapi = {
        probedAt: new Date().toISOString(),
        unavailable: `HTTP ${resp.status} ${text.slice(0, 200)}`,
        trafficFallback: surface,
      };
      emit(`Schema unavailable (HTTP ${resp.status}) - this key can't read it.`);
      emit(`Using what the traffic showed: ${surface.tables.length} tables, ${surface.rpcs.length} RPCs.`);
      return state.openapi;
    }
    const spec = JSON.parse(text);

    const tables = {};
    for (const [name, def] of Object.entries(spec.definitions || {})) {
      tables[name] = Object.entries(def.properties || {}).map(([col, meta]) => ({
        column: col,
        type: meta.format || meta.type,
        description: meta.description,
        required: (def.required || []).includes(col),
      }));
    }
    const rpcs = Object.keys(spec.paths || {}).filter((p) => p.startsWith('/rpc/'));

    state.openapi = { probedAt: new Date().toISOString(), host: spec.host, tables, rpcs };
    emit(`Schema: ${Object.keys(tables).length} tables, ${rpcs.length} RPC endpoints.`);
    return state.openapi;
  }

  // ------------------------------------------------------ auth model snapshot

  function inspectAuth() {
    const notes = { at: new Date().toISOString(), localStorageKeys: [], sessions: [], cookieNames: [] };
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        notes.localStorageKeys.push(k);
        if (/^sb-|supabase/i.test(k)) {
          try {
            const v = JSON.parse(localStorage.getItem(k));
            const token = v && (v.access_token || (v.currentSession && v.currentSession.access_token));
            notes.sessions.push({
              key: k,
              claims: token ? describeJwt(token) : null,
              hasRefreshToken: !!(v && (v.refresh_token || (v.currentSession && v.currentSession.refresh_token))),
              user: v && v.user ? { id: v.user.id, role: v.user.role, aud: v.user.aud } : undefined,
            });
          } catch (e) {
            notes.sessions.push({ key: k, note: 'value is not JSON' });
          }
        }
      }
    } catch (e) {
      notes.error = String(e && e.message);
    }
    try {
      notes.cookieNames = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean);
    } catch (e) {
      /* ignore */
    }
    state.authNotes = notes;
    return notes;
  }

  // Every Supabase call the app makes carries the user's JWT; requests with
  // only the publishable apikey are unauthenticated and RLS returns nothing.
  // Prefer a token seen on real traffic, fall back to the supabase-js session.
  function getAccessToken() {
    if (state.rawAuthorization) return String(state.rawAuthorization).replace(/^Bearer\s+/i, '');
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!/^sb-.*-auth-token$/.test(k)) continue;
        const v = JSON.parse(localStorage.getItem(k));
        const token = v && (v.access_token || (v.currentSession && v.currentSession.access_token));
        if (token) return token;
      }
    } catch (e) {
      /* no session available */
    }
    return null;
  }
  state.getAccessToken = getAccessToken;

  // Tables and RPCs actually exercised by the app. Unlike the bundle scan this
  // cannot be defeated by obfuscation, because it reads the URLs that were
  // really requested.
  function surfaceFromTraffic() {
    const tables = new Set();
    const rpcs = new Set();
    for (const e of state.entries) {
      const m = /\/rest\/v1\/(rpc\/)?([A-Za-z0-9_]+)/.exec(e.path || '');
      if (!m) continue;
      if (m[1]) rpcs.add(m[2]);
      else tables.add(m[2]);
    }
    return { tables: [...tables].sort(), rpcs: [...rpcs].sort() };
  }

  // --------------------------------------------------------------- reporting

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildJson() {
    return {
      capturedAt: new Date().toISOString(),
      pageUrl: location.href,
      secretsRevealed: state.revealSecrets,
      ids: state.ids,
      auth: state.authNotes || inspectAuth(),
      bundleScan: state.bundleScan,
      openapi: state.openapi,
      entries: state.entries,
      wsFrames,
      projectDataWrites: state.diffs,
      projectDataSnapshots: [...state.projectData.entries()].map(([id, data]) => ({ id, data })),
    };
  }

  function fence(lines) {
    return '```\n' + (Array.isArray(lines) ? lines.join('\n') : lines) + '\n```';
  }

  function buildMarkdown() {
    const auth = state.authNotes || inspectAuth();
    const inv = inventory();
    const out = [];

    out.push('# Proxxied API Reference (captured)');
    out.push('');
    out.push(`Captured ${new Date().toISOString()} from \`${location.href}\` by the Proxxied Pair Importer extension.`);
    out.push(state.revealSecrets ? '\n> **Secret values are NOT redacted in this file.**' : '\nSecret header/body values are redacted; JWT claims are kept because the role matters.');
    out.push('');

    out.push('## Origins and identity');
    out.push('');
    if (state.ids) {
      out.push(`- Supabase origin: \`${state.ids.supabaseOrigin}\``);
      out.push(`- Project id: \`${state.ids.projectId}\``);
      out.push(`- Owner user id: \`${state.ids.ownerUserId}\``);
      out.push(`- anon apikey claims: \`${JSON.stringify(describeJwt(state.ids.apikey))}\``);
    } else {
      out.push('- _no Supabase project traffic observed yet_');
    }
    const origins = [...new Set(state.entries.map((e) => e.origin))].sort();
    out.push(`- Origins contacted: ${origins.map((o) => '`' + o + '`').join(', ') || '_none_'}`);
    out.push('');

    out.push('## Auth model');
    out.push('');
    out.push(`- Cookies present: ${auth.cookieNames.length ? auth.cookieNames.map((c) => '`' + c + '`').join(', ') : '_none_'}`);
    for (const s of auth.sessions) {
      out.push(`- localStorage \`${s.key}\`: claims \`${JSON.stringify(s.claims)}\`, refresh token ${s.hasRefreshToken ? 'present' : 'absent'}`);
    }
    if (!auth.sessions.length) out.push('- _no Supabase session found in localStorage (anon-only access)_');
    const sbEntries = state.entries.filter((e) => /supabase\.co$/.test((e.origin || '').replace(/^https?:\/\//, '')));
    const withAuth = sbEntries.filter((e) => Object.keys(e.requestHeaders || {}).some((h) => h.toLowerCase() === 'authorization'));
    if (sbEntries.length) {
      out.push('');
      out.push(
        `- **${withAuth.length} of ${sbEntries.length}** observed Supabase calls sent an \`authorization\` header.`
      );
      if (withAuth.length === sbEntries.length) {
        out.push(
          '- Every call is authenticated as the user. The `apikey` alone identifies the project, not a person: ' +
            'a request carrying only `apikey` is anonymous, and RLS returns an empty result (HTTP 200 `[]`) ' +
            'rather than an error. A write that matches no rows looks exactly like a successful write.'
        );
      }
    }
    out.push('');

    out.push('## Endpoint inventory');
    out.push('');
    out.push('| Method | Endpoint | Calls | Statuses |');
    out.push('|---|---|---|---|');
    for (const r of inv) {
      out.push(`| \`${r.method}\` | \`${r.origin}${r.template}\` | ${r.count} | ${Object.entries(r.statuses).map(([s, n]) => `${s}×${n}`).join(', ')} |`);
    }
    out.push('');

    out.push('## Endpoint detail');
    out.push('');
    for (const r of inv) {
      out.push(`### \`${r.method} ${r.template}\``);
      out.push('');
      out.push(`Host: \`${r.origin}\` · calls: ${r.count} · via: ${[...r.kinds].join(', ')}`);
      out.push('');
      if (r.queryParams.size) {
        out.push('**Query params observed:**');
        out.push('');
        for (const [k, vals] of [...r.queryParams.entries()].sort()) {
          out.push(`- \`${k}\` — e.g. ${[...vals].map((v) => '`' + v + '`').join(', ')}`);
        }
        out.push('');
      }
      const hdrs = [...r.requestHeaderNames].sort();
      if (hdrs.length) {
        out.push(`**Request headers:** ${hdrs.map((h) => '`' + h + '`').join(', ')}`);
        out.push('');
      }
      if (r.reqSamples) {
        out.push(`**Request body shape** (${r.reqSamples} sample(s)):`);
        out.push('');
        out.push(fence(renderNode(r.reqProfile, 0)));
        out.push('');
      }
      if (r.resSamples) {
        out.push(`**Response body shape** (${r.resSamples} sample(s)):`);
        out.push('');
        out.push(fence(renderNode(r.resProfile, 0)));
        out.push('');
      }
      if (r.sample && r.sample.stack) {
        out.push(`_Called from:_ \`${r.sample.stack.slice(0, 200)}\``);
        out.push('');
      }
    }

    const cardGroups = profileCards();
    if (Object.keys(cardGroups).length) {
      out.push('## `project_data.cards[]` schema');
      out.push('');
      out.push('Merged across every card observed in every `project_data` snapshot, split by role.');
      out.push('A `?` marks a field that is absent from at least one observed card of that role.');
      out.push('');
      for (const [role, node] of Object.entries(cardGroups)) {
        out.push(`### ${role} — ${node.n} card(s)`);
        out.push('');
        out.push(fence(renderNode(node, 0)));
        out.push('');
      }
    }

    if (state.diffs.length) {
      out.push('## Observed writes to `project_data`');
      out.push('');
      out.push('What the app itself changed, per save. This is the ground truth for what a UI action actually writes.');
      out.push('');
      for (const d of state.diffs) {
        out.push(`### ${d.method} at ${d.at} — ${d.changes.length} change(s)`);
        out.push('');
        out.push(fence(JSON.stringify(d.changes, null, 2).slice(0, 20000)));
        out.push('');
      }
    }

    if (state.bundleScan) {
      const b = state.bundleScan;
      out.push('## Surface found in the JS bundle');
      out.push('');
      out.push(`Scanned ${b.scripts.length} script(s) at ${b.scannedAt}.`);
      out.push('');
      if (b.obfuscated) {
        out.push(
          `> ⚠ **The bundle is obfuscated** (${b.decoderCalls} string-table decoder calls). Literals are split ` +
            "and resolved at runtime, e.g. ``fetch(S('/api/accou' + av(0x206,'yN(y')))``. Everything scraped " +
            'statically below is therefore fragmentary — truncated paths, missing table and RPC names. ' +
            'Trust the traffic-derived surface and the endpoint inventory instead.'
        );
        out.push('');
      }
      if (b.traffic) {
        out.push('**Tables actually requested (from traffic — reliable):**');
        out.push('');
        out.push(b.traffic.tables.length ? b.traffic.tables.map((t) => '- `' + t + '`').join('\n') : '_none_');
        out.push('');
        out.push('**RPCs actually called (from traffic — reliable):**');
        out.push('');
        out.push(b.traffic.rpcs.length ? b.traffic.rpcs.map((r) => '- `' + r + '`').join('\n') : '_none_');
        out.push('');
        out.push('**Scraped statically (unreliable when obfuscated):**');
        out.push('');
      }
      const list = (label, arr) => {
        out.push(`**${label}** (${arr.length}):`);
        out.push('');
        out.push(arr.length ? arr.map((x) => '- `' + x + '`').join('\n') : '_none found_');
        out.push('');
      };
      list('Supabase tables (`.from(...)`)', b.tables);
      list('RPC functions (`.rpc(...)`)', b.rpcs);
      list('Storage buckets', b.buckets);
      list('Realtime channels', b.channels);
      list('REST paths', b.restPaths);
      list('`/api/...` paths', b.apiPaths);
      if (b.keys.length) {
        out.push('**Embedded JWTs:**');
        out.push('');
        for (const k of b.keys) out.push(`- \`${k.key}\` — claims \`${JSON.stringify(k.claims)}\``);
        out.push('');
      }
    }

    if (state.openapi && state.openapi.unavailable) {
      out.push('## PostgREST schema (OpenAPI)');
      out.push('');
      out.push(`Probed ${state.openapi.probedAt} — **unavailable**: \`${state.openapi.unavailable}\``);
      out.push('');
      out.push(
        'Supabase\'s newer `sb_publishable_...` keys cannot read the PostgREST root, so the authoritative ' +
          'schema is out of reach with what the browser has. The table list above, derived from real traffic, ' +
          'is the best available substitute.'
      );
      out.push('');
    } else if (state.openapi) {
      out.push('## PostgREST schema (OpenAPI)');
      out.push('');
      out.push(`Probed ${state.openapi.probedAt} at host \`${state.openapi.host}\`. These are the tables and columns the anon key can see.`);
      out.push('');
      for (const [table, cols] of Object.entries(state.openapi.tables).sort()) {
        out.push(`### \`${table}\``);
        out.push('');
        out.push('| Column | Type | Required | Notes |');
        out.push('|---|---|---|---|');
        for (const c of cols) {
          out.push(`| \`${c.column}\` | ${c.type || ''} | ${c.required ? 'yes' : ''} | ${(c.description || '').replace(/\n/g, ' ').slice(0, 120)} |`);
        }
        out.push('');
      }
      if (state.openapi.rpcs.length) {
        out.push('### RPC endpoints');
        out.push('');
        out.push(state.openapi.rpcs.map((r) => '- `POST /rest/v1' + r + '`').join('\n'));
        out.push('');
      }
    }

    if (wsFrames.length) {
      out.push('## Realtime WebSocket');
      out.push('');
      out.push(`${wsFrames.length} frame(s) captured.`);
      out.push('');
      out.push(fence(JSON.stringify(wsFrames.slice(0, 60), null, 2).slice(0, 30000)));
      out.push('');
    }

    return out.join('\n');
  }

  // ------------------------------------------------------------- command bus

  document.addEventListener('proxxied-recorder-command', async (ev) => {
    const { command, arg } = ev.detail || {};
    try {
      switch (command) {
        case 'stats':
          document.dispatchEvent(new CustomEvent('proxxied-recorder-tick', { detail: stats() }));
          break;
        case 'reveal':
          state.revealSecrets = !!arg;
          emit(`Secret values will now be ${arg ? 'INCLUDED IN' : 'redacted from'} exports.`);
          break;
        case 'scan':
          emit('Scanning the app\'s code...');
          await scanBundles();
          break;
        case 'openapi':
          emit('Requesting the database schema...');
          await probeOpenApi();
          break;
        case 'auth':
          inspectAuth();
          emit(`Found ${state.authNotes.sessions.length} session(s) and ${state.authNotes.cookieNames.length} cookie(s).`);
          break;
        case 'export-json':
          download(`proxxied-capture-${Date.now()}.json`, JSON.stringify(buildJson(), null, 2));
          emit(`Downloaded the capture (${state.entries.length} requests).`);
          break;
        case 'export-md':
          download(`proxxied.api-${Date.now()}.md`, buildMarkdown(), 'text/markdown');
          emit('Downloaded the API report.');
          break;
        case 'clear':
          state.entries.length = 0;
          state.diffs.length = 0;
          wsFrames.length = 0;
          state.seq = 0;
          state.bodyChars = 0;
          emit('Cleared the recording.');
          break;
        default:
          debug(`unknown command: ${command}`);
      }
    } catch (e) {
      emit(`✗ ${e && e.message}`);
    }
    document.dispatchEvent(new CustomEvent('proxxied-recorder-tick', { detail: stats() }));
  });

  console.log('[proxxied-recorder] armed at document_start; recording fetch/XHR/beacon/WebSocket');
})();
