ObjC.import('Foundation');
// Paths come from the runner (run.sh) so this suite works from any checkout.
const ENV = $.NSProcessInfo.processInfo.environment;
const TEST_DIR = ObjC.unwrap(ENV.objectForKey('PX_TEST_DIR'));
const EXT_DIR = ObjC.unwrap(ENV.objectForKey('PX_EXT_DIR'));
const OUT_DIR = ObjC.unwrap(ENV.objectForKey('PX_OUT_DIR'));
const REPO_DIR = ObjC.unwrap(ENV.objectForKey('PX_REPO_DIR'));

function readFile(p) {
  return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null));
}
eval(readFile(TEST_DIR + '/stubs.js'));
const G = globalThis;
let uuidN = 0;
G.crypto = { randomUUID: () => 'uuid-' + ++uuidN };
eval(readFile(EXT_DIR + '/recorder.js'));
eval(readFile(EXT_DIR + '/main-world.js'));
G.document.addEventListener('proxxied-import-progress', (ev) => console.log('  | ' + ev.detail.line));

const R = G.__proxxiedRecorder;
const PROJECT = 'aaaa0000-0000-0000-0000-000000000001'; // the open "Test"-like project
const OTHER   = 'bbbb0000-0000-0000-0000-000000000002'; // the real dualdisk project
const OWNER   = 'owner-1';
const SB = 'https://xyz.supabase.co';
const UPDATED = '2026-09-02T02:33:52.008475+00:00';

// Mirrors the real capture: the open project's only pair is scryfall front -> cardback back.
const tFront = { uuid: 'tf', order: 10, name: 'Swamp', set: 'trk', number: '322', source: 'scryfall',
  cmc: 0, colors: [], color_identity: ['B'], rarity: 'common', mana_cost: '', type_line: 'Basic Land — Swamp',
  imageId: 'https://img.proxxied.com/cached-images/abc.png?v=1', imageUrl: 'https://img.proxxied.com/cached-images/abc.png?v=1',
  isToken: false, category: 'Mainboard', isFlipped: false, needs_token: false, isUserUpload: false,
  linkedBackId: 'tb', isCardbackBack: true, hasBuiltInBleed: false,
  scryfall_meta: { ci: ['B'], type: 'Basic Land — Swamp', layout: 'normal', oracle: '({T}: Add {B}.)' } };
const tBack = { name: 'Proxxied', uuid: 'tb', order: 10, source: 'cardback', imageId: 'cardback_builtin_proxxied',
  isUserUpload: false, linkedFrontId: 'tf', hasBuiltInBleed: true, usesDefaultCardback: true };

// A real scryfall-to-scryfall pair living in a DIFFERENT project.
const mk = (n, i) => ({
  front: { uuid: 'f' + i, order: i * 10, name: n, set: 'lrw', number: '29' + i, source: 'scryfall', cmc: 0,
    colors: [], color_identity: [], rarity: 'common', mana_cost: '', type_line: 'Basic Land — ' + n,
    imageId: 'https://img/f' + i + '.png', isToken: false, category: 'Mainboard', isFlipped: false,
    needs_token: false, isUserUpload: false, linkedBackId: 'b' + i, isCardbackBack: true, hasBuiltInBleed: false,
    scryfall_meta: { ci: [], type: 'Basic Land — ' + n, layout: 'normal', oracle: 'x' } },
  back: { uuid: 'b' + i, order: i * 10, name: n, set: 'shm', number: '29' + i, source: 'scryfall', lang: 'en',
    cmc: 0, colors: [], rarity: 'common', mana_cost: '', type_line: 'Basic Land — ' + n,
    imageId: 'https://img/b' + i + '.png', imageUrl: 'https://img/b' + i + '.png', isToken: false,
    isUserUpload: false, linkedFrontId: 'f' + i, token_parts: [], hasBuiltInBleed: false, needs_token: false,
    usesDefaultCardback: false },
});
const p1 = mk('Swamp', 1), p2 = mk('Island', 2);

const targetData = { v: 2, st: {}, cards: [tFront, tBack] };
R.projectData.set(OTHER, { v: 2, st: {}, cards: [p1.front, p1.back, p2.front, p2.back] });
R.ids = { ownerUserId: OWNER, projectId: PROJECT, supabaseOrigin: SB, apikey: 'sb_publishable_test' };

const GETU = `${SB}/rest/v1/projects?select=id,project_data,owner_user_id,updated_at,card_count&id=eq.${PROJECT}&owner_user_id=eq.${OWNER}`;
G.__responses[GETU] = { status: 200, ct: 'application/json',
  body: JSON.stringify([{ id: PROJECT, owner_user_id: OWNER, project_data: targetData, updated_at: UPDATED, card_count: 1 }]) };
const sf = (n, set, num) => ({ id: 'sf', name: n, set, collector_number: num, lang: 'en', cmc: 0, colors: [],
  color_identity: [], rarity: 'common', mana_cost: '', type_line: 'Basic Land — ' + n, oracle_text: 'o',
  layout: 'normal', image_uris: { png: `https://cards.scryfall.io/png/${set}${num}.png?1783942703` } });
G.__responses['https://api.proxxied.com/api/scryfall/cards/lrw/291?lang=en'] = { status: 200, ct: 'application/json', body: JSON.stringify(sf('Forest','lrw','291')) };
G.__responses['https://api.proxxied.com/api/scryfall/cards/shm/291?lang=en'] = { status: 200, ct: 'application/json', body: JSON.stringify(sf('Ballynock Cohort','shm','291')) };

G.__responses['https://api.proxxied.com/api/cards/images/seed-urls'] = { status: 200, ct: 'application/json', body: '{"accepted":2,"results":["seeded","seeded"]}' };
const seedCalls = [];
const PAIRS = [{ front: { name: null, set: 'lrw', number: '291' }, back: { name: null, set: 'shm', number: '291' } }];
const patchCalls = [];
const origFetch = G.fetch;
G.fetch = function (url, init) {
  if (init && init.method === 'PATCH') {
    patchCalls.push({ url: String(url), init });
    const sent = JSON.parse(init.body);
    if (sent.project_data && G.__responses[GETU] && G.__responses[GETU].body !== '[]') {
      G.__responses[GETU] = { status: 200, ct: 'application/json', body: JSON.stringify([
        { id: PROJECT, owner_user_id: OWNER, project_data: sent.project_data, updated_at: 'T1', card_count: sent.card_count }]) };
    }
  }
  if (String(url).includes('seed-urls')) seedCalls.push(JSON.parse(init.body));
  return origFetch.apply(this, arguments);
};

function setPatch(body) {
  G.__responses[Object.keys(G.__responses).find((k) => k.includes('&select=id,updated_at')) || 'x'] = null;
  // register under whatever URL the importer builds
  const cas = `&updated_at=eq.${encodeURIComponent(UPDATED)}`;
  G.__responses[`${SB}/rest/v1/projects?id=eq.${PROJECT}&owner_user_id=eq.${OWNER}${cas}&select=id,updated_at`] =
    { status: 200, ct: 'application/json', body };
}

function spin(n, fn) { let i = 0; const go = () => (++i > n ? fn() : Promise.resolve().then(go)); Promise.resolve().then(go); }

console.log('=== SCENARIO A: real write, CAS satisfied ===');
setPatch(JSON.stringify([{ id: PROJECT, updated_at: '2026-09-02T03:00:00.000000+00:00' }]));
G.document.dispatchEvent(new G.CustomEvent('proxxied-import-request', { detail: { pairs: PAIRS } }));
spin(300, () => {
  const pc = patchCalls[0];
  console.log('  PATCH url: ' + (pc ? pc.url.replace(SB, '') : 'NONE'));
  if (pc) {
    const b = JSON.parse(pc.init.body);
    console.log('  authorization sent: ' + !!pc.init.headers.authorization);
    console.log('  body keys: ' + JSON.stringify(Object.keys(b)));
    console.log('  card_count: ' + b.card_count + ' (2 pairs of fronts = 2)');
    const added = b.project_data.cards.filter((c) => String(c.uuid).startsWith('uuid-'));
    console.log('  new front name: ' + JSON.stringify(added[0].name));
    console.log('  new back  name: ' + JSON.stringify(added[1].name));
    console.log('  new back source: ' + JSON.stringify(added.map((c) => c.source)));
    console.log('  new front imageId: ' + added[0].imageId);
    console.log('  new back  imageId: ' + added[1].imageId);
    console.log('  new back  imageUrl: ' + added[1].imageUrl);
    console.log('  seed-urls calls: ' + JSON.stringify(seedCalls));
    const res = G.__downloads.filter((d) => d.name.includes('result-'));
    console.log('  verification file: ' + (res.length ? res[res.length-1].name : 'NONE'));
    if (res.length) { const v = JSON.parse(res[res.length-1].text); console.log('  verified: ' + JSON.stringify(v.verified)); }
  }
  console.log('');
  console.log('=== SCENARIO B: PATCH matches 0 rows (stale CAS / no auth) ===');
  patchCalls.length = 0;
  setPatch('[]');
  G.document.dispatchEvent(new G.CustomEvent('proxxied-import-request', { detail: { pairs: PAIRS } }));
  spin(300, () => {
    $.NSString.stringWithString(globalThis.out.join('\n')).writeToFileAtomicallyEncodingError(OUT_DIR + '/result3.txt', true, $.NSUTF8StringEncoding, null);
  });
});
