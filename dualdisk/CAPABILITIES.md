# DualDisk Capabilities

DualDisk is a CLI tool for building and managing Magic: The Gathering proxy cubes on CubeCobra. The core concept is a **dual-faced cube**: each physical card has a front face from one set and a back face from another. Two CubeCobra cubes (front and back) mirror each other card-for-card.

Authentication is automatic — DualDisk reads your existing CubeCobra login from Chrome or Firefox cookies, so no separate login step is needed.

---

## CLI Commands

### `dualdisk import-cards`

Imports a list of front/back card pairs into two CubeCobra cubes.

Reads from a `dualdisk.toml` config file specifying the front cube ID, back cube ID, and path to a cards file. The cards file can be CSV or JSON, with each entry specifying a count, a front `CardId`, and a back `CardId`. Card IDs are in `SET-number` format (e.g. `LRW-263`).

Cards are resolved via Scryfall before import to get the CubeCobra-compatible Scryfall IDs.

**Options:**
- `--config / -c` — path to config file (default: `dualdisk.toml`)

---

### `dualdisk clear-cubes`

Removes all cards from both the front and back cubes.

**Options:**
- `--config / -c` — path to config file (default: `dualdisk.toml`)

---

### `dualdisk lands <SET>`

Lists all land cards in a set, grouped by artist. Output includes hyperlinks to Scryfall and color-coded card names. Useful for browsing what's available when choosing lands to pair.

**Arguments:**
- `SET` — set code (e.g. `LRW`)

**Options:**
- `--basic` — only show basic lands

---

### `dualdisk pair-lands <SET1> <SET2>`

Matches basic lands from two sets by artist and color identity. Lands are grouped by artist, then within each artist by color profile. Useful for picking which lands from two sets to pair together aesthetically.

With `--csv`, outputs matched pairs directly as a CSV ready to feed into `import-cards`.

**Arguments:**
- `SET1` — front set code
- `SET2` — back set code

**Options:**
- `--csv` — output matched pairs as CSV instead of human-readable display
- `--count` — copies per card in CSV output (default: 10)

---

### `dualdisk create-cube <SET>`

Creates a new CubeCobra cube and populates it with cards from a set. Fetches cards from Scryfall, creates the cube, then adds all matching cards using the printing-specific Scryfall ID (preserving the correct art).

**Arguments:**
- `SET` — set code (e.g. `MH3`)

**Options:**
- `--name / -n` — cube name (defaults to the set code)
- `--rarity / -r` — filter by rarity: `common`, `uncommon`, `rare`, `mythic`
- `--type / -t` — filter by card type (e.g. `creature`, `land`, `instant`)

---

### `dualdisk package <SET> --name <NAME>`

Creates a CubeCobra package from cards in a set. Packages are curated card groupings on CubeCobra (2–100 cards). Uses the printing-specific Scryfall ID so the correct art is shown.

**Arguments:**
- `SET` — set code

**Options:**
- `--name / -n` — package name (required)
- `--rarity / -r` — filter by rarity: `common`, `uncommon`, `rare`, `mythic`
- `--type / -t` — filter by card type

---

### `dualdisk serve`

Starts a local web UI at `http://localhost:8000`. The UI lets you search cards from a set with rarity and type filters, preview card art in a grid, and create a package or cube from the results.

**Options:**
- `--port / -p` — port to listen on (default: 8000)

---

## Web UI

Accessible via `dualdisk serve`. Features:

- **Set search** — enter a set code and optional rarity/type filters to fetch matching cards from Scryfall
- **Card art grid** — displays art crops for all matching cards
- **Create Package** — creates a CubeCobra package from the current results
- **Create Cube** — creates a new CubeCobra cube pre-populated with the current results

---

## Card ID Format

Cards are identified by `SET-number` (e.g. `LRW-263`, `MH3-15`). Set codes are case-insensitive. This format maps directly to a specific printing, ensuring the right art is used throughout.

## Cards File Format

Used by `import-cards`. Supported formats:

**CSV** (`cards.csv`):
```
Count,Front,Back
10,LRW-263,MH2-481
```

**JSON** (`cards.json`):
```json
[{"count": 10, "front": "LRW-263", "back": "MH2-481"}]
```

## Config File (`dualdisk.toml`)

```toml
front_cube_id = "your-front-cube-id"
back_cube_id  = "your-back-cube-id"
cards_file    = "cards.csv"
```
