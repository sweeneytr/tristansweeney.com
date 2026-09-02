const statusEl = document.getElementById('status');
const statsEl = document.getElementById('stats');
const pairsEl = document.getElementById('pairs');
const revealEl = document.getElementById('reveal');

function log(line) {
  statusEl.textContent += line + '\n';
  statusEl.scrollTop = statusEl.scrollHeight;
}

function renderStats(s) {
  if (!s) {
    statsEl.textContent = 'no data yet — open a proxxied.com project tab';
    return;
  }
  statsEl.textContent =
    `${s.count} requests · ${s.endpoints} endpoints · ${s.diffs} project_data write(s)\n` +
    (s.ids
      ? `project ${s.ids.projectId}\nowner   ${s.ids.ownerUserId}\nsupabase ${s.ids.supabaseOrigin}`
      : 'no project traffic observed yet — load/click a project');
  if (s.revealSecrets) statsEl.textContent += '\n⚠ secrets will be included in exports';
  revealEl.checked = !!s.revealSecrets;
}

// The two faces are different physical cards, so each carries its own name.
// Both are looked up from Scryfall, which makes the name columns optional:
//
//   FRONT|BACK                        both names from Scryfall
//   FrontName|FRONT|BACK              front name overridden, back from Scryfall
//   FrontName|BackName|FRONT|BACK     both overridden
//
// The trailing two fields are always the printings, so leading name columns
// are identified by position rather than by counting from the left.
function parsePairs(text) {
  const parseId = (id) => {
    const m = id && id.match(/^([A-Za-z0-9]+)-(\d+[A-Za-z]?)$/);
    return m ? { set: m[1].toLowerCase(), number: m[2] } : null;
  };

  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((s) => (s || '').trim());
      if (parts.length < 2 || parts.length > 4) {
        return { error: `Bad line (want 2-4 fields, got ${parts.length}): "${line}"` };
      }
      const frontId = parseId(parts[parts.length - 2]);
      const backId = parseId(parts[parts.length - 1]);
      if (!frontId || !backId) {
        return { error: `Bad line (last two fields must be SET-NUMBER): "${line}"` };
      }
      const names = parts.slice(0, parts.length - 2).filter(Boolean);
      return {
        front: Object.assign({ name: names[0] || null }, frontId),
        back: Object.assign({ name: names.length > 1 ? names[1] : null }, backId),
      };
    });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PROGRESS') log(msg.line);
  else if (msg.type === 'STATS') renderStats(msg.stats);
});

async function activeProxxiedTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.startsWith('https://proxxied.com')) {
    log('✗ Switch to a proxxied.com tab first.');
    return null;
  }
  return tab;
}

async function sendRecorder(command, arg) {
  const tab = await activeProxxiedTab();
  if (!tab) return;
  chrome.tabs.sendMessage(tab.id, { type: 'RECORDER', command, arg });
}

for (const [id, command] of [
  ['scan', 'scan'],
  ['openapi', 'openapi'],
  ['auth', 'auth'],
  ['export-md', 'export-md'],
  ['export-json', 'export-json'],
  ['clear', 'clear'],
]) {
  document.getElementById(id).addEventListener('click', () => sendRecorder(command));
}

revealEl.addEventListener('change', () => {
  if (revealEl.checked && !confirm('Exports will contain real session tokens and cookies. Continue?')) {
    revealEl.checked = false;
    return;
  }
  sendRecorder('reveal', revealEl.checked);
});

async function runImport(dryRun) {
  statusEl.textContent = '';
  const pairs = parsePairs(pairsEl.value);
  const errors = pairs.filter((p) => p.error);
  if (errors.length) {
    errors.forEach((e) => log('✗ ' + e.error));
    return;
  }
  if (!pairs.length) {
    log('✗ No pairs entered.');
    return;
  }
  const tab = await activeProxxiedTab();
  if (!tab) return;
  log(`${dryRun ? 'Dry run for' : 'Importing'} ${pairs.length} pair(s)...`);
  chrome.tabs.sendMessage(tab.id, { type: 'IMPORT_PAIRS', pairs, dryRun });
}

document.getElementById('run').addEventListener('click', () => runImport(false));
document.getElementById('dryrun').addEventListener('click', () => runImport(true));

(async () => {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]);
  if (tab && tab.url && tab.url.startsWith('https://proxxied.com')) {
    chrome.tabs.sendMessage(tab.id, { type: 'GET_STATS' }, (stats) => {
      if (!chrome.runtime.lastError) renderStats(stats);
    });
  } else {
    renderStats(null);
  }
})();
