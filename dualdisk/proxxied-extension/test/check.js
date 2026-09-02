ObjC.import('Foundation');
function readFile(p) {
  return ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null));
}
var files = $.NSProcessInfo.processInfo.arguments;
var argv = [];
for (var i = 0; i < files.count; i++) argv.push(ObjC.unwrap(files.objectAtIndex(i)));
var targets = argv.slice(4);
var bad = 0;
targets.forEach(function (f) {
  var src = readFile(f);
  if (!src) { console.log('MISSING ' + f); bad++; return; }
  try { new Function(src); console.log('OK   ' + f); }
  catch (e) { console.log('FAIL ' + f + ': ' + e.message); bad++; }
});
if (bad) $.NSApplication; 
