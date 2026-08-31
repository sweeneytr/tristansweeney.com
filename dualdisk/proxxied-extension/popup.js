const statusEl = document.getElementById('status');
const runBtn = document.getElementById('run');
const pairsEl = document.getElementById('pairs');

function log(line) {
  statusEl.textContent += line + '\n';
  statusEl.scrollTop = statusEl.scrollHeight;
}

function parsePairs(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, front, back] = line.split('|').map((s) => s && s.trim());
      const parseId = (id) => {
        const m = id && id.match(/^([A-Za-z0-9]+)-(\d+[A-Za-z]?)$/);
        return m ? { set: m[1].toLowerCase(), number: m[2] } : null;
      };
      const frontId = parseId(front);
      const backId = parseId(back);
      if (!name || !frontId || !backId) return { error: `Bad line: "${line}"` };
      return { name, front: frontId, back: backId };
    });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PROGRESS') log(msg.line);
});

runBtn.addEventListener('click', async () => {
  statusEl.textContent = '';
  const pairs = parsePairs(pairsEl.value);
  const errors = pairs.filter((p) => p.error);
  if (errors.length) {
    errors.forEach((e) => log('✗ ' + e.error));
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.startsWith('https://proxxied.com')) {
    log('✗ Switch to a proxxied.com tab first.');
    return;
  }

  log(`Importing ${pairs.length} pair(s)...`);
  chrome.tabs.sendMessage(tab.id, { type: 'IMPORT_PAIRS', pairs });
});
