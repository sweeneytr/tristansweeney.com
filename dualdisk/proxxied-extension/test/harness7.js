ObjC.import('Foundation');
// Paths come from the runner (run.sh) so this suite works from any checkout.
const ENV = $.NSProcessInfo.processInfo.environment;
const TEST_DIR = ObjC.unwrap(ENV.objectForKey('PX_TEST_DIR'));
const EXT_DIR = ObjC.unwrap(ENV.objectForKey('PX_EXT_DIR'));
const OUT_DIR = ObjC.unwrap(ENV.objectForKey('PX_OUT_DIR'));
const REPO_DIR = ObjC.unwrap(ENV.objectForKey('PX_REPO_DIR'));

function readFile(p){return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p,$.NSUTF8StringEncoding,null));}
eval(readFile(TEST_DIR + '/stubs.js'));
const G=globalThis; let u=0; G.crypto={randomUUID:()=>'u'+(++u)};
eval(readFile(EXT_DIR + '/recorder.js')); eval(readFile(EXT_DIR + '/main-world.js'));
G.document.addEventListener('proxxied-import-progress',(ev)=>console.log('  | '+ev.detail.line));

const PROJECT='p1',OWNER='o1',SB='https://xyz.supabase.co';
const f0={uuid:'f0',order:10,name:'L',set:'lrw',number:'1',source:'scryfall',cmc:0,colors:[],color_identity:[],
  rarity:'common',mana_cost:'',type_line:'T',imageId:'https://i/a.png',isToken:false,isUserUpload:false,
  needs_token:false,hasBuiltInBleed:false,category:'Mainboard',isFlipped:false,isCardbackBack:true,linkedBackId:'b0',
  scryfall_meta:{ci:[],type:'T',layout:'normal',oracle:'o'}};
const b0={uuid:'b0',order:10,name:'L',set:'shm',number:'1',source:'scryfall',lang:'en',cmc:0,colors:[],rarity:'common',
  mana_cost:'',type_line:'T',imageId:'https://i/b.png',isToken:false,isUserUpload:false,needs_token:false,
  hasBuiltInBleed:false,linkedFrontId:'f0',usesDefaultCardback:true};
const f1=Object.assign({},f0,{uuid:'f1',linkedBackId:'b1',number:'2'});
const b1=Object.assign({},b0,{uuid:'b1',linkedFrontId:'f1',number:'2'});
const GETU=`${SB}/rest/v1/projects?select=id,project_data,owner_user_id,updated_at,card_count&id=eq.${PROJECT}&owner_user_id=eq.${OWNER}`;
G.__responses[GETU]={status:200,ct:'application/json',body:JSON.stringify([{id:PROJECT,owner_user_id:OWNER,
  updated_at:'T0',card_count:2,project_data:{v:2,st:{},cards:[f0,b0,f1,b1]}}])};
const sf=(nm,set,num)=>({id:'s'+set+num,name:nm,set,collector_number:num,lang:'en',cmc:0,colors:[],color_identity:[],
  rarity:'common',mana_cost:'',type_line:'Basic Land — '+nm,oracle_text:'o',layout:'normal',
  image_uris:{png:`https://cards.scryfall.io/png/${set}${num}.png?178394`}});
for(const [set,num,nm] of [['lrw','10','Alpha'],['shm','10','Beta'],['lrw','11','Gamma'],['shm','11','Delta']])
  G.__responses[`https://api.proxxied.com/api/scryfall/cards/${set}/${num}?lang=en`]={status:200,ct:'application/json',body:JSON.stringify(sf(nm,set,num))};
G.__responses['https://api.proxxied.com/api/cards/images/seed-urls']={status:200,ct:'application/json',body:'{"accepted":4}'};
G.__responses[`${SB}/rest/v1/projects?id=eq.${PROJECT}&owner_user_id=eq.${OWNER}&updated_at=eq.T0&select=id,updated_at`]=
  {status:200,ct:'application/json',body:JSON.stringify([{id:PROJECT,updated_at:'T1'}])};
G.__proxxiedRecorder.ids={ownerUserId:OWNER,projectId:PROJECT,supabaseOrigin:SB,apikey:'k'};

// SHM-10 is absent from Scryfall's bulk result but present via the passthrough.
G.__collectionMisses=new Set(['shm|10']);
const calls=[]; const of=G.fetch;
G.fetch=function(url,init){ calls.push((init&&init.method||'GET')+' '+String(url).replace(/\?.*/,'')); return of.apply(this,arguments); };

G.__responses['https://api.proxxied.com/api/cards/images/seed-urls']={status:200,ct:'application/json',body:'{"accepted":4}'};
const GETU7=`${SB}/rest/v1/projects?select=id,project_data,owner_user_id,updated_at,card_count&id=eq.${PROJECT}&owner_user_id=eq.${OWNER}`;
const patches=G.installWriteStub(SB,PROJECT,OWNER,GETU7,'T0');
console.log('=== A: Scryfall misses SHM-10, passthrough recovers it ===');
G.document.dispatchEvent(new G.CustomEvent('proxxied-import-request',{detail:{pairs:[
  {front:{name:null,set:'lrw',number:'10'},back:{name:null,set:'shm',number:'10'}},
  {front:{name:null,set:'lrw',number:'11'},back:{name:null,set:'shm',number:'11'}}]}}));
let i=0; const go=()=>(++i>600?mid():Promise.resolve().then(go));
function mid(){
  const cards=G.addedCards(patches,'u');
  console.log('  built '+cards.length+' cards; names: '+JSON.stringify(cards.map(c=>c.name)));
  console.log('  passthrough calls: '+JSON.stringify(calls.filter(c=>c.includes('/api/scryfall/'))));
  console.log('');
  console.log('=== B: printing in neither source ===');
  G.__collectionMisses=new Set(['shm|11']);
  delete G.__responses['https://api.proxxied.com/api/scryfall/cards/shm/11?lang=en'];
  G.document.dispatchEvent(new G.CustomEvent('proxxied-import-request',{detail:{pairs:[
    {front:{name:null,set:'lrw',number:'10'},back:{name:null,set:'shm',number:'10'}},
    {front:{name:null,set:'lrw',number:'11'},back:{name:null,set:'shm',number:'11'}}]}}));
  let j=0; const go2=()=>(++j>600?fin():Promise.resolve().then(go2));
  Promise.resolve().then(go2);
}
function fin(){$.NSString.stringWithString(G.out.join('\n')).writeToFileAtomicallyEncodingError(OUT_DIR + '/result7.txt',true,$.NSUTF8StringEncoding,null);}
Promise.resolve().then(go);
