ObjC.import('Foundation');
// Paths come from the runner (run.sh) so this suite works from any checkout.
const ENV = $.NSProcessInfo.processInfo.environment;
const TEST_DIR = ObjC.unwrap(ENV.objectForKey('PX_TEST_DIR'));
const EXT_DIR = ObjC.unwrap(ENV.objectForKey('PX_EXT_DIR'));
const OUT_DIR = ObjC.unwrap(ENV.objectForKey('PX_OUT_DIR'));
const REPO_DIR = ObjC.unwrap(ENV.objectForKey('PX_REPO_DIR'));

function readFile(p) { return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null)); }
eval(readFile(TEST_DIR + '/stubs.js'));
const G = globalThis;
let n = 0; G.crypto = { randomUUID: () => 'new-' + ++n };
eval(readFile(EXT_DIR + '/recorder.js'));
eval(readFile(EXT_DIR + '/main-world.js'));
G.document.addEventListener('proxxied-import-progress', (ev) => console.log('  | ' + ev.detail.line));

// Reproduces the real "Test" project exactly: ONE scryfall->scryfall pair,
// whose front is a reversible TRK-derived card carrying dfc_* image hashes
// and a user-set isFlipped.
const PROJECT='p1', OWNER='o1', SB='https://xyz.supabase.co';
const front = { uuid:'f', order:1180, name:'Swamp', set:'lrw', number:'290', source:'scryfall',
  cmc:0, colors:[], color_identity:['B'], rarity:'common', mana_cost:'', type_line:'Basic Land — Swamp',
  imageId:'https://cards.scryfall.io/png/front/4/f/OLD.png', isToken:false, category:'Mainboard',
  isFlipped:true, needs_token:false, isUserUpload:false, linkedBackId:'b', isCardbackBack:true,
  hasBuiltInBleed:false,
  scryfall_meta:{ ci:['B'], type:'Basic Land — Swamp', layout:'reversible_card', oracle:'({T}: Add {B}.)',
    dfc_names:['Swamp','Swamp'],
    dfc_images:{ 'a1b532f194eda99720114aa5b7c4f3f073822be4':['Swamp','6c94d80abab34c243d291ad46b4101bb1852ccc6'] } } };
const back = { uuid:'b', order:1180, name:'Proxxied', set:'shm', number:'290', source:'scryfall', lang:'en',
  cmc:0, colors:[], rarity:'common', mana_cost:'', type_line:'Basic Land — Swamp',
  imageId:'https://cards.scryfall.io/png/front/4/3/OLDBACK.png', isToken:false, isUserUpload:false,
  linkedFrontId:'f', hasBuiltInBleed:false, needs_token:false, usesDefaultCardback:true };

G.__proxxiedRecorder.ids = { ownerUserId:OWNER, projectId:PROJECT, supabaseOrigin:SB, apikey:'sb_publishable_x' };
G.__responses[`${SB}/rest/v1/projects?select=id,project_data,owner_user_id,updated_at,card_count&id=eq.${PROJECT}&owner_user_id=eq.${OWNER}`] =
  { status:200, ct:'application/json', body: JSON.stringify([{ id:PROJECT, owner_user_id:OWNER, updated_at:'T0', card_count:2,
      project_data:{ v:2, st:{}, cards:[front, back] } }]) };
const sf=(nm,set,num,extra)=>Object.assign({ id:'sf-'+set+num, name:nm, set, collector_number:num, lang:'en', cmc:0,
  colors:[], color_identity:['B'], rarity:'common', mana_cost:'', type_line:'Basic Land — '+nm, oracle_text:'({T}: Add {B}.)',
  layout:'normal', image_uris:{ png:`https://cards.scryfall.io/png/front/x/y/${set}${num}.png?178394` } }, extra||{});
G.__responses['https://api.proxxied.com/api/scryfall/cards/lrw/291?lang=en']={status:200,ct:'application/json',body:JSON.stringify(sf('Forest','lrw','291'))};
G.__responses['https://api.proxxied.com/api/scryfall/cards/shm/291?lang=en']={status:200,ct:'application/json',body:JSON.stringify(sf('Ballynock Cohort','shm','291'))};

// A second project standing in for LRW-SHM: many pairs, all source/category
// consistent, and exactly one carrying dfc_* image hashes.
const corpus = [];
for (let k = 0; k < 27; k++) {
  const f = { uuid:'cf'+k, order:k*10, name:'Land'+k, set:'lrw', number:'2'+k, source:'scryfall', cmc:0,
    colors:[], color_identity:[], rarity:'common', mana_cost:'', type_line:'Basic Land', isToken:false,
    category:'Mainboard', isFlipped:false, needs_token:false, isUserUpload:false, linkedBackId:'cb'+k,
    isCardbackBack:true, hasBuiltInBleed:false, imageId:'https://x/'+k+'.png',
    scryfall_meta:{ ci:[], type:'Basic Land', layout:'normal', oracle:'o' } };
  if (k === 0) { f.scryfall_meta.dfc_names = ['A','B']; }   // only one card has it
  const b = { uuid:'cb'+k, order:k*10, name:'Land'+k, set:'shm', number:'2'+k, source:'scryfall', lang:'en',
    cmc:0, colors:[], rarity:'common', mana_cost:'', type_line:'Basic Land', imageId:'https://y/'+k+'.png',
    isToken:false, isUserUpload:false, linkedFrontId:'cf'+k, hasBuiltInBleed:false, needs_token:false,
    usesDefaultCardback:true };
  corpus.push(f, b);
}
G.__proxxiedRecorder.projectData.set('lrwshm', { v:2, st:{}, cards: corpus });

G.document.dispatchEvent(new G.CustomEvent('proxxied-import-request', { detail:{
  pairs:[{ front:{name:null,set:'lrw',number:'291'}, back:{name:null,set:'shm',number:'291'} }], dryRun:true } }));

let i=0; const go=()=>(++i>300?fin():Promise.resolve().then(go));
function fin(){
  const dl=G.__downloads[G.__downloads.length-1];
  const c=JSON.parse(dl.text).cards[0];
  console.log('\n=== built FRONT ===');
  console.log(JSON.stringify(c,null,1));
  const sm=c.scryfall_meta||{};
  console.log('\nCHECKS:');
  console.log('  dfc_images carried over? ', 'dfc_images' in sm, '(must be false)');
  console.log('  dfc_names carried over?  ', 'dfc_names' in sm, '(must be false)');
  console.log('  isFlipped:               ', c.isFlipped, '(must be false)');
  console.log('  layout from scryfall:    ', sm.layout, '(must be normal)');
  console.log('  imageId stripped:        ', !String(c.imageId).includes('?'));
  console.log('  front name (want Forest):', JSON.stringify(c.name));
  console.log('  source (needs scryfall): ', JSON.stringify(c.source));
  console.log('  category (needs Mainbrd):', JSON.stringify(c.category));
  $.NSString.stringWithString(globalThis.out.join('\n')).writeToFileAtomicallyEncodingError(OUT_DIR + '/result4.txt',true,$.NSUTF8StringEncoding,null);
}
Promise.resolve().then(go);
