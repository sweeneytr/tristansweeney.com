ObjC.import('Foundation');
// Paths come from the runner (run.sh) so this suite works from any checkout.
const ENV = $.NSProcessInfo.processInfo.environment;
const TEST_DIR = ObjC.unwrap(ENV.objectForKey('PX_TEST_DIR'));
const EXT_DIR = ObjC.unwrap(ENV.objectForKey('PX_EXT_DIR'));
const OUT_DIR = ObjC.unwrap(ENV.objectForKey('PX_OUT_DIR'));
const REPO_DIR = ObjC.unwrap(ENV.objectForKey('PX_REPO_DIR'));

function readFile(p){return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p,$.NSUTF8StringEncoding,null));}
globalThis.out=[];
const G=globalThis;
G.console={log:(...a)=>G.out.push(a.map(String).join(' '))};
// popup.js touches the DOM at load; stub just enough to reach parsePairs.
const noop={addEventListener(){},textContent:'',value:'',checked:false,scrollTop:0,scrollHeight:0};
G.document={getElementById:()=>noop,addEventListener(){}};
G.chrome={runtime:{onMessage:{addListener(){}},lastError:null},tabs:{query:()=>Promise.resolve([]),sendMessage(){}}};
const src=readFile(EXT_DIR + '/popup.js');
eval(src.slice(0, src.indexOf('chrome.runtime.onMessage.addListener')));

const cases=[
 'LRW-290|SHM-290',
 'Ajani Goldmane|LRW-1|SHM-1',
 'Ajani|Apothecary Initiate|LRW-1|SHM-1',
 'LRW-1',
 'a|b|c|LRW-1|SHM-1',
 'Name|NOTANID|SHM-1',
];
for(const c of cases){
  const r=parsePairs(c)[0];
  console.log(JSON.stringify(c)+'\n   -> '+JSON.stringify(r));
}
// the real file
const lines=readFile(REPO_DIR + '/dualdisk/lrw-shm-pairs.txt');
const all=parsePairs(lines);
const bad=all.filter(p=>p.error);
console.log('\nreal file: '+all.length+' lines, '+bad.length+' errors');
console.log('  line 1  -> '+JSON.stringify(all[0]));
console.log('  line 290-> '+JSON.stringify(all[289]));
$.NSString.stringWithString(G.out.join('\n')).writeToFileAtomicallyEncodingError(OUT_DIR + '/result5.txt',true,$.NSUTF8StringEncoding,null);
