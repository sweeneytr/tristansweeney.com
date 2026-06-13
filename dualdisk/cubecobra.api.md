# CubeCobra API Reference

Base URL: `https://cubecobra.com`

---

## Authentication

Most write endpoints require a logged-in session (cookie-based). Some endpoints additionally require CSRF token validation.

| Middleware | Behavior |
|-----------|----------|
| `ensureAuth` | Redirects to `/user/login` if not authenticated |
| `ensureAuthJson` | Returns `403` JSON if not authenticated |
| `csrfProtection` | Validates CSRF token on mutating requests |
| `ensureRole(role)` | Role-based access (e.g. `admin`) |

---

## Archetypes

### `GET /api/archetypes/`

Get ML archetype cluster centers and human annotations.

**Auth:** None  
**Cache:** `public, max-age=86400` (24 hours)

**Response:**
```json
{
  "centers": [{ "clusterId": "string", "center": [0.0] }],
  "annotations": { "clusterId": "label" }
}
```

---

## Followers

### `GET /api/followers/:type/:id`

List followers/likers of a user or cube, paginated.

**Auth:** Optional  
**Path Params:**
- `type` — `user` or `cube`
- `id` — user or cube ID

**Query Params:**
- `limit` — default `100`
- `skip` — default `0`

**Response:**
```json
{ "followers": [User], "hasMore": true }
```

---

## Draft Bots (ML)

### `POST /api/draftbots/predict/`

Get ML pick ratings for a single draft pick decision.

**Auth:** None

**Request:**
```json
{
  "pack": ["oracle-uuid"],
  "picks": ["oracle-uuid"],
  "cubeContext": [0.0]
}
```

**Response:**
```json
{ "prediction": [{ "oracle": "uuid", "rating": 0.0 }] }
```

---

### `POST /api/draftbots/batchpredict/`

Get ML pick ratings for up to 20 draft picks at once.

**Auth:** None

**Request:**
```json
{
  "inputs": [
    { "pack": ["oracle-uuid"], "picks": ["oracle-uuid"] }
  ],
  "cubeContext": [0.0]
}
```

- Max 20 inputs per request.
- Sentinel values `"custom-card"` and `"voucher"` are accepted in place of oracle IDs.

**Response:**
```json
{ "prediction": [[{ "oracle": "uuid", "rating": 0.0 }]] }
```

---

### `POST /api/draftbots/cubecontext/`

Get a 32-dimensional embedding vector representing a cube's archetype tendencies.

**Auth:** None

**Request:**
```json
{ "cubeId": "string" }
```

**Response:**
```json
{ "embedding": [0.0] }
```

---

## Draftmancer Integration

### `POST /api/draftmancer/publish/`

Publish a draft result from an external Draftmancer session.

**Auth:** API key (`req.body.apiKey` must match `DRAFTMANCER_API_KEY` env var)

**Response:**
```json
{ "draftId": "string" }
```

---

## Users

### `GET /api/user/:id`

Get public user info by username.

**Auth:** None

**Response:** `{ "user": User }` or `404`

---

### `GET /user/view/:id`

Public profile page (HTML).

---

### `POST /user/login`
### `POST /user/register`
### `POST /user/logout`

Standard auth flows.

---

### `GET /user/account`

Current user account settings (HTML). **Auth required.**

---

### `POST /user/updateemail`
### `POST /user/updateuserinfo`
### `POST /user/deleteaccount`

Account management. **Auth + CSRF required.**

---

### `POST /user/follow/:id`
### `POST /user/unfollow/:id`

Follow or unfollow a user. **Auth + CSRF required.**

---

### `GET /user/notifications`
### `GET /user/notification/:id`
### `POST /user/clearnotifications`

Notification management. **Auth required.**

---

### Pagination Endpoints (User)

All accept `{ lastKey }` in body and return paginated lists.

| Endpoint | Returns |
|---------|---------|
| `POST /user/getmoreblogs` | Blog posts |
| `POST /user/getmorecubes` | Cubes |
| `POST /user/getmoredecks` | Draft decks |
| `POST /user/getmorenotifications` | Notifications |
| `POST /user/getmorepackages` | Card packages |

---

## Cubes

### `GET /cube/list/:id`

Cube card list view (HTML).

---

### `POST /cube/report/:id`

Report a cube. **Auth + CSRF required.**

---

### `POST /cube/remove/:id`

Delete a cube. **Auth + CSRF required.**

---

### `POST /cube/follow/:id`
### `POST /cube/unfollow/:id`

Follow/unfollow a cube. **Auth + CSRF required.**

---

### `GET /cube/isfollowed/:id`

**Auth:** Optional

**Response:** `{ "followed": true }`

---

### `POST /cube/pin/:id`
### `POST /cube/unpin/:id`

Pin/unpin a cube to dashboard. **Auth + CSRF required.**

---

### `GET /cube/ispinned/:id`

**Auth:** Optional

**Response:** `{ "pinned": true }`

---

### `GET /cube/samplepackimage/:id/:seed`

Generate a sample pack image.

**Auth:** None  
**Cache:** `public, max-age=86400, immutable`  
**Query Params:** `balanced=true`  
**Response:** PNG or WebP image

---

### `GET /cube/p1p1/:packId`

Pack 1 Pick 1 interface (HTML).

---

### `GET /cube/p1p1packimage/:packId`

P1P1 pack image.

---

## Cube API

### `POST /cube/api/cubemetadata/:id`

Get cube metadata.

**Auth:** Optional  
**Response:** `{ "success": true, "cube": Cube }`

---

### `GET /cube/api/cubelist/:id`

Get cube card names as plaintext (one per line).

**Auth:** Optional  
**CORS:** `Access-Control-Allow-Origin: *`  
**Query Params:** `date` (unix ms — returns list as of that date)  
**Response:** `text/plain`

---

### `GET /cube/api/mycubes`

Get the current user's cubes.

**Auth:** Required

**Response:**
```json
{ "cubes": [{ "id": "string", "name": "string", "pinned": false }] }
```

---

### `POST /cube/api/getdetailsforcards`

Batch card detail lookup.

**Auth:** None

**Request:**
```json
{ "cards": ["scryfall-id"] }
```

**Response:** `{ "details": [CardDetails] }`

---

### `POST /cube/api/adds`

Smart search for cards to add to a cube.

**Auth:** None

**Request:**
```json
{
  "cubeID": "string",
  "filterText": "cmc<=3 color=red",
  "skip": 0,
  "limit": 96,
  "printingPreference": "new"
}
```

**Response:**
```json
{ "cardIDs": ["oracle-uuid"], "hasMoreAdds": false }
```

---

### `POST /cube/api/cuts`

Get cut recommendations for a cube.

**Auth:** None

**Request:**
```json
{
  "cubeID": "string",
  "filterText": "string",
  "printingPreference": "new"
}
```

**Response:**
```json
{ "cuts": [{ "details": CardDetails, "cardID": "uuid" }] }
```

---

### `GET /cube/api/p1p1/:id`
### `GET /cube/api/p1p1/:id/:seed`

Generate a random (or seeded) Pack 1 Pick 1 pack.

**Auth:** Optional  
**Response:** `{ "seed": "string", "cards": [Card] }`

---

### `POST /cube/api/addtocube/:id`

Add cards to a cube.

**Auth:** Required

**Request:**
```json
{
  "cards": [Card],
  "packid": "optional-string",
  "autoTag": false,
  "board": "mainboard"
}
```

---

### `POST /cube/api/commit/:id`

Commit a set of changes (adds/cuts/swaps) to a cube.

**Auth:** Required

**Request:**
```json
{
  "changes": {
    "mainboard": {
      "adds": [Card],
      "removes": [{ "index": 0 }],
      "swaps": [{ "index": 0, "card": Card }]
    }
  },
  "expectedVersion": 42,
  "title": "Change title",
  "blog": "Optional blog post body"
}
```

**Response:** `{ "success": true }`

**Note:** `expectedVersion` is used for optimistic concurrency — returns `409` if the cube has been modified since the client last loaded it.

---

### `POST /cube/api/submitdraft/:id`

Save a completed draft.

**Auth:** Required

**Request:** `{ "id": "draft-id", "seat": 0, "owner": "user-id" }`

---

### `POST /cube/api/simulatesetup/:id`

Simulate draft setup (initial packs, card metadata, basics).

**Auth:** Rate-limited (8 requests / 30 min per user/IP)

**Request:**
```json
{
  "numDrafts": 1,
  "numSeats": 8,
  "formatId": 0
}
```

---

### `GET /cube/api/collaborators/:id`

List collaborators for a cube.

**Auth:** Optional  
**Response:** `{ "collaborators": [{ "id": "string", "username": "string", "imageUri": "string" }] }`

---

### `POST /cube/api/collaborators/:id/add`

Add a collaborator by username.

**Auth:** Required  
**Request:** `{ "username": "string" }`  
**Response:** `{ "collaborator": User }`

---

### `DELETE /cube/api/collaborators/:id/:userId`

Remove a collaborator.

**Auth:** Required  
**Response:** `{ "success": true }`

---

### Other Cube API Endpoints

| Endpoint | Notes |
|---------|-------|
| `GET /cube/api/cubecardnames/:id` | Card names for a cube |
| `GET /cube/api/cubecardpool/:id` | Full card pool |
| `GET /cube/api/cubecardtags/:id` | Tags on all cards |
| `POST /cube/api/cubetagcolors/:id` | Tag color config |
| `POST /cube/api/customsorts/:id` | Custom sort config |
| `GET /cube/api/date_updated/:id` | Last updated timestamp |
| `POST /cube/api/deckbuild/:id` | Deck building suggestions |
| `POST /cube/api/editoverview/:id` | Edit cube overview metadata |
| `POST /cube/api/editprimer/:id` | Edit cube primer |
| `POST /cube/api/getcardforcube/:id` | Lookup a specific card in cube |
| `POST /cube/api/getcombos/:id` | Get synergy combos |
| `POST /cube/api/getversions` | Get all printings for card IDs |
| `GET /cube/api/minprices/:id` | Minimum prices for all cards |
| `POST /cube/api/saveshowtagcolors/:id` | Toggle tag color visibility |
| `POST /cube/api/savesorts/:id` | Save sort preferences |
| `POST /cube/api/savetagcolors/:id` | Save tag color config |
| `POST /cube/api/seedcrystal/:id` | Seed recommendation crystal |
| `POST /cube/api/submitgriddraft/:id` | Submit a grid draft |
| `POST /cube/api/updatebasics/:id` | Update basic land counts |
| `GET /cube/api/usercubes/:id` | Get cubes owned by a user |

---

## Drafts

### `GET /draft/:id`

View a draft (HTML page with full cube context).

**Auth:** None

---

## Admin

Admin endpoints require `ensureRole('admin')`.

| Endpoint | Notes |
|---------|-------|
| `GET /cube/feature/:id` | Add cube to featured queue |
| `GET /cube/unfeature/:id` | Remove cube from featured queue |

---

## Standard Response Shape

```json
{
  "success": "true",
  "message": "optional error message"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Validation error |
| `403` | Not authenticated or forbidden |
| `404` | Not found |
| `409` | Optimistic concurrency conflict |
| `429` | Rate limited |
| `500` | Server error |
| `503` | ML service unavailable |

---

## Card ID Formats

| Format | Description |
|--------|-------------|
| Oracle ID | UUID — identifies a unique card across all printings |
| Scryfall ID | UUID — identifies a specific printing |
| `"custom-card"` | Sentinel for custom cards in draft bot inputs |
| `"voucher"` | Sentinel for voucher cards in draft bot inputs |
