// The importer. Runs in the page's own JS realm (world: "MAIN") so its fetch()
// calls are indistinguishable from the app's own - same real tab, same
// Cloudflare-passed session, no automation fingerprint.
//
// All network observation now lives in recorder.js, which loads first and
// records everything; this file just reads what the recorder learned.
(function () {
  'use strict';

  const recorder = window.__proxxiedRecorder;

  // Two channels: emit() reaches the popup and the on-page overlay, debug()
  // only the console. Anything that is an internal detail - URLs, raw bodies,
  // token fragments, uuids - belongs in debug().
  function emit(line) {
    document.dispatchEvent(new CustomEvent('proxxied-import-progress', { detail: { line } }));
  }

  function debug(line) {
    console.log('[proxxied-importer]', line);
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function fetchScryfallCard(set, number) {
    const r = await fetch(`https://api.proxxied.com/api/scryfall/cards/${set}/${number}?lang=en`);
    if (!r.ok) throw new Error(`Scryfall lookup failed for ${set.toUpperCase()}-${number}: HTTP ${r.status}`);
    return r.json();
  }

  // A double-faced card's printing has its faces under card_faces; a normal
  // single-faced printing has them at the top level.
  function faceOf(data, wantBack) {
    if (Array.isArray(data.card_faces) && data.card_faces.length > 1) {
      return Object.assign({}, data, data.card_faces[wantBack ? 1 : 0]);
    }
    return data;
  }

  // Scryfall's own image_uris carry a cache-busting query (`....png?1783942703`).
  // Observed in a real write, the app splits them: `imageId` is the URL with the
  // query stripped, `imageUrl` (when the card has one at all) is the URL intact.
  function pngOf(data) {
    const uris = data.image_uris || (data.card_faces && data.card_faces[0] && data.card_faces[0].image_uris);
    return uris && (uris.png || uris.large || uris.normal);
  }

  function stripQuery(url) {
    return typeof url === 'string' ? url.split('?')[0] : url;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Scryfall's collection endpoint takes 75 identifiers per request, so a
  // 300-pair batch needs 8 calls instead of 600. It is reached directly
  // rather than through proxxied's passthrough: that passthrough exists to
  // dodge proxxied's own Cloudflare, which has nothing to do with Scryfall,
  // and the two return the same fields. Anything Scryfall cannot match falls
  // back to the passthrough, so a numbering disagreement degrades rather than
  // fails.
  const COLLECTION_CHUNK = 75;

  const printingKey = (set, number) => `${String(set).toLowerCase()}|${String(number).toLowerCase()}`;

  async function fetchPrintings(pairs) {
    const wanted = new Map();
    for (const pair of pairs) {
      for (const side of [pair.front, pair.back]) {
        wanted.set(printingKey(side.set, side.number), {
          set: String(side.set).toLowerCase(),
          collector_number: String(side.number),
        });
      }
    }
    const ids = [...wanted.values()];
    const byKey = new Map();
    const notFound = [];

    emit(`Looking up ${ids.length} printings...`);
    for (let i = 0; i < ids.length; i += COLLECTION_CHUNK) {
      const chunk = ids.slice(i, i + COLLECTION_CHUNK);
      const r = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ identifiers: chunk }),
      });
      if (!r.ok) {
        throw new Error(`Scryfall collection lookup failed: HTTP ${r.status} (${chunk.length} identifiers)`);
      }
      const body = await r.json();
      for (const card of body.data || []) byKey.set(printingKey(card.set, card.collector_number), card);
      for (const nf of body.not_found || []) notFound.push(nf);
      debug(`  ...${Math.min(i + COLLECTION_CHUNK, ids.length)}/${ids.length} printings`);
      if (i + COLLECTION_CHUNK < ids.length) await sleep(100); // Scryfall asks for ~100ms between requests
    }

    // Fall back to proxxied's per-card passthrough for anything unmatched.
    for (const nf of notFound) {
      try {
        const card = await fetchScryfallCard(nf.set, nf.collector_number);
        byKey.set(printingKey(nf.set, nf.collector_number), card);
        emit(`Recovered ${nf.set.toUpperCase()}-${nf.collector_number} from proxxied.`);
      } catch (e) {
        emit(`⚠ ${nf.set.toUpperCase()}-${nf.collector_number} not found.`);
      }
    }
    return byKey;
  }

  // The app POSTs each image URL here before referencing it, which warms
  // proxxied's own CDN copy. No auth: just a JSON content-type. The endpoint
  // takes an array, so a whole batch goes in a handful of calls - chunked
  // because nothing is known about its size limit.
  const SEED_CHUNK = 100;

  const verboseBatch = (pairs) => pairs.length <= 20;

  async function seedImages(urls) {
    const list = [...new Set(urls.filter(Boolean).map(stripQuery))];
    if (!list.length) return;
    let ok = 0;
    for (let i = 0; i < list.length; i += SEED_CHUNK) {
      const chunk = list.slice(i, i + SEED_CHUNK);
      try {
        const r = await fetch('https://api.proxxied.com/api/cards/images/seed-urls', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ urls: chunk }),
        });
        const body = await r.json().catch(() => null);
        if (r.ok) ok += chunk.length;
        debug(`  seeded ${chunk.length} image url(s): HTTP ${r.status} ${body ? JSON.stringify(body) : ''}`);
      } catch (e) {
        emit(`⚠ Could not pre-cache ${chunk.length} image(s); they may load slowly at first.`);
      }
    }
    return ok;
  }

  // ------------------------------------------------------- card construction
  //
  // Rather than reconstructing the card object from a single observed example,
  // clone a real card that the app itself wrote into this project and swap in
  // the new printing's values. Every field we don't understand is carried over
  // verbatim from a card the app is already happy with, which is the whole
  // reason the recorder exists.

  // Anything listed here is recomputed from the new printing. Anything not
  // listed is copied from the template card as-is.
  const FIELD_SOURCES = {
    cmc: (d) => d.cmc,
    set: (d, ctx) => ctx.side.set,
    number: (d, ctx) => ctx.side.number,
    // Each face is a different printing with its own name. The pair line may
    // override it per side; otherwise Scryfall is authoritative.
    name: (d, ctx) => ctx.side.name || d.name,
    lang: (d) => d.lang || 'en',
    colors: (d) => d.colors || [],
    rarity: (d) => d.rarity,
    mana_cost: (d) => d.mana_cost,
    type_line: (d) => d.type_line,
    oracle_text: (d) => d.oracle_text,
    layout: (d) => d.layout,
    color_identity: (d) => d.color_identity || [],
    // Display state, not printing data: observed writes create cards with
    // isFlipped false, and it only becomes true when a user flips one.
    isFlipped: () => false,
    imageId: (d) => stripQuery(pngOf(d)),
    scryfall_id: (d) => d.id,
    scryfallId: (d) => d.id,
    id: (d) => d.id,
    artist: (d) => d.artist,
    collector_number: (d) => d.collector_number,
    set_name: (d) => d.set_name,
    released_at: (d) => d.released_at,
    // scryfall_meta uses short key names for the same values.
    ci: (d) => d.color_identity || [],
    type: (d) => d.type_line,
    oracle: (d) => d.oracle_text,
  };

  // Fields that identify this specific card instance rather than the printing;
  // the caller supplies them explicitly.
  const INSTANCE_FIELDS = new Set(['uuid', 'order', 'linkedFrontId', 'linkedBackId']);

  // For a field we have no Scryfall source for, the question is whether it is a
  // per-card constant (`source: "scryfall"`, `category: "Mainboard"`) that must
  // be carried, or content belonging to the template card that would be wrong
  // to copy. Every card of the same role in the project answers that: a value
  // that never varies is a constant, one that varies is content.
  function collectLeaves(obj, path, out) {
    for (const k of Object.keys(obj)) {
      const full = path ? `${path}.${k}` : k;
      const v = obj[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        collectLeaves(v, full, out);
      } else {
        let seen = out.get(full);
        if (!seen) out.set(full, (seen = { vals: new Set(), n: 0 }));
        seen.n++;
        if (seen.vals.size < 5) seen.vals.add(JSON.stringify(v));
      }
    }
  }

  function constantFields(group) {
    const leaves = new Map();
    for (const c of group) collectLeaves(c, '', leaves);
    const consts = new Map();
    // With a single example every field trivially has one distinct value, so
    // "constant" would mean "everything" and the template's own content -
    // image hashes, flip state - would ride along onto every new card. Two
    // examples are the minimum that can distinguish a constant from content.
    if (group.length >= 2) {
      for (const [path, seen] of leaves) {
        // Present on every card AND never varying. Requiring full presence
        // matters: a field only one card carries (dfc image hashes, say) has
        // exactly one distinct value and would otherwise look constant.
        if (seen.n === group.length && seen.vals.size === 1) {
          consts.set(path, [...seen.vals][0]); // kept as JSON text; parsed per use
        }
      }
    }
    return { consts, sampleCount: group.length };
  }

  function rebuildFrom(template, data, ctx, path, carried, dropped) {
    const out = {};
    for (const key of Object.keys(template)) {
      const full = path ? `${path}.${key}` : key;
      const tv = template[key];

      if (INSTANCE_FIELDS.has(key)) continue; // set by the caller

      // Only present on cards that have it; rebuildFrom copies the template's
      // key set, so a template without imageUrl produces cards without one.
      if (key === 'imageUrl') {
        out[key] = pngOf(data) || tv;
        continue;
      }

      if (FIELD_SOURCES[key]) {
        const v = FIELD_SOURCES[key](data, ctx);
        out[key] = v === undefined ? null : v;
        continue;
      }

      if (tv && typeof tv === 'object' && !Array.isArray(tv)) {
        const rebuilt = rebuildFrom(tv, data, ctx, full, carried, dropped);
        // If every child was dropped as template-specific, an empty object is
        // not a meaningful value - omit the key entirely.
        if (Object.keys(rebuilt).length || !Object.keys(tv).length) out[key] = rebuilt;
        continue;
      }

      // Unknown field: carry it only if every card of this role agrees on it.
      const analysis = ctx.constants;
      if (analysis.consts.has(full)) {
        out[key] = JSON.parse(analysis.consts.get(full));
        carried.push(`${full}=${analysis.consts.get(full).slice(0, 30)}`);
      } else if (analysis.sampleCount < 2) {
        // Only one example, so "constant" is unknowable. Flags are still safe;
        // a content string is not.
        const isFlagLike = typeof tv === 'boolean' || tv === null || typeof tv === 'number' || (Array.isArray(tv) && !tv.length);
        if (isFlagLike) {
          out[key] = Array.isArray(tv) ? [] : tv;
          carried.push(`${full}=${JSON.stringify(tv)} (single example)`);
        } else {
          dropped.push(`${full} (${JSON.stringify(tv).slice(0, 40)}, single example)`);
        }
      } else {
        dropped.push(`${full} (varies per card, no source)`);
      }
    }
    return out;
  }

  // Find a front/back pair the app itself created, to use as the shape template.
  //
  // Both sides must be real scryfall cards. Checking only the front is not
  // enough: a project whose fronts are linked to the default cardback
  // (`source: "cardback"`, nine fields, `imageId: "cardback_builtin_proxxied"`)
  // would otherwise hand back a cardback as the template for a printed back.
  function scryfallPairsIn(cards) {
    const byUuid = new Map(cards.map((c) => [c.uuid, c]));
    return cards
      .filter((c) => {
        if (!c.linkedBackId || c.source !== 'scryfall' || c.isUserUpload || c.isToken) return false;
        const back = byUuid.get(c.linkedBackId);
        return !!back && back.source === 'scryfall';
      })
      .map((c) => ({ front: c, back: byUuid.get(c.linkedBackId) }));
  }

  // One project rarely holds enough pairs to tell a constant from content. The
  // recorder has every project the app listed, so pool them: a field is only a
  // constant if it holds across every scryfall pair the user has anywhere.
  function corpusPairs(targetCards) {
    const all = [];
    const seen = new Set();
    const add = (pairs) => {
      for (const p of pairs) {
        if (seen.has(p.front.uuid)) continue;
        seen.add(p.front.uuid);
        all.push(p);
      }
    };
    // The target project first, so its pairs are always counted regardless of
    // whether the recorder has finished processing the read that fetched them.
    add(scryfallPairsIn(targetCards));
    if (recorder && recorder.projectData) {
      for (const data of recorder.projectData.values()) {
        if (data && Array.isArray(data.cards)) add(scryfallPairsIn(data.cards));
      }
    }
    return all;
  }

  function findTemplatePair(cards) {
    const candidates = scryfallPairsIn(cards).map((p) => p.front);
    const byUuid = new Map(cards.map((c) => [c.uuid, c]));
    if (!candidates.length) return null;
    // Prefer the richest example - the most fields means the fewest guesses.
    candidates.sort((a, b) => Object.keys(b).length - Object.keys(a).length);
    const front = candidates[0];
    const corpus = corpusPairs(cards);
    return {
      front,
      back: byUuid.get(front.linkedBackId),
      frontConstants: constantFields(corpus.map((p) => p.front)),
      backConstants: constantFields(corpus.map((p) => p.back)),
      corpusSize: corpus.length,
    };
  }

  // The project being imported into often has no usable pair yet (a fresh
  // project, or one whose backs are all cardbacks). The recorder has every
  // project the app listed, so borrow a template from one of those instead of
  // falling back to a hand-written guess.
  // Count leaf values, not top-level keys: `scryfall_meta` with four entries
  // carries more shape than an empty `overrides: {}`, and counting keys alone
  // scores those equally.
  function leafCount(card) {
    const leaves = new Map();
    collectLeaves(card, '', leaves);
    return leaves.size;
  }

  const templateWeight = (t) => leafCount(t.front) * 1000 + leafCount(t.back);

  function findTemplateAnywhere(targetCards, targetProjectId) {
    const candidates = [];
    const local = findTemplatePair(targetCards);
    if (local) candidates.push({ template: local, from: null });
    if (recorder && recorder.projectData) {
      for (const [id, data] of recorder.projectData.entries()) {
        if (id === targetProjectId || !data || !Array.isArray(data.cards)) continue;
        const found = findTemplatePair(data.cards);
        if (found) candidates.push({ template: found, from: id });
      }
    }
    if (!candidates.length) return { template: null, from: null, candidates: [] };

    // A pair from the target project wins outright - new cards should match
    // their siblings. Otherwise take the richest available: constants are now
    // pooled across every project, so sampleCount is identical for all
    // candidates and cannot be used to choose between them. Sorting on field
    // count is what stops a sparse pair from silently dropping whole subtrees
    // (`scryfall_meta`) that a richer one would have carried.
    const chosen =
      candidates.find((c) => c.from === null) ||
      candidates.slice().sort((a, b) => templateWeight(b.template) - templateWeight(a.template))[0];

    // Warn about anything the other candidates have and this one lacks.
    const missing = new Set();
    for (const c of candidates) {
      if (c === chosen) continue;
      for (const side of ['front', 'back']) {
        for (const k of Object.keys(c.template[side])) {
          if (!(k in chosen.template[side])) missing.add(`${side}.${k}`);
        }
      }
    }
    return { template: chosen.template, from: chosen.from, candidates, missingVsOthers: [...missing].sort() };
  }

  // Fallback for an empty project: the original hand-reconstructed shape.
  function fallbackFront(pair, d, order, frontUuid, backUuid) {
    return {
      cmc: d.cmc,
      set: pair.front.set,
      name: pair.front.name || d.name,
      uuid: frontUuid,
      order,
      colors: d.colors,
      number: pair.front.number,
      rarity: d.rarity,
      source: 'scryfall',
      imageId: stripQuery(pngOf(d)),
      isToken: false,
      category: 'Mainboard',
      isFlipped: false,
      mana_cost: d.mana_cost,
      type_line: d.type_line,
      needs_token: false,
      isUserUpload: false,
      linkedBackId: backUuid,
      scryfall_meta: { ci: d.color_identity, type: d.type_line, layout: d.layout, oracle: d.oracle_text },
      color_identity: d.color_identity,
      isCardbackBack: true,
      hasBuiltInBleed: false,
    };
  }

  function fallbackBack(pair, d, order, backUuid, frontUuid) {
    const png = pngOf(d);
    const pngId = stripQuery(png);
    return {
      cmc: d.cmc,
      set: pair.back.set,
      lang: 'en',
      name: pair.back.name || d.name,
      uuid: backUuid,
      order,
      colors: d.colors,
      number: pair.back.number,
      rarity: d.rarity,
      source: 'scryfall',
      imageId: pngId,
      isToken: false,
      imageUrl: png,
      mana_cost: d.mana_cost,
      type_line: d.type_line,
      needs_token: false,
      token_parts: [],
      isUserUpload: false,
      linkedFrontId: frontUuid,
      hasBuiltInBleed: false,
      usesDefaultCardback: true,
    };
  }

  // ------------------------------------------------------------------ import

  document.addEventListener('proxxied-import-request', async (ev) => {
    const pairs = ev.detail.pairs;
    const dryRun = !!ev.detail.dryRun;

    try {
      if (!recorder) throw new Error('recorder.js did not load - reload the extension and the page');

      if (!recorder.ids) {
        emit('Waiting for the project to load - click any card if nothing happens.');
        const start = Date.now();
        while (!recorder.ids && Date.now() - start < 15000) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
      if (!recorder.ids) {
        throw new Error(
          'never observed a project request - make sure the project is fully loaded (or click on any card) before importing'
        );
      }

      const { ownerUserId, projectId, supabaseOrigin, apikey } = recorder.ids;
      debug(`using project ${projectId}, owner ${ownerUserId}, apikey ...${apikey.slice(-8)}`);

      // PostgREST distinguishes accept-profile (reads) from content-profile (writes) -
      // using the wrong one for a GET was an earlier bug. x-client-info mimics the real
      // supabase-js SDK in case there's gateway-level filtering on client fingerprint.
      const clientInfo = { 'x-client-info': 'supabase-js/2.110.9; runtime=web' };

      // Every call the app makes carries the user's JWT. `apikey` alone
      // identifies the project, not a person, so RLS matches no rows and a
      // read comes back as an empty list while a write silently updates
      // nothing - both with HTTP 200.
      const accessToken = recorder.getAccessToken && recorder.getAccessToken();
      if (!accessToken) {
        throw new Error(
          'no Supabase access token available - sign in on proxxied.com and let the page make at least one ' +
            'request, then try again (a request with only the publishable apikey is anonymous and silently ' +
            'matches nothing)'
        );
      }
      const auth = { authorization: `Bearer ${accessToken}` };
      debug(`authenticating as the app does (Bearer ...${accessToken.slice(-8)})`);

      const readHeaders = Object.assign({ apikey, accept: 'application/json', 'accept-profile': 'public' }, auth, clientInfo);
      const writeHeaders = Object.assign(
        { apikey, accept: 'application/json', 'content-type': 'application/json', 'content-profile': 'public' },
        auth,
        clientInfo
      );

      const getUrl = `${supabaseOrigin}/rest/v1/projects?select=id,project_data,owner_user_id,updated_at,card_count&id=eq.${projectId}&owner_user_id=eq.${ownerUserId}`;
      debug(`  GET ${getUrl}`);
      const getResp = await fetch(getUrl, { headers: readHeaders });
      const rawBody = await getResp.text();
      debug(`  response: HTTP ${getResp.status} ${rawBody.slice(0, 300)}`);
      if (!getResp.ok) throw new Error(`failed to read project: HTTP ${getResp.status}`);
      const rows = JSON.parse(rawBody);

      if (!rows.length) {
        // Diagnose which filter is the problem: does the project exist at all under this apikey?
        const idOnlyUrl = `${supabaseOrigin}/rest/v1/projects?select=id,owner_user_id&id=eq.${projectId}`;
        const idOnlyResp = await fetch(idOnlyUrl, { headers: readHeaders });
        const idOnlyBody = await idOnlyResp.text();
        debug(`  diagnostic (id filter only): HTTP ${idOnlyResp.status} ${idOnlyBody.slice(0, 300)}`);
        throw new Error(
          'project not found for the observed ids - an empty result here usually means the request was not ' +
            'authenticated (RLS returns 200 with [] rather than 401), so check that the session is still valid'
        );
      }

      const row = rows[0];
      const projectData = row.project_data;
      const cards = projectData.cards.slice();

      const found = findTemplateAnywhere(cards, projectId);
      const template = found.template;
      const templateInfo = template
        ? {
            fromProjectId: found.from || projectId,
            fromTargetProject: !found.from,
            candidateCount: found.candidates.length,
            frontUuid: template.front.uuid,
            frontName: template.front.name,
            frontPrinting: `${template.front.set}-${template.front.number}`,
            frontKeys: Object.keys(template.front).sort(),
            backKeys: Object.keys(template.back).sort(),
            corpusPairs: template.frontConstants.sampleCount,
            missingVsOtherTemplates: found.missingVsOthers,
          }
        : null;
      if (found.from) {
        emit('No pair in this project to copy - using one from another project.');
        debug(`borrowing template from project ${found.from} (richest of ${found.candidates.length} candidates)`);
      }
      if (found.missingVsOthers && found.missingVsOthers.length) {
        emit(`⚠ Template is missing ${found.missingVsOthers.length} field(s) another project's cards have.`);
      }
      if (template) {
        debug(
          `template: "${template.front.name}" (${Object.keys(template.front).length} front fields, ` +
            `${Object.keys(template.back).length} back fields)`
        );
        debug(
          `constants over ${template.frontConstants.sampleCount} pair(s): ` +
            `${template.frontConstants.consts.size} front, ${template.backConstants.consts.size} back`
        );
        if (template.frontConstants.sampleCount < 2) {
          emit('⚠ Only one existing pair to copy from - check the dry run before importing.');
        }
      } else {
        emit('⚠ No existing pair to copy - using the built-in card layout.');
      }

      if (!dryRun) {
        emit(`Backing up ${cards.length} existing cards to your Downloads folder.`);
        downloadJson(`proxxied-backup-${projectId}-${Date.now()}.json`, projectData);
      }

      let nextOrder = cards.reduce((max, c) => Math.max(max, c.order || 0), 0) + 10;
      const added = [];

      // Phase 1 - resolve every printing in bulk. A gap names the line it came
      // from: at this size "not found" alone would leave you hunting through
      // hundreds of rows.
      const byKey = await fetchPrintings(pairs);
      const printings = pairs.map((pair, i) => {
        const f = byKey.get(printingKey(pair.front.set, pair.front.number));
        const b = byKey.get(printingKey(pair.back.set, pair.back.number));
        if (!f || !b) {
          const which = [];
          if (!f) which.push(`${pair.front.set.toUpperCase()}-${pair.front.number}`);
          if (!b) which.push(`${pair.back.set.toUpperCase()}-${pair.back.number}`);
          throw new Error(`line ${i + 1}: could not resolve ${which.join(' and ')}`);
        }
        return { front: faceOf(f, false), back: faceOf(b, false) };
      });
      emit(`Found all ${pairs.length} pairs.`);

      // Phase 2 - build the card objects. Pure computation, kept sequential so
      // uuids, order numbers and the log stay in input order.
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const fId = `${pair.front.set.toUpperCase()}-${pair.front.number}`;
        const bId = `${pair.back.set.toUpperCase()}-${pair.back.number}`;
        const frontData = printings[i].front;
        const backData = printings[i].back;

        const frontName = pair.front.name || frontData.name;
        const backName = pair.back.name || backData.name;
        const label = frontName === backName ? frontName : `${frontName} // ${backName}`;
        const verbose = verboseBatch(pairs);
        if (verbose) emit(`${label}  (${fId} / ${bId})`);
        for (const [side, given, real] of [
          ['front', pair.front.name, frontData.name],
          ['back', pair.back.name, backData.name],
        ]) {
          if (given && given !== real) emit(`Using "${given}" for the ${side}; the printing is called "${real}".`);
        }

        const frontUuid = crypto.randomUUID();
        const backUuid = crypto.randomUUID();
        const order = nextOrder;
        nextOrder += 10;

        let frontCard;
        let backCard;
        if (template) {
          const carried = [];
          const dropped = [];
          frontCard = rebuildFrom(
            template.front,
            frontData,
            { side: pair.front, constants: template.frontConstants },
            '',
            carried,
            dropped
          );
          backCard = rebuildFrom(
            template.back,
            backData,
            { side: pair.back, constants: template.backConstants },
            '',
            carried,
            dropped
          );
          // Identical for every pair, so report it once rather than N times.
          if (i === 0) {
            if (carried.length) debug(`carried from template: ${carried.join(', ')}`);
            if (dropped.length) emit(`⚠ dropped ${dropped.length} template-specific field(s) - see console`);
            if (dropped.length) debug(`dropped (template-specific, no source): ${dropped.join(', ')}`);
          }
        } else {
          frontCard = fallbackFront(pair, frontData, order, frontUuid, backUuid);
          backCard = fallbackBack(pair, backData, order, backUuid, frontUuid);
        }

        Object.assign(frontCard, { uuid: frontUuid, order, linkedBackId: backUuid });
        Object.assign(backCard, { uuid: backUuid, order, linkedFrontId: frontUuid });
        delete frontCard.linkedFrontId;
        delete backCard.linkedBackId;

        cards.push(frontCard, backCard);
        added.push(frontCard, backCard);
        debug(`built ${frontUuid.slice(0, 8)} + ${backUuid.slice(0, 8)} at order ${order}`);
      }
      if (!verboseBatch(pairs)) emit(`Built ${added.length} cards.`);

      // Phase 3 - seed every image in a handful of calls rather than one per
      // pair. The endpoint accepts an array; the app only ever sends one
      // because it only ever adds one card at a time.
      if (!dryRun) {
        const urls = [];
        for (const pr of printings) urls.push(pngOf(pr.front), pngOf(pr.back));
        await seedImages(urls);
      }

      if (dryRun) {
        emit(`Dry run: built ${added.length} cards, wrote nothing. Downloaded them for review.`);
        downloadJson(`proxxied-dryrun-${Date.now()}.json`, {
          templateInfo,
          template: template ? { front: template.front, back: template.back } : null,
          cards: added,
        });
        return;
      }

      const updatedProjectData = Object.assign({}, projectData, { cards });

      // The app counts physical cards, not card objects: a linked front/back
      // pair is one card, so backs (the ones carrying linkedFrontId) don't count.
      const cardCount = cards.filter((c) => !c.linkedFrontId).length;

      // The app saves with `updated_at=eq.<the value it last read>`, an
      // optimistic-concurrency check: the write lands only if nobody else
      // changed the row in between. Matching that keeps this from silently
      // overwriting an edit made in the tab while the import was running.
      const cas = row.updated_at ? `&updated_at=eq.${encodeURIComponent(row.updated_at)}` : '';
      const patchUrl =
        `${supabaseOrigin}/rest/v1/projects?id=eq.${projectId}&owner_user_id=eq.${ownerUserId}${cas}` +
        `&select=id,updated_at`;
      debug(`  PATCH with card_count ${row.card_count} -> ${cardCount}, updated_at guard ${row.updated_at || '(none)'}`);

      const patchResp = await fetch(patchUrl, {
        method: 'PATCH',
        headers: Object.assign({}, writeHeaders, { prefer: 'return=representation' }),
        body: JSON.stringify({ project_data: updatedProjectData, card_count: cardCount }),
      });
      const patchText = await patchResp.text().catch(() => '');
      if (!patchResp.ok) {
        throw new Error(`failed to save project: HTTP ${patchResp.status} ${patchText}`);
      }

      // A PATCH that matches no rows still returns 200, with an empty array.
      // Without this check an unauthenticated or lost-the-race write reports
      // success while having changed nothing at all.
      let updatedRows = [];
      try {
        updatedRows = JSON.parse(patchText);
      } catch (e) {
        throw new Error(`save returned unparseable body: ${patchText.slice(0, 200)}`);
      }
      if (!Array.isArray(updatedRows) || !updatedRows.length) {
        throw new Error(
          'save matched 0 rows - nothing was written. Either the project changed in the tab while this ran ' +
            '(the updated_at guard rejected the write), or the request was not authenticated. Reload the page ' +
            'and try again; your backup file has the prior state.'
        );
      }

      emit(`✓ Saved ${pairs.length} pairs.`);

      // Read it back before reloading. The PATCH returning a row proves the
      // update was applied; only a fresh read proves it is still there, and
      // the reload below destroys the evidence either way.
      const wanted = added.map((c) => c.uuid);
      let verified = null;
      try {
        const vResp = await fetch(getUrl, { headers: readHeaders });
        const vRows = JSON.parse(await vResp.text());
        const vCards = (vRows[0] && vRows[0].project_data && vRows[0].project_data.cards) || [];
        const seen = new Set(vCards.map((c) => c.uuid));
        const present = wanted.filter((u) => seen.has(u));
        verified = { total: vCards.length, expected: wanted.length, present: present.length };
        if (present.length === wanted.length) {
          emit(`✓ Verified: all ${wanted.length} cards saved. Project now has ${vCards.length}.`);
        } else {
          emit(`⚠ Only ${present.length} of ${wanted.length} cards came back when re-checked.`);
        }
        // Keep the proof, since the reload takes the in-page log with it.
        downloadJson(`proxxied-result-${projectId}-${Date.now()}.json`, {
          importedAt: new Date().toISOString(),
          projectId,
          updatedAt: updatedRows[0].updated_at,
          templateInfo,
          verified,
          addedUuids: wanted,
          cardsAfter: vCards,
        });
      } catch (e) {
        emit(`⚠ Could not verify the save: ${e.message}`);
      }

      // The write is not safe yet. The open tab still holds the pre-import
      // state and a stale updated_at. Its next autosave fails the CAS check -
      // and the app responds by immediately retrying *without* the guard,
      // force-overwriting the import. Recorded happening 8s after a real
      // import: the two imported cards were simply gone.
      //
      // Reloading is what makes the write stick, so do it rather than asking.
      emit('Reloading the page - without it this tab would undo the import.');
      setTimeout(() => location.reload(), 2000);
    } catch (e) {
      emit(`✗ ${e.message}`);
    }
  });
})();
