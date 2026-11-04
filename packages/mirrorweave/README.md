# Mirrorweave

A Lorwyn/Morningtide cube paired card-for-card with Shadowmoor/Eventide, to be
printed as double-faced cards: the day face on the front, its night counterpart
on the back. Flip the cube and you flip the plane.

Named for the Shadowmoor instant — *each other creature becomes a copy of target
creature* — which is more or less what the project does to 137 cards.

```bash
pnpm --filter @aelar/mirrorweave dev     # http://localhost:5183
pnpm --filter @aelar/mirrorweave build
pnpm --filter @aelar/mirrorweave data    # regenerate src/data/pairs.json
```

## State lives in the URL

React Router is the only store for view, section and search — there is no
`useState` for any of them. Every piece of UI state is addressable:

| Route | Meaning |
| --- | --- |
| `/color` | grouped by colour lane |
| `/cycle` | grouped by design cycle |
| `/rarity` | grouped by rarity, which sets copy count |
| `/color/lands` | that section scrolled into view |
| `/cycle/legends?q=elf` | a section, filtered |

Scrolling rewrites the section segment with `replace: true`, so the address bar
tracks where you are without filling up history.

Two things are *not* in the URL, because they are per-viewer rather than
per-link: which pairs you have printed, and which sections you have folded away.
Both live in `localStorage`.

## Data

`src/data/pairs.json` is generated from `lorwyn_shadowmoor_dfc_pairs.csv` at the
repo root by `scripts/build-data.mjs`. Edit the pairing pipeline, re-run
`pnpm data`, and Vite hot-reloads the change.

Copy counts follow rarity — four of each common, two of each uncommon, one of
each rare, with the rarer face deciding a mismatched pair. The five Vivid lands
are a named exception at three apiece.

## Printing

Every section, mana band and individual pair has a copy button producing the
format `dualdisk/proxxied-extension` parses: `Front|Back|SET-NUM|SET-NUM`, one
line per copy.
