# Proxxied API recorder + pair importer

Chrome extension with two jobs:

1. **Discover and document proxxied.com's API** by recording everything the real
   app does, from inside a real browser tab.
2. **Import dualdisk front/back land pairs** into a project, building the card
   objects from what the recording actually showed rather than from guesses.

Everything runs as HTTP calls made from your own logged-in tab, so it isn't
blocked by Cloudflare bot protection and it inherits the app's session.

## What proxxied.com looks like from the outside

The live project state is a single JSONB column (`projects.project_data`, shape
`{v, st, cards: [...]}`) in Supabase, read and written directly by the frontend
via Supabase's auto-generated REST API (PostgREST) — there is no custom backend
endpoint for "add a card".

Three things about that API are easy to get wrong, and all three were found by
recording rather than by reading:

- **Every call is authenticated.** Alongside the publishable `apikey` (which
  identifies the project, not a person — it is an `sb_publishable_...` key, not
  a JWT), each request carries `authorization: Bearer <the user's JWT>`. A
  request with only the `apikey` is anonymous, and RLS answers it with
  **HTTP 200 and `[]`** rather than a 401. So an unauthenticated read looks
  like "project not found", and an unauthenticated *write* looks like success
  while changing nothing.
- **Saves are compare-and-swap.** The app writes with
  `?id=eq.<id>&owner_user_id=eq.<uid>&updated_at=eq.<the value it last read>`.
  Omitting that guard clobbers concurrent edits — and after any write, an open
  tab holds a stale `updated_at`, so *its* next save silently matches zero rows
  and the work done in the UI is lost. Reload after importing.
- **A save writes nine columns**, not just `project_data`: `name`, `settings`,
  `project_data`, `card_count`, `tcg_id`, `hero_url`, `hero_manually_set`,
  `hero_position`, `tags`. `card_count` counts *physical* cards, so a linked
  front/back pair counts once.

Tables seen in traffic: `projects`, `profiles`, `decks`, `subscriptions`,
`plans`, `plan_entitlements`, `project_action_history`, `activity_log`. RPCs:
`evaluate_all_feature_flags(p_user_id, p_user_plan_tier)`,
`prune_project_action_history`, `prune_activity_log_for_user`. Backend routes:
`/api/scryfall/{cards,prints,sets,search,deck-prices}`, `/api/uploads`,
`/api/cards/images/{seed-urls,proxy,mpc}`.

### Card images

Settled by recording the app assign a printing to a back face:

- `imageId` — Scryfall's `image_uris.png` **with the query stripped**:
  `https://cards.scryfall.io/png/front/4/3/<id>.png`
- `imageUrl` — the same URL **keeping** Scryfall's cache-busting query
  (`...png?1783942703`). Optional: 36 of 54 Scryfall cards in the LRW-SHM
  project have no `imageUrl` at all.
- Before referencing an image, the app POSTs it to
  `https://api.proxxied.com/api/cards/images/seed-urls` as
  `{"urls": ["<stripped url>"]}` → `{"accepted": 1, "results": ["seeded"]}`.
  This warms proxxied's CDN copy. **No auth** — only a JSON content-type.

The `https://img.proxxied.com/cached-images/<sha1>.png?v=<ts>` form found on
some older cards is *not* what the app writes today; raw Scryfall URLs are.

### Two ways a back gets set

Both were recorded, and they differ:

- **Re-linking** a front to a different back removes the card object and
  re-adds it with fresh `uuid`s.
- **Assigning art** to an existing cardback mutates it in place: `source`
  `cardback`→`scryfall`, `imageId` replaced, `hasBuiltInBleed` `true`→`false`,
  and `set`/`number`/`cmc`/`colors`/`type_line`/`rarity`/`mana_cost`/`lang`/
  `needs_token`/`isToken` added.

That summary came out of this extension. Re-derive it (and everything it
leaves out) with the discovery tools below.

## Discovery

`recorder.js` loads in the page's own JS realm at `document_start`, before the
app boots, and patches `fetch`, `XMLHttpRequest`, `sendBeacon` and `WebSocket`.
It is **passive**: it records, and never alters what the page sends.

For each request it keeps the URL, method, headers, request and response bodies,
status, timing, and the bundle frame that made the call.

On top of the raw log it derives:

- **An endpoint inventory** — calls grouped by method and path template (ids
  collapsed to `:uuid`/`:n`), with the query params, headers and status codes
  actually observed on each.
- **Inferred body schemas** — every observed instance of a request or response
  body merged into one shape, with per-field presence counts. A field marked
  `present 4/5` is genuinely optional; that is the part a single captured
  example can never tell you.
- **A `project_data.cards[]` schema**, split by role (front / back / unlinked /
  upload / token), merged across every card in every snapshot seen.
- **A diff for every write.** Each time the app `PATCH`es `project_data`, it is
  compared against the last version read. Cards are matched by `uuid`, so the
  output is "these two card objects were added" rather than "every index after
  40 shifted". This is the ground truth for what a given UI action writes —
  click something in the app, then read the diff.

Two **active** probes, only ever run when you click them:

- **Scan bundles** — fetches the app's own JS chunks and greps out every
  `.from("table")`, `.rpc("fn")`, storage bucket, realtime channel, `/api/...`
  path and embedded JWT.

  **On proxxied.com this mostly does not work, by design.** The bundle is
  obfuscated: string literals are split and resolved at runtime from an encoded
  lookup table, so the code reads
  ``fetch(S('/api/accou' + av(0x206,'yN(y')))``. Static greps therefore return
  truncated fragments (`/api/accou`) and miss table and RPC names entirely. The
  scan detects this, says so, and falls back to the table/RPC list derived from
  observed traffic — which obfuscation cannot defeat, because those URLs were
  really requested.
- **PostgREST schema** — PostgREST self-documents at its REST root. **Also
  unavailable here:** the root rejects `sb_publishable_...` keys with
  `401 Secret API key required`. The probe reports that and falls back to
  traffic. It is kept for other Supabase projects, where it still works.

### Exports

- **Export API report (.md)** — a readable reference: origins, auth model,
  endpoint inventory and detail, card schema, observed writes, bundle findings,
  PostgREST tables, WebSocket frames. Written in the same shape as
  `../cubecobra.api.md`, so it can land next to it as `proxxied.api.md`.
- **Export capture (.json)** — the complete raw log, for anything the report
  doesn't cover.

### Secrets

Values of `authorization`, `cookie` and friends, and body keys like
`access_token`/`password`, are **redacted by default** — replaced with a length
and hash. JWT *claims* are kept (role, ref, sub, expiry) because whether a call
runs as `anon` or `authenticated` is the single most important thing about an
auth model, and the claims are not the secret; the signature is. The Supabase
anon `apikey` is kept in full: it ships publicly in the JS bundle, and the
report is useless without it.

The **Include secret values in exports** checkbox turns redaction off, behind a
confirmation. Leave it off unless you have a reason, and don't commit an export
made with it on.

## Importing pairs

The old importer reconstructed the card object from one observed example and
hoped. It now uses the recording instead:

1. Find a front/back pair **the app itself created** in this project and use it
   as the shape template.
2. Recompute every field that comes from the printing (name, set, number, cmc,
   colors, type line, image, `scryfall_meta`, …) from Scryfall's bulk
   `POST /cards/collection` endpoint — 75 identifiers per request, so a
   300-pair batch resolves in 8 calls rather than 600.

   This goes to `api.scryfall.com` directly rather than through proxxied's
   `/api/scryfall/cards/{set}/{number}` passthrough. That passthrough exists to
   get past *proxxied's* Cloudflare, which has nothing to do with Scryfall;
   Scryfall serves `Access-Control-Allow-Origin: *`, and both return the same
   fields. Anything Scryfall reports in `not_found` falls back to the
   passthrough, so a numbering disagreement degrades instead of failing.
2b. Seed each image URL via `/api/cards/images/seed-urls`, as the app does.
3. For fields with no Scryfall source, ask every Scryfall pair the recorder has
   seen — pooled across **all** the user's projects, not just the target. A
   value that is present on every one of them and never varies is a constant
   and gets carried (`source: "scryfall"`, `category: "Mainboard"`); anything
   else is content belonging to the template card and is dropped with a
   warning rather than silently copied.

   Both halves of that test matter, and each was learned the hard way:

   - **Two examples minimum.** With one, every field trivially has a single
     value, so "constant" would mean "everything" — and the template's own
     `scryfall_meta.dfc_images` hashes and `isFlipped` state would ride onto
     every imported card.
   - **Present on all of them.** A field only one card carries also has a
     single distinct value. Requiring full presence is what keeps a lone
     card's `dfc_names` from being mistaken for a project-wide constant.
4. Assign fresh `uuid`s, the next `order`, and cross-link `linkedFrontId` /
   `linkedBackId`.

Both sides of the template must be real Scryfall cards. Checking only the front
is not enough: a project whose fronts are linked to the default cardback
(`source: "cardback"`, nine fields, `imageId: "cardback_builtin_proxxied"`)
would otherwise donate a cardback as the template for a printed back. If the
target project has no usable pair, a template is borrowed from any other
project the recorder has seen, and it says which.

Both the carried and the dropped fields are printed, so nothing is guessed
behind your back. With fewer than two existing pairs the constant analysis has
no signal and says so — check the result file in that case.

If the project has no existing scryfall pair at all, it falls back to the old
hand-reconstructed schema and warns.

## Load it

1. `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this `proxxied-extension/` folder
4. If it was already loaded, click its reload icon, then reload the
   proxxied.com tab (the recorder must be present before the page boots)

## Use it

Open your project on `https://proxxied.com`. The on-page overlay (top right)
shows the live request/endpoint/write counters.

**To document the API:** click around the app doing the things you want
documented — add a card, flip one, change a setting, save. Then open the popup,
hit **Scan bundles** and **PostgREST schema**, and **Export API report**.

**To import pairs:** make sure the project is fully loaded (the extension needs
to observe at least one of the app's own project calls to learn which project to
target), then paste one pair per line.

The last two fields are always the front and back printings. The two faces are
different physical cards, so each gets **its own name**, looked up from
Scryfall — which makes the name columns optional overrides:

```
LRW-290|SHM-290                     both names from Scryfall
Ajani Goldmane|LRW-1|SHM-1          front name overridden, back looked up
Ajani|Apothecary|LRW-1|SHM-1        both overridden
```

An override that disagrees with the printing is applied and logged, so a typo
is visible rather than silent.

**Import** downloads a backup of the current `project_data`, `PATCH`es, reads
the project back to confirm the new cards are really there, downloads that
confirmation as `proxxied-result-*.json`, and then **reloads the page
automatically**.

The read-back exists because the reload destroys the evidence: the in-page log
goes with it, and the recorder restarts empty, so without a written artifact
there is no way to tell afterward whether the write survived. A returned row
proves the update applied; only a fresh read proves it is still there.

That reload is not a convenience. The open tab still holds the pre-import state
and a stale `updated_at`, so its next autosave fails the compare-and-swap — and
the app reacts by **immediately retrying without the guard**, force-overwriting
the import with its own stale state. Recorded happening eight seconds after a
real import:

```
03:05:40 IMPORTER CAS    rows=1  cards=4  [42280cc4, ae08cd96, e44e91c6, 20c181f7]
03:05:48 app      CAS    rows=0  cards=2  [42280cc4, ae08cd96]   <- guard rejected it
03:05:48 app      NO-CAS rows=1  cards=2  [42280cc4, ae08cd96]   <- forced; import gone
```

Never leave the tab sitting on a project you just imported into.

## ⚠️ Importing bypasses the app's own undo history

Editing through the UI also writes an undo entry, which is what powers in-app
undo. This extension writes directly to `project_data` and does **not** create
those entries — there's no "Ctrl+Z" inside proxxied.com for what it does. That's
why it downloads a full backup of the project's prior state before writing: if
something goes wrong, that JSON file has everything needed to restore it via the
same `PATCH` mechanism.

The shape is now known — `POST /rest/v1/project_action_history` returns `201`
for:

```
owner_user_id, project_id,
action_type    e.g. "art.assign"
summary        e.g. "Changed art for \"Proxxied\""
undo_payload   { cards: [ <the full prior card objects> ] }
redo_payload   { card_ids: [...], target_image_id: "...", ... }
metadata       { card_name, selected_face, affected_count, image_source }
```

(A parallel `POST /rest/v1/activity_log` records `{user_id, project_id, action,
metadata}`, and both are trimmed by `prune_project_action_history` /
`prune_activity_log_for_user`.)

Writing undo entries is deliberately **not** implemented. Only one
`action_type` has been observed (`art.assign`), and the correct type and
payload for "added a pair" is unknown — inventing one is exactly the
single-example guessing that produced the original broken schema. To settle it,
add a pair through the UI with the recorder running and read what it posts.

## Output

The popup and the on-page overlay carry progress and outcomes in plain
language — what is being looked up, what was built, what was saved, and any
warning that needs acting on. Everything diagnostic (request URLs, raw response
bodies, token fragments, uuids, template internals) goes to the **browser
console** instead, under `[proxxied-importer]` / `[proxxied-recorder]`.

The overlay only appears once there is something to report, so a page with no
import running stays clean.

## Known-fragile parts

- Backs come in four kinds (`scryfall`, `mpc`, `cardback`, `upload-library`);
  only `scryfall` is handled.
- The importer creates pairs the way "re-linking" does (two fresh card objects),
  not the way "assign art" does (mutating a cardback in place). Both produce
  valid-looking state, but only the first has been exercised end to end.
- `isFlipped` is forced to `false` on new cards. Observed writes create cards
  unflipped and only set it when a user flips one, so it is display state
  rather than something to inherit from a template.
- The constant analysis is only as good as the corpus. Importing into a brand
  new account with a single hand-made pair leaves it with nothing to compare,
  and more fields than usual will be dropped — that is the intended
  conservative failure, not a bug.
- The importer's field mapping (`FIELD_SOURCES` in `main-world.js`) covers the
  fields seen so far. A card kind that carries fields no existing card in the
  project has — or whose unknown fields vary per card — will show up in the
  dropped-field warnings. That warning is the signal to record the app creating
  one and extend the mapping.
- Capture is capped (3000 entries, 250KB per body) to keep a long session from
  growing without bound; the oldest entries are dropped first.
- Bulk lookup resolves by `set` + `collector_number`, which returns the default
  (English) printing. Importing a specifically non-English printing would need
  the passthrough's `?lang=` parameter instead.
- A batch is still one all-or-nothing write: every pair is resolved and built
  before the single `PATCH`. A failure at pair 250 of 300 writes nothing.
- The recorder must load before the app. If you reload the extension without
  reloading the page, you'll see partial traffic.
