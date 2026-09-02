ObjC.import('Foundation');
// Paths come from the runner (run.sh) so this suite works from any checkout.
const ENV = $.NSProcessInfo.processInfo.environment;
const TEST_DIR = ObjC.unwrap(ENV.objectForKey('PX_TEST_DIR'));
const EXT_DIR = ObjC.unwrap(ENV.objectForKey('PX_EXT_DIR'));
const OUT_DIR = ObjC.unwrap(ENV.objectForKey('PX_OUT_DIR'));
const REPO_DIR = ObjC.unwrap(ENV.objectForKey('PX_REPO_DIR'));

function readFile(p){return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p,$.NSUTF8StringEncoding,null));}
eval(readFile(TEST_DIR + '/stubs.js'));
const G=globalThis;
let u=0; G.crypto={randomUUID:()=>'u'+(++u)};
eval(readFile(EXT_DIR + '/recorder.js'));
eval(readFile(EXT_DIR + '/main-world.js'));
G.document.addEventListener('proxxied-import-progress',(ev)=>console.log('  | '+ev.detail.line));

const N=120, PROJECT='p1', OWNER='o1', SB='https://xyz.supabase.co';
const mkc=(i,side)=>({uuid:side+i,order:i*10,name:'L'+i,set:side==='f'?'lrw':'shm',number:''+i,
  source:'scryfall',cmc:0,colors:[],color_identity:[],rarity:'common',mana_cost:'',type_line:'Basic Land',
  imageId:'https://i/'+side+i+'.png',isToken:false,isUserUpload:false,needs_token:false,hasBuiltInBleed:false,
  category:side==='f'?'Mainboard':undefined, isFlipped:side==='f'?false:undefined,
  isCardbackBack:side==='f'?true:undefined, linkedBackId:side==='f'?'b'+i:undefined,
  linkedFrontId:side==='b'?'f'+i:undefined, lang:side==='b'?'en':undefined,
  scryfall_meta:side==='f'?{ci:[],type:'Basic Land',layout:'normal',oracle:'o'}:undefined});
const clean=o=>JSON.parse(JSON.stringify(o));
const existing=[]; for(let i=0;i<5;i++) existing.push(clean(mkc(i,'f')),clean(mkc(i,'b')));
const GETU=`${SB}/rest/v1/projects?select=id,project_data,owner_user_id,updated_at,card_count&id=eq.${PROJECT}&owner_user_id=eq.${OWNER}`;
G.__responses[GETU]={status:200,ct:'application/json',body:JSON.stringify([{id:PROJECT,owner_user_id:OWNER,
  updated_at:'T0',card_count:5,project_data:{v:2,st:{},cards:existing}}])};
const sf=(nm,set,num)=>({id:'s'+set+num,name:nm,set,collector_number:num,lang:'en',cmc:0,colors:[],
  color_identity:[],rarity:'common',mana_cost:'',type_line:'Basic Land — '+nm,oracle_text:'o',layout:'normal',
  image_uris:{png:`https://cards.scryfall.io/png/${set}${num}.png?178394`}});
const pairs=[];
for(let i=1;i<=N;i++){
  pairs.push({front:{name:null,set:'lrw',number:''+i},back:{name:null,set:'shm',number:''+i}});
  G.__responses[`https://api.proxxied.com/api/scryfall/cards/lrw/${i}?lang=en`]={status:200,ct:'application/json',body:JSON.stringify(sf('Front'+i,'lrw',''+i))};
  G.__responses[`https://api.proxxied.com/api/scryfall/cards/shm/${i}?lang=en`]={status:200,ct:'application/json',body:JSON.stringify(sf('Back'+i,'shm',''+i))};
}
G.__responses['https://api.proxxied.com/api/cards/images/seed-urls']={status:200,ct:'application/json',body:'{"accepted":100,"results":["seeded"]}'};
G.__proxxiedRecorder.ids={ownerUserId:OWNER,projectId:PROJECT,supabaseOrigin:SB,apikey:'sb_publishable_x'};

// count + track concurrency
const counts={}; let inflight=0, peak=0;
const of=G.fetch;
G.fetch=function(url,init){
  const u=String(url);
  const k = u.includes('scryfall.com/cards/collection') ? 'scryfall bulk' : u.includes('/api/scryfall/') ? 'scryfall per-card (fallback)' : u.includes('seed-urls') ? 'seed-urls'
          : (init&&init.method==='PATCH') ? 'PATCH projects' : u.includes('/rest/v1/projects') ? 'GET projects' : 'other';
  counts[k]=(counts[k]||0)+1;
  inflight++; peak=Math.max(peak,inflight);
  if(init&&init.method==='PATCH'){
    const sent=JSON.parse(init.body);
    G.__responses[GETU]={status:200,ct:'application/json',body:JSON.stringify([{id:PROJECT,owner_user_id:OWNER,
      project_data:sent.project_data,updated_at:'T1',card_count:sent.card_count}])};
    G.__responses[`${SB}/rest/v1/projects?id=eq.${PROJECT}&owner_user_id=eq.${OWNER}&updated_at=eq.T0&select=id,updated_at`]=
      {status:200,ct:'application/json',body:JSON.stringify([{id:PROJECT,updated_at:'T1'}])};
  }
  const p=of.apply(this,arguments);
  return p.then(r=>{inflight--;return r;},e=>{inflight--;throw e;});
};
G.__responses[`${SB}/rest/v1/projects?id=eq.${PROJECT}&owner_user_id=eq.${OWNER}&updated_at=eq.T0&select=id,updated_at`]=
  {status:200,ct:'application/json',body:JSON.stringify([{id:PROJECT,updated_at:'T1'}])};

G.document.dispatchEvent(new G.CustomEvent('proxxied-import-request',{detail:{pairs}}));
let i=0; const go=()=>(++i>4000?fin():Promise.resolve().then(go));
function fin(){
  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  console.log('\n=== request counts for N='+N+' pairs ===');
  for(const k of Object.keys(counts).sort()) console.log('  %s: %s'.replace('%s',k).replace('%s',counts[k]));
  console.log('  TOTAL: '+total+'   (old scheme would be '+(3*N+3)+')');
  console.log('  peak concurrent in-flight: '+peak);
  const res=G.__downloads.filter(d=>d.name.includes('result-'));
  if(res.length) console.log('  verified: '+JSON.stringify(JSON.parse(res[res.length-1].text).verified));
  $.NSString.stringWithString(G.out.join('\n')).writeToFileAtomicallyEncodingError(OUT_DIR + '/result6.txt',true,$.NSUTF8StringEncoding,null);
}
Promise.resolve().then(go);
