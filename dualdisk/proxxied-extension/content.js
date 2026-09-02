// Isolated-world content script: bridges the popup <-> the main-world scripts
// (recorder.js, main-world.js) which do the actual API work, and keeps an
// on-page log visible even if the popup closes.

let overlayEl = null;
let overlayBody = null;

// The overlay is for progress you can read while the popup is closed, so it
// only exists once there is something to say - it is not a status readout that
// sits on the page. Diagnostics go to the console instead.
function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.style.cssText =
    'position:fixed;top:12px;right:12px;width:340px;max-height:50vh;display:flex;flex-direction:column;' +
    'background:rgba(24,24,27,0.94);color:#f4f4f5;font:13px/1.5 system-ui,sans-serif;padding:12px 14px;' +
    'border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,0.3);z-index:2147483647;pointer-events:none;';
  const head = document.createElement('div');
  head.style.cssText = 'font-weight:600;font-size:12px;color:#a1a1aa;margin-bottom:6px;';
  head.textContent = 'Proxxied importer';
  overlayBody = document.createElement('div');
  overlayBody.style.cssText = 'overflow-y:auto;';
  overlayEl.appendChild(head);
  overlayEl.appendChild(overlayBody);
  document.body.appendChild(overlayEl);
  return overlayEl;
}

const MAX_LINES = 12;

function log(line) {
  ensureOverlay();
  const row = document.createElement('div');
  row.style.cssText = 'margin:2px 0;' + (/^✗|^⚠/.test(line) ? 'color:#fca5a5;' : /^✓/.test(line) ? 'color:#86efac;' : '');
  row.textContent = line;
  overlayBody.appendChild(row);
  while (overlayBody.children.length > MAX_LINES) overlayBody.removeChild(overlayBody.firstChild);
  overlayBody.scrollTop = overlayBody.scrollHeight;
  chrome.runtime.sendMessage({ type: 'PROGRESS', line }).catch(() => {});
}

document.addEventListener('proxxied-import-progress', (ev) => {
  log(ev.detail.line);
});

// Recorder counters are for the popup's discovery panel; they must not create
// or annotate the overlay, or every page load would sprout one.
let lastStats = null;
document.addEventListener('proxxied-recorder-tick', (ev) => {
  lastStats = ev.detail;
  chrome.runtime.sendMessage({ type: 'STATS', stats: lastStats }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'IMPORT_PAIRS') {
    log(`${msg.dryRun ? 'Dry run for' : 'Importing'} ${msg.pairs.length} pair(s)...`);
    document.dispatchEvent(
      new CustomEvent('proxxied-import-request', { detail: { pairs: msg.pairs, dryRun: !!msg.dryRun } })
    );
  } else if (msg.type === 'RECORDER') {
    document.dispatchEvent(
      new CustomEvent('proxxied-recorder-command', { detail: { command: msg.command, arg: msg.arg } })
    );
  } else if (msg.type === 'GET_STATS') {
    sendResponse(lastStats);
    document.dispatchEvent(new CustomEvent('proxxied-recorder-command', { detail: { command: 'stats' } }));
  }
});

// Ask for a first stats tick so the overlay shows something even on a quiet page.
document.dispatchEvent(new CustomEvent('proxxied-recorder-command', { detail: { command: 'stats' } }));
