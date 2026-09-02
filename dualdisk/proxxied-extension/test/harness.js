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
eval(readFile(EXT_DIR + '/recorder.js'));
const G = globalThis;

// ---------------------------------------------------------------- test data
const PROJECT = '11111111-2222-3333-4444-555555555555';
const OWNER = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const APIKEY = 'header.' + G.btoa(JSON.stringify({ role: 'anon', ref: 'xyz', iss: 'supabase' })) + '.sig';
const SB = 'https://xyz.supabase.co';

const front = {
  uuid: 'f-1', order: 10, name: 'Swamp', set: 'lrw', number: '290', source: 'scryfall',
  cmc: 0, colors: [], color_identity: [], rarity: 'common', mana_cost: '', type_line: 'Basic Land — Swamp',
  imageId: 'https://img/lrw290.png', isToken: false, isUserUpload: false, isFlipped: false,
  category: 'Mainboard', linkedBackId: 'b-1', hasBuiltInBleed: false, needs_token: false,
  scryfall_meta: { ci: [], type: 'Basic Land — Swamp', layout: 'normal', oracle: '({T}: Add {B}.)' },
};
const back = {
  uuid: 'b-1', order: 10, name: 'Swamp', set: 'shm', number: '290', source: 'scryfall', lang: 'en',
  cmc: 0, colors: [], rarity: 'common', mana_cost: '', type_line: 'Basic Land — Swamp',
  imageId: 'https://img/shm290.png', imageUrl: '/api/cards/images/proxy?url=https%3A%2F%2Fimg%2Fshm290.png',
  isToken: false, isUserUpload: false, linkedFrontId: 'f-1', colors: ['B'], token_parts: [{ name: 'Zombie', id: 't1', count: 2 }], hasBuiltInBleed: false,
  needs_token: false, usesDefaultCardback: true,
};
// A second card that lacks some fields, so optionality shows up in the profile.
const loose = { uuid: 'x-1', order: 20, name: 'Island', set: 'lrw', number: '286', source: 'scryfall', imageId: 'i', isToken: false };

const projectData = { v: 2, st: { dpi: 800 }, cards: [front, back, loose] };
const getUrl = `${SB}/rest/v1/projects?select=id,project_data,owner_user_id&id=eq.${PROJECT}&owner_user_id=eq.${OWNER}`;
G.__responses[getUrl] = { status: 200, ct: 'application/json', body: JSON.stringify([{ id: PROJECT, owner_user_id: OWNER, project_data: projectData }]) };

const patchUrl = `${SB}/rest/v1/projects?id=eq.${PROJECT}&owner_user_id=eq.${OWNER}`;
G.__responses[patchUrl] = { status: 200, ct: 'application/json', body: '[]' };

const openapiUrl = `${SB}/rest/v1/`;
G.__responses[openapiUrl] = { status: 200, ct: 'application/openapi+json', body: JSON.stringify({
  host: 'xyz.supabase.co',
  definitions: {
    projects: { required: ['id'], properties: { id: { format: 'uuid', type: 'string', description: 'PK' }, project_data: { format: 'jsonb' }, owner_user_id: { format: 'uuid' } } },
    project_versions: { properties: { id: { format: 'uuid' }, snapshot: { format: 'jsonb' } } },
  },
  paths: { '/projects': {}, '/rpc/duplicate_project': {} },
}) };

// ------------------------------------------------------------------- drive
const R = G.__proxxiedRecorder;

// 1. the app reads the project
G.window.fetch(getUrl, { headers: { apikey: APIKEY, accept: 'application/json', authorization: 'Bearer ' + APIKEY } })
  .then(() => new Promise((r) => { let n = 0; const spin = () => (++n > 60 ? r() : Promise.resolve().then(spin)); spin(); }))
  .then(() => {
    console.log('== after GET ==');
    console.log('ids:', JSON.stringify(R.ids));
    console.log('entries:', R.entries.length, 'snapshots:', R.projectData.size);
    const hdr = R.entries[0].requestHeaders;
    console.log('authorization redacted ->', hdr.authorization);
    console.log('apikey kept ->', String(hdr.apikey).slice(0, 8) + '...');

    // 2. the app saves, having added a pair and changed a setting
    const newFront = Object.assign({}, front, { uuid: 'f-2', order: 30, name: 'Forest', number: '291', linkedBackId: 'b-2' });
    const newBack = Object.assign({}, back, { uuid: 'b-2', order: 30, name: 'Forest', number: '291', linkedFrontId: 'f-2' });
    const after = { v: 2, st: { dpi: 1200 }, cards: [front, back, loose, newFront, newBack] };
    return G.window.fetch(patchUrl, { method: 'PATCH', headers: { apikey: APIKEY, 'content-type': 'application/json' }, body: JSON.stringify({ project_data: after }) });
  })
  .then(() => new Promise((r) => { let n = 0; const spin = () => (++n > 60 ? r() : Promise.resolve().then(spin)); spin(); }))
  .then(() => {
    console.log('== after PATCH ==');
    console.log('diffs:', R.diffs.length);
    const changes = R.diffs[0].changes;
    console.log('change count:', changes.length);
    console.log(JSON.stringify(changes.map((c) => ({ path: c.path, op: c.op, from: c.from, to: c.to && c.to.uuid ? '<card ' + c.to.uuid + '>' : c.to })), null, 1));

    // 3. OpenAPI probe
    G.document.dispatchEvent(new G.CustomEvent('proxxied-recorder-command', { detail: { command: 'openapi' } }));
    return new Promise((r) => { let n = 0; const spin = () => (++n > 60 ? r() : Promise.resolve().then(spin)); spin(); });
  })
  .then(() => {
    console.log('== openapi ==', JSON.stringify(Object.keys(R.openapi.tables)), R.openapi.rpcs);
    G.document.dispatchEvent(new G.CustomEvent('proxxied-recorder-command', { detail: { command: 'export-md' } }));
    return new Promise((r) => { let n = 0; const spin = () => (++n > 60 ? r() : Promise.resolve().then(spin)); spin(); });
  })
  .then(() => {
    const md = G.__downloads[G.__downloads.length - 1];
    console.log('== markdown report ==', md.name, md.text.length, 'chars');
    console.log(md.text);
    $.NSString.stringWithString(globalThis.out.join('\n')).writeToFileAtomicallyEncodingError(OUT_DIR + '/result.txt', true, $.NSUTF8StringEncoding, null);
  })
  .catch((e) => {
    globalThis.out.push('ERROR: ' + e.message + '\n' + e.stack);
    $.NSString.stringWithString(globalThis.out.join('\n')).writeToFileAtomicallyEncodingError(OUT_DIR + '/result.txt', true, $.NSUTF8StringEncoding, null);
  });
