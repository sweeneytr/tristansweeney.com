// Regenerates src/data/pairs.json from the repo-root pairs CSV.
// Run: pnpm --filter @aelar/mirrorweave data
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../..')
const CSV = resolve(repo, 'lorwyn_shadowmoor_dfc_pairs.csv')

function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  const head = rows.shift()
  return rows.filter(r => r.length === head.length).map(r =>
    Object.fromEntries(head.map((h, i) => [h, r[i]])))
}

// Rustic Clachan is tribe-gated too (Kithkin), and its night face is a filter land
// like the other six, so it belongs with the duals rather than the odd lands out.
const TRIBAL_DUAL = new Set(['Ancient Amphitheater', "Auntie's Hovel", 'Gilt-Leaf Palace',
  'Murmuring Bosk', 'Secluded Glen', 'Wanderwine Hub', 'Rustic Clachan'])

// Same taxonomy as the published artifact: first match wins.
const CYCLES = [
  ['vivid', 'Vivid lands', r => r.day_name.startsWith('Vivid')],
  ['duals', 'Tribal duals', r => TRIBAL_DUAL.has(r.day_name)],
  ['utility', 'Utility lands', r => ['Mutavault', 'Primal Beyond'].includes(r.day_name)],
  ['incarnations', 'Incarnations → Avatars', r => r.day_type.includes('Incarnation')],
  ['legends', 'Legends', r => r.day_type.includes('Legendary')],
  ['harbingers', 'Harbingers', r => /harbinger/i.test(r.day_name)],
  ['bannerets', 'Bannerets', r => /banneret/i.test(r.day_name)],
  ['changelings', 'Changelings → Mimics', r => /changeling/i.test(r.day_name)],
  ['evoke', 'Evoke', r => /evoke/i.test(r.day_oracle)],
  ['champion', 'Champion', r => /champion/i.test(r.day_oracle)],
  ['kindred', 'Kindred spells', r => r.day_type.includes('Kindred')],
  ['lords', 'Lords → Lieges', r => /creatures you control get \+1\/\+1/i.test(r.day_oracle)],
  ['reveal', 'Reveal or pay {3}', r => /reveal a/i.test(r.day_oracle) && r.day_oracle.includes('pay {3}')],
  ['artifacts', 'Artifacts', r => r.day_type.includes('Artifact')],
]

const rows = parseCsv(readFileSync(CSV, 'utf8'))
const seen = new Set()
const pairs = rows.map(r => {
  let cycle = 'singles', cycleName = 'Outside the cycles'
  for (const [id, name, test] of CYCLES) {
    if (!seen.has(r.day_name) && test(r)) { cycle = id; cycleName = name; seen.add(r.day_name); break }
  }
  const face = (p) => ({
    name: r[p + 'name'],
    cost: r[p + 'cost'],
    cmc: Number(r[p + 'cmc']),
    type: r[p + 'type'],
    pt: r[p + 'pt'],
    set: r[p + 'set'],
    collector: r[p + 'collector'],
    rarity: r[p + 'rarity'],
    oracle: r[p + 'oracle'],
    id: r[p + 'scryfall_id'],
  })
  return {
    qty: Number(r.qty), lane: r.lane, cycle, cycleName,
    note: r.pairing_note, cmcDelta: Number(r.cmc_delta),
    day: face('day_'), night: face('night_'),
  }
})

const out = resolve(here, '../src/data/pairs.json')
writeFileSync(out, JSON.stringify(pairs, null, 2) + '\n')
const slots = pairs.reduce((n, p) => n + p.qty, 0)
console.log(`wrote ${out}\n  ${pairs.length} pairs, ${slots} slots`)
