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
const PROJECT='empty',OWNER='o1',SB='https://xyz.supabase.co';

const pair=(i,rich,tag)=>{
  const f={uuid:tag+'f'+i,order:i*10,name:'N'+i,set:'lrw',number:''+i,source:'scryfall',cmc:0,colors:[],
    color_identity:[],rarity:'common',mana_cost:'',type_line:'T',imageId:'https://i/'+tag+i+'.png',
    isToken:false,isUserUpload:false,needs_token:false,hasBuiltInBleed:false,category:'Mainboard',
    isFlipped:false,linkedBackId:tag+'b'+i};
  if(rich) f.scryfall_meta={ci:[],type:'T',layout:'normal',oracle:'o'};
  else f.overrides={};
  const b={uuid:tag+'b'+i,order:i*10,name:'N'+i,set:'shm',number:''+i,source:'scryfall',lang:'en',cmc:0,
    colors:[],rarity:'common',mana_cost:'',type_line:'T',imageId:'https://i/'+tag+'b'+i+'.png',
    isToken:false,isUserUpload:false,needs_token:false,hasBuiltInBleed:false,linkedFrontId:tag+'f'+i,
    usesDefaultCardback:true};
  return [f,b];
};
const sparse=[],rich=[];
for(let i=1;i<=3;i++){ sparse.push(...pair(i,false,'s')); rich.push(...pair(i,true,'r')); }
// insertion order puts the sparse project first: the old code would take it
G.__proxxiedRecorder.projectData.set('sparse-project',{v:2,st:{},cards:sparse});
G.__proxxiedRecorder.projectData.set('rich-project',{v:2,st:{},cards:rich});

const GETU=`${SB}/rest/v1/projects?select=id,project_data,owner_user_id,updated_at,card_count&id=eq.${PROJECT}&owner_user_id=eq.${OWNER}`;
G.__responses[GETU]={status:200,ct:'application/json',body:JSON.stringify([{id:PROJECT,owner_user_id:OWNER,
  updated_at:'T0',card_count:0,project_data:{v:2,st:{},cards:[]}}])};
const sf=(nm,set,num)=>({id:'s'+set+num,name:nm,set,collector_number:num,lang:'en',cmc:0,colors:[],
  color_identity:[],rarity:'common',mana_cost:'',type_line:'T '+nm,oracle_text:'o',layout:'normal',
  image_uris:{png:`https://cards.scryfall.io/png/${set}${num}.png?178394`}});
for(const [set,num] of [['lrw','50'],['shm','50']])
  G.__responses[`https://api.proxxied.com/api/scryfall/cards/${set}/${num}?lang=en`]={status:200,ct:'application/json',body:JSON.stringify(sf('C'+set,set,num))};
G.__proxxiedRecorder.ids={ownerUserId:OWNER,projectId:PROJECT,supabaseOrigin:SB,apikey:'k'};

G.document.dispatchEvent(new G.CustomEvent('proxxied-import-request',{detail:{pairs:[
  {front:{name:null,set:'lrw',number:'50'},back:{name:null,set:'shm',number:'50'}}],dryRun:true}}));
let i=0; const go=()=>(++i>500?fin():Promise.resolve().then(go));
function fin(){
  const dl=G.__downloads.filter(d=>d.name.includes('dryrun'));
  const j=JSON.parse(dl[dl.length-1].text);
  console.log('\n=== templateInfo ==='); console.log(JSON.stringify(j.templateInfo,null,1));
  const f=j.cards[0];
  console.log('\nchose rich project:', j.templateInfo.fromProjectId==='rich-project');
  console.log('built card HAS scryfall_meta:', 'scryfall_meta' in f, JSON.stringify(f.scryfall_meta||null));
  $.NSString.stringWithString(G.out.join('\n')).writeToFileAtomicallyEncodingError(OUT_DIR + '/result8.txt',true,$.NSUTF8StringEncoding,null);
}
Promise.resolve().then(go);
