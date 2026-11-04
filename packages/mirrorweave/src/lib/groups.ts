import type { Group, Pair, View } from '../types'

export const LANES = ['White', 'Blue', 'Black', 'Red', 'Green', 'Gold', 'Colorless']
const RANK: Record<string, number> = { common: 0, uncommon: 1, rare: 2, mythic: 3 }
const RARITIES = ['common', 'uncommon', 'rare', 'mythic'] as const

/** Copies follow the rarer of the two faces, so that is what "by rarity" groups on. */
export const effectiveRarity = (p: Pair) =>
  RANK[p.day.rarity] >= RANK[p.night.rarity] ? p.day.rarity : p.night.rarity

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const byRarityThenCurve = (a: Pair, b: Pair) =>
  RANK[a.day.rarity] - RANK[b.day.rarity] || a.day.cmc - b.day.cmc || a.day.name.localeCompare(b.day.name)

/** Grouping is derived from the route, so the URL is the only state. */
const isLand = (p: Pair) => p.day.type.includes('Land')

export function groupsFor(view: View, pairs: Pair[]): Group[] {
  if (view === 'color') {
    // Lands are pulled out of the colour lanes and given a section of their own,
    // so the lanes show only the spells you actually draft into a deck.
    const spells = pairs.filter((p) => !isLand(p))
    const lands = pairs.filter(isLand).sort(byRarityThenCurve)
    const lanes = LANES.map((lane) => {
      const inLane = spells.filter((p) => p.lane === lane).sort(byRarityThenCurve)
      return { id: slug(lane), name: lane, pairs: inLane, slots: inLane.reduce((n, p) => n + p.qty, 0) }
    })
    return [...lanes, { id: 'lands', name: 'Lands', pairs: lands, slots: lands.reduce((n, p) => n + p.qty, 0) }]
      .filter((g) => g.pairs.length > 0)
  }

  if (view === 'rarity') {
    return RARITIES.map((rar) => {
      const inRar = pairs
        .filter((p) => effectiveRarity(p) === rar)
        .sort((a, b) => LANES.indexOf(a.lane) - LANES.indexOf(b.lane) || a.day.cmc - b.day.cmc
          || a.day.name.localeCompare(b.day.name))
      return {
        id: rar,
        name: rar[0].toUpperCase() + rar.slice(1),
        pairs: inRar,
        slots: inRar.reduce((n, p) => n + p.qty, 0),
      }
    }).filter((g) => g.pairs.length > 0)
  }

  const order: string[] = []
  const byCycle = new Map<string, Pair[]>()
  for (const p of pairs) {
    if (!byCycle.has(p.cycle)) { byCycle.set(p.cycle, []); order.push(p.cycle) }
    byCycle.get(p.cycle)!.push(p)
  }
  // keep "Outside the cycles" last, however the data happens to be ordered
  order.sort((a, b) => Number(a === 'singles') - Number(b === 'singles'))
  return order.map((id) => {
    const list = byCycle.get(id)!
    return {
      id,
      name: list[0].cycleName,
      pairs: id === 'singles' ? [...list].sort(byRarityThenCurve) : list,
      slots: list.reduce((n, p) => n + p.qty, 0),
    }
  })
}

export const matches = (p: Pair, q: string) => {
  if (!q) return true
  const hay = `${p.day.name} ${p.night.name} ${p.day.type} ${p.night.type} ${p.note}`.toLowerCase()
  return hay.includes(q.toLowerCase())
}
