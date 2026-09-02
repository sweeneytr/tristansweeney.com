# Tests

`./run.sh` — syntax-checks the four extension scripts, then runs eight harnesses.

There is no node on this machine, so these run under JavaScriptCore via
`osascript -l JavaScript`. `stubs.js` fakes enough of a browser (fetch,
Headers, URL, localStorage, a DOM shim, Scryfall's bulk endpoint) that
`recorder.js` and `main-world.js` execute **unmodified** — the tests exercise
the shipped files, not a copy.

| harness | covers | the bug it caught |
|---|---|---|
| `harness.js` | recorder capture, write-diff, markdown report | — |
| `harness2.js` | template cloning within a project | — |
| `harness3.js` | auth header, `updated_at` CAS, `card_count`, 0-row guard | a `PATCH` matching no rows returned 200 and reported `✓ saved` |
| `harness4.js` | constant-field analysis | one template pair made every field look "constant", pasting `dfc_images` hashes onto unrelated cards |
| `harness5.js` | pair parsing, 2–4 fields | — |
| `harness6.js` | 120-pair batch, request counts | 363 requests → 10 |
| `harness7.js` | Scryfall bulk lookup + passthrough fallback | — |
| `harness8.js` | richest-template selection | selection compared a pooled count identical for every candidate, so it took whichever project came first |

Output lands in `out/` (gitignored). Add a case by copying the nearest
harness, registering fixtures in `G.__responses`, and adding an assertion to
`run.sh`.
