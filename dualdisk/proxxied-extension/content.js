// Isolated-world content script: bridges the popup <-> the main-world scripts
// (recorder.js, main-world.js) which do the actual API work, and keeps an
// on-page log visible even if the popup closes.

let overlayEl = null;
let overlayBody = null;
let overlayHead = null;

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.style.cssText =
    'position:fixed;top:8px;right:8px;width:420px;max-height:70vh;display:flex;flex-direction:column;' +
    'background:rgba(20,20,20,0.92);color:#0f0;font:11px monospace;padding:8px;' +
    'border-radius:6px;z-index:2147483647;pointer-events:none;';
  overlayHead = document.createElement('div');
  overlayHead.style.cssText = 'color:#6cf;border-bottom:1px solid #333;padding-bottom:4px;margin-bottom:4px;';
  overlayHead.textContent = 'proxxied recorder: armed';
  overlayBody = document.createElement('div');
  overlayBody.style.cssText = 'overflow-y:auto;white-space:pre-wrap;';
  overlayEl.appendChild(overlayHead);
  overlayEl.appendChild(overlayBody);
  document.body.appendChild(overlayEl);
  return overlayEl;
}

function log(line) {
  console.log('[proxxied-importer]', line);
  ensureOverlay();
  overlayBody.textContent += line + '\n';
  overlayBody.scrollTop = overlayBody.scrollHeight;
  chrome.runtime.sendMessage({ type: 'PROGRESS', line }).catch(() => {});
}

document.addEventListener('proxxied-import-progress', (ev) => {
  log(ev.detail.line);
});

// The recorder pings after every captured request; keep the headline counters
// on the overlay and forward them to the popup if it happens to be open.
let lastStats = null;
document.addEventListener('proxxied-recorder-tick', (ev) => {
  lastStats = ev.detail;
  ensureOverlay();
  overlayHead.textContent =
    `proxxied recorder: ${lastStats.count} req · ${lastStats.endpoints} endpoints · ` +
    `${lastStats.diffs} write(s)` +
    (lastStats.ids ? ` · project ${String(lastStats.ids.projectId).slice(0, 8)}` : ' · no project seen') +
    (lastStats.revealSecrets ? ' · ⚠ SECRETS SHOWN' : '');
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
