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
G.crypto = { randomUUID: () => 'new-uuid-' + ++uuidN + '-0000-0000-000000000000' };

eval(readFile(EXT_DIR + '/recorder.js'));
eval(readFile(EXT_DIR + '/main-world.js'));
G.document.addEventListener('proxxied-import-progress', (ev) => console.log('[log] ' + ev.detail.line));

const PROJECT = '11111111-2222-3333-4444-555555555555';
const OWNER = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const APIKEY = 'header.' + G.btoa(JSON.stringify({ role: 'anon' })) + '.sig';
const SB = 'https://xyz.supabase.co';

// A template pair as the real app would have written it, including fields the
// importer has no idea about (that is the whole point).
const front = {
  uuid: 'f-1', order: 10, name: 'Swamp', set: 'lrw', number: '290', source: 'scryfall',
  cmc: 0, colors: [], color_identity: [], rarity: 'common', mana_cost: '', type_line: 'Basic Land — Swamp',
  imageId: 'https://img/lrw290.png', isToken: false, isUserUpload: false, isFlipped: false,
  category: 'Mainboard', linkedBackId: 'b-1', hasBuiltInBleed: false, needs_token: false,
  isCardbackBack: true, mysteryFlag: false, mysteryCount: 3, mysteryList: [],
  mysteryString: 'template-specific-value',
  scryfall_meta: { ci: [], type: 'Basic Land — Swamp', layout: 'normal', oracle: '({T}: Add {B}.)' },
};
const back = {
  uuid: 'b-1', order: 10, name: 'Swamp', set: 'shm', number: '290', source: 'scryfall', lang: 'en',
  cmc: 0, colors: [], rarity: 'common', mana_cost: '', type_line: 'Basic Land — Swamp',
  imageId: 'https://img/shm290.png', imageUrl: '/api/cards/images/proxy?url=https%3A%2F%2Fimg%2Fshm290.png',
  isToken: false, isUserUpload: false, linkedFrontId: 'f-1', token_parts: [], hasBuiltInBleed: false,
  needs_token: false, usesDefaultCardback: true,
};
const front2 = Object.assign({}, front, { uuid: 'f-9', order: 20, name: 'Plains', number: '285', linkedBackId: 'b-9', mysteryString: 'a-different-value' });
const back2 = Object.assign({}, back, { uuid: 'b-9', order: 20, name: 'Plains', number: '285', linkedFrontId: 'f-9' });
const projectData = { v: 2, st: {}, cards: [front, back, front2, back2] };

G.__responses[`${SB}/rest/v1/projects?select=id,project_data,owner_user_id,updated_at,card_count&id=eq.${PROJECT}&owner_user_id=eq.${OWNER}`] =
  { status: 200, ct: 'application/json', body: JSON.stringify([{ id: PROJECT, owner_user_id: OWNER, project_data: projectData, updated_at: '2026-01-01T00:00:00Z', card_count: 2 }]) };

const sf = (name, set, num, extra) => Object.assign({
  id: 'sf-' + set + num, name, set, collector_number: num, lang: 'en', cmc: 0, colors: [], color_identity: [],
  rarity: 'common', mana_cost: '', type_line: 'Basic Land — ' + name, oracle_text: '({T}: Add.)', layout: 'normal',
  artist: 'Some Artist', set_name: set.toUpperCase(), released_at: '2007-10-12',
  image_uris: { png: `https://cards.scryfall.io/png/${set}${num}.png` },
}, extra || {});

G.__responses['https://api.proxxied.com/api/scryfall/cards/lrw/291?lang=en'] =
  { status: 200, ct: 'application/json', body: JSON.stringify(sf('Forest', 'lrw', '291')) };
G.__responses['https://api.proxxied.com/api/scryfall/cards/shm/291?lang=en'] =
  { status: 200, ct: 'application/json', body: JSON.stringify(sf('Ballynock Cohort', 'shm', '291')) };

// Seed the recorder with the ids the importer needs, the way real traffic would.
G.__proxxiedRecorder.ids = { ownerUserId: OWNER, projectId: PROJECT, supabaseOrigin: SB, apikey: APIKEY };

const GETU2 = `${SB}/rest/v1/projects?select=id,project_data,owner_user_id,updated_at,card_count&id=eq.${PROJECT}&owner_user_id=eq.${OWNER}`;
G.__responses['https://api.proxxied.com/api/cards/images/seed-urls'] = { status: 200, ct: 'application/json', body: '{"accepted":2}' };
const patches = G.installWriteStub(SB, PROJECT, OWNER, GETU2, '2026-01-01T00:00:00Z');
G.document.dispatchEvent(new G.CustomEvent('proxxied-import-request', {
  detail: { pairs: [{ front: { name: null, set: 'lrw', number: '291' }, back: { name: null, set: 'shm', number: '291' } }] },
}));

let n = 0;
const spin = () => (++n > 400 ? finish() : Promise.resolve().then(spin));
function finish() {
  const cards = G.addedCards(patches, 'new-uuid');
  console.log('== cards written ==');
  console.log(JSON.stringify(cards, null, 2));
  $.NSString.stringWithString(globalThis.out.join('\n')).writeToFileAtomicallyEncodingError(OUT_DIR + '/result2.txt', true, $.NSUTF8StringEncoding, null);
}
Promise.resolve().then(spin);
