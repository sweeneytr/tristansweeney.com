# Proxxied Pair Importer

Chrome extension that imports dualdisk front/back land pairs into a proxxied.com
proxy project, driven from your own real browser session (so it isn't blocked
by proxxied's Cloudflare bot protection).

## Load it

1. `chrome://extensions`
2. Enable **Developer mode** (top right)
3. **Load unpacked** → select this `proxxied-extension/` folder

## Use it

1. Open `https://proxxied.com` in the tab you want to import into, on the
   Proxy Builder page.
2. Click the extension icon.
3. Paste one pair per line:
   ```
   Swamp|LRW-290|SHM-290
   Forest|LRW-291|SHM-291
   ```
4. Click **Import into proxxied.com**. Progress shows in the popup and as an
   on-page overlay (top-right of the tab) — the overlay stays visible even if
   the popup closes.

## How it works

- **Front art**: typed directly into proxxied's decklist box as
  `Name (SET) NUM`, which their own parser (`CardInfoHelper.tsx`) resolves to
  the exact printing server-side. No UI art-picker needed for fronts.
- **Back art**: no such text shortcut exists for backs (confirmed via a HAR
  capture — assigning a back is always a manual per-card UI action). The
  extension clicks a "back"-labeled control on the newly-added card tile,
  types the back set/number into whatever search box appears, and clicks the
  first image result.

## Known-fragile part

The back-art step (`findBackArtControl` / `setBackArt` in `content.js`) was
written without ever seeing proxxied's live DOM — it's a best-effort
heuristic (button text/aria-label matching `/back/i`), not verified against
the real page. If it can't find a control, it logs every candidate button's
text/aria-label/title it found on the card so the right selector can be
identified quickly. If the search-results step picks the wrong element,
same idea — check the overlay log for what it saw.
