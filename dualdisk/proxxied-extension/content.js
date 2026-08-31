function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function setNativeValue(el, value) {
  const proto =
    el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function waitFor(predicate, { timeout = 8000, interval = 200 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const result = predicate();
    if (result) return result;
    await sleep(interval);
  }
  return null;
}

function isVisible(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

// --- on-page status overlay, so progress is visible even if the popup closes ---
let overlayEl = null;
function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement('div');
  overlayEl.style.cssText =
    'position:fixed;top:8px;right:8px;width:360px;max-height:60vh;overflow-y:auto;' +
    'background:rgba(20,20,20,0.92);color:#0f0;font:11px monospace;padding:8px;' +
    'border-radius:6px;z-index:2147483647;white-space:pre-wrap;pointer-events:none;';
  document.body.appendChild(overlayEl);
  return overlayEl;
}

function log(line) {
  console.log('[proxxied-importer]', line);
  const el = ensureOverlay();
  el.textContent += line + '\n';
  el.scrollTop = el.scrollHeight;
  chrome.runtime.sendMessage({ type: 'PROGRESS', line }).catch(() => {});
}

function findDecklistTextarea() {
  const textareas = Array.from(document.querySelectorAll('textarea')).filter(isVisible);
  if (textareas.length === 0) return null;
  if (textareas.length === 1) return textareas[0];
  // Prefer one whose placeholder/aria-label hints at a decklist.
  const hinted = textareas.find((t) =>
    /deck|card|paste|import/i.test(t.placeholder || t.getAttribute('aria-label') || '')
  );
  return hinted || textareas[0];
}

function findSubmitButtonNear(el) {
  // Look inside the nearest form first, then fall back to buttons near the textarea.
  const form = el.closest('form');
  const scope = form || el.parentElement?.parentElement || document;
  const buttons = Array.from(scope.querySelectorAll('button')).filter(isVisible);
  const match = buttons.find((b) => {
    const t = b.textContent.trim();
    if (/token/i.test(t)) return false; // avoid "Add Associated Tokens" etc.
    return /^(fetch|add|import|submit|build|generate|create)\b/i.test(t);
  });
  return match || buttons[0] || null;
}

// proxxied.com's card tiles are the outermost `[data-card-id]` element - a stable,
// unique identifier per card, and clicking it directly (not a nested overlay control
// like the flip/select buttons) opens its art picker.
function allCardTiles() {
  return Array.from(document.querySelectorAll('[data-card-id]')).filter(isVisible);
}

async function addCardByName(fullQuery, name) {
  const textarea = findDecklistTextarea();
  if (!textarea) throw new Error('could not find the decklist textarea on the page');

  const before = new Set(allCardTiles());

  setNativeValue(textarea, fullQuery);
  await sleep(200);

  const submitBtn = findSubmitButtonNear(textarea);
  if (!submitBtn) throw new Error('could not find an Add/Submit button near the decklist textarea');
  log(`  clicking button: "${submitBtn.textContent.trim()}"`);
  submitBtn.click();

  log(`  submitted "${fullQuery}", waiting for the card to appear...`);

  const newTile = await waitFor(() => {
    const now = allCardTiles();
    const added = now.filter((el) => !before.has(el));
    return added.length ? added[added.length - 1] : null;
  }, { timeout: 15000 });

  if (!newTile) {
    log(
      `  diagnostics: textarea value is now "${textarea.value}", ` +
        `${allCardTiles().length} card tile(s) on page total`
    );
    throw new Error(`card "${name}" did not appear after submitting`);
  }
  return newTile;
}

function findButtonMatching(regex) {
  return Array.from(document.querySelectorAll('button')).filter(isVisible).find((b) => regex.test(b.textContent)) || null;
}

function findCloseButton() {
  return Array.from(document.querySelectorAll('button')).filter(isVisible).find((b) => b.querySelector('svg.lucide-x')) || null;
}

function findBackTabButton() {
  // The front/back toggle's label text is user-renameable, but its wrapper always
  // carries a stable data-value="back" attribute.
  const wrapper = document.querySelector('[data-value="back"]');
  if (!wrapper) return null;
  return wrapper.querySelector('button') || wrapper;
}

async function setBackArt(cardTile, name, backSet, backNumber) {
  cardTile.click();
  log('  clicked the card, waiting for the art picker to open...');

  const backTab = await waitFor(() => findBackTabButton(), { timeout: 6000 });
  if (!backTab) throw new Error('could not find the back tab ([data-value="back"]) in the art picker');
  backTab.click();
  log('  clicked the back tab to switch to the back face');
  await sleep(400);

  const searchToggle = await waitFor(() => findButtonMatching(/search for a different card/i), { timeout: 6000 });
  if (!searchToggle) throw new Error('could not find "Search for a different card..." button');
  searchToggle.click();
  log('  opened the card search');

  const searchInput = await waitFor(() => {
    const inputs = Array.from(document.querySelectorAll('input')).filter(isVisible);
    return inputs.find((el) => el.placeholder === 'Search card name...') || null;
  }, { timeout: 6000 });
  if (!searchInput) throw new Error('no "Search card name..." input appeared after opening the card search');
  await sleep(1000); // let the search UI finish mounting/animating before typing into it

  const backQuery = `${name} (${backSet}) ${backNumber}`;
  setNativeValue(searchInput, backQuery);
  log(`  typed "${backQuery}" into the search, waiting for results...`);
  await sleep(1200); // debounce + fetch

  const results = await waitFor(() => {
    const found = Array.from(document.querySelectorAll('[data-testid="artwork-card"]')).filter(isVisible);
    return found.length ? found : null;
  }, { timeout: 6000 });
  if (!results) throw new Error('no artwork-card results found after searching');

  // Each result shows a hover label like "SHM #290" - use it to confirm we pick the exact
  // printing rather than trusting result order.
  const wantedLabel = `${backSet.toUpperCase()} #${backNumber}`;
  const exactMatch = results.find((el) => el.textContent.toUpperCase().includes(wantedLabel));
  const best = exactMatch || results[0];
  if (!exactMatch) {
    log(`  no result labelled "${wantedLabel}" among ${results.length} result(s); using the first one instead`);
  }
  best.click();
  log(`  clicked the ${exactMatch ? 'matching' : 'first'} artwork-card result.`);
  await sleep(500);

  const closeBtn = await waitFor(() => findCloseButton(), { timeout: 4000 });
  if (closeBtn) {
    closeBtn.click();
    log('  closed the art picker');
  } else {
    log('  could not find a close (X) button - picker may still be open');
  }
}

async function importOnePair(pair) {
  const frontQuery = `${pair.name} (${pair.front.set}) ${pair.front.number}`;
  const cardTile = await addCardByName(frontQuery, pair.name);
  log(`  card added with front = ${pair.front.set.toUpperCase()}-${pair.front.number}`);

  await setBackArt(cardTile, pair.name, pair.back.set, pair.back.number);
}

function clickButtonWithExactText(text) {
  const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).filter(isVisible);
  const match = buttons.find((b) => b.textContent.trim().toLowerCase() === text.toLowerCase());
  if (match) match.click();
  return !!match;
}

async function ensureScryfallSource() {
  // The card-add source defaults to (or can be left on) MPC Autofill, which resolves by
  // name only - the "(SET) NUM" hint gets ignored, producing a random/generic printing.
  // Force it to Scryfall so exact-printing lookups actually take effect.
  if (clickButtonWithExactText('Scryfall')) {
    log('  set art source to Scryfall');
    await sleep(400);
  } else {
    log('  could not find a "Scryfall" source toggle button - proceeding anyway');
  }
}

async function importPairs(pairs) {
  await ensureScryfallSource();
  for (const pair of pairs) {
    log(`\n=== ${pair.name} (${pair.front.set.toUpperCase()}-${pair.front.number} / ${pair.back.set.toUpperCase()}-${pair.back.number}) ===`);
    try {
      await importOnePair(pair);
      log('✓ done');
    } catch (e) {
      log(`✗ failed: ${e.message}`);
    }
  }
  log('\nAll pairs processed.');
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'IMPORT_PAIRS') {
    importPairs(msg.pairs);
  }
});
