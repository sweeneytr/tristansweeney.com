# Plan: Programmatically Create a Cube and Add Cards

Input format: `[{ count: 1, id: "LRW-300" }]` where `id` is `{SET}-{collector_number}`.

---

## Overview

The flow has three phases:

1. **Authenticate** — get a session cookie
2. **Create the cube** — blocked by reCAPTCHA; two options
3. **Resolve + add cards** — Scryfall lookup, then CubeCobra API

---

## Phase 1: Authenticate

CubeCobra uses cookie-based sessions.

```
POST https://cubecobra.com/user/login
Content-Type: application/x-www-form-urlencoded

username=<email>&password=<password>
```

Persist the returned `Set-Cookie` header and send it on all subsequent requests. The session cookie is named `connect.sid`.

> Note: `addtocube` does **not** require a CSRF token, only a valid session. CSRF is only required for cube creation.

---

## Phase 2: Create the Cube

Cube creation (`POST /cube/add/`) requires reCAPTCHA v2 plus a server-side security question. There is no way to bypass this programmatically without solving the captcha.

### Option A — Manual creation (recommended for simple use)

1. Create the cube in the browser at `https://cubecobra.com/cube/add`
2. After creation, the browser redirects to `/cube/view/{cubeId}`
3. Note the `cubeId` from the URL — this is a UUID

### Option B — Headless browser (for fully automated pipelines)

Use Playwright or Puppeteer to:

1. Navigate to `/cube/add`
2. Fill in the cube name field
3. Solve the reCAPTCHA (e.g. via a captcha-solving service like 2captcha)
4. Submit the form
5. Extract the cube ID from the redirect URL

```python
# Pseudocode
page.goto("https://cubecobra.com/cube/add")
page.fill("#name", "My Cube")
captcha_token = solve_recaptcha(site_key)  # via 2captcha or similar
page.evaluate(f"document.getElementById('g-recaptcha-response').value = '{captcha_token}'")
page.click("[type=submit]")
cube_id = page.url.split("/")[-1]
```

---

## Phase 3: Resolve Card IDs

CubeCobra's `addtocube` endpoint accepts Scryfall UUIDs as card identifiers. The input format `LRW-300` maps directly to Scryfall's set + collector number lookup.

### Per card: `LRW-300` → Scryfall UUID

```
GET https://api.scryfall.com/cards/lrw/300
```

Response field to extract: `id` (a UUID like `"3b5f7f3b-..."`)

Scryfall allows up to 10 req/s without a key. For large lists, use the bulk endpoint instead:

```
POST https://api.scryfall.com/cards/collection
Content-Type: application/json

{
  "identifiers": [
    { "set": "lrw", "collector_number": "300" },
    { "set": "iko", "collector_number": "141" }
  ]
}
```

Response: `data[].id` for each matched card.

### Handling `count > 1`

CubeCobra has no native count field on cards — each copy is a separate card entry. Expand the input before sending:

```python
def expand_cards(card_list):
    return [
        scryfall_id
        for entry in card_list
        for scryfall_id in [resolved[entry["id"]]] * entry["count"]
    ]
```

---

## Phase 4: Add Cards to the Cube

```
POST https://cubecobra.com/cube/api/addtocube/{cubeId}
Cookie: connect.sid=<session>
Content-Type: application/json

{
  "cards": ["uuid1", "uuid2", "uuid3"],
  "board": "mainboard",
  "createBlogPost": false
}
```

- `cards`: array of Scryfall UUIDs (or card objects with `cardID` field)
- `board`: `"mainboard"` (default) or `"maybeboard"`
- `createBlogPost: false`: suppress the auto-generated blog post / feed noise

Response: `{ "success": "true" }` on success, `4xx` with `message` on failure.

### Batching

There is no documented hard limit, but batch in groups of ~100 cards to be safe and avoid timeouts.

---

## Implementation

See [add_cards.py](add_cards.py). Set up and run with:

```bash
cd test/
poetry install
CUBECOBRA_EMAIL=you@example.com CUBECOBRA_PASSWORD=secret \
  poetry run cubecobra-import <cube_id> cards.json
```

---

## Error Cases to Handle

| Scenario | Response | Fix |
|---------|----------|-----|
| Card not in Scryfall | Missing from `data`, appears in `not_found` | Skip or log |
| Card ID not in CubeCobra DB | `addtocube` returns 500 | Scryfall ID mismatch; try `getdetailsforcards` to verify |
| Session expired | 403 from `addtocube` | Re-authenticate |
| Cube not found / not editable | 400 or 403 | Verify cube ID and ownership |
| Too many empty cubes | Cube creation blocked | Delete an empty cube first |
