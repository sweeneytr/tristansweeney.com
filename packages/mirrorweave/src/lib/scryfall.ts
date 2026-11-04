/** Art crop for a Scryfall card id. Sharded by the first two hex chars. */
export const artUrl = (id: string) =>
  `https://cards.scryfall.io/art_crop/front/${id[0]}/${id[1]}/${id}.jpg`

/** Mana symbol SVG. `{W/U}` -> WU.svg, `{2/W}` -> 2W.svg, `{T}` -> T.svg */
export const symbolUrl = (code: string) =>
  `https://svgs.scryfall.io/card-symbols/${code.toUpperCase().replace(/\//g, '')}.svg`

/** Split "{1}{W/U}" into its symbol codes. */
export const parseCost = (cost: string): string[] =>
  cost ? Array.from(cost.matchAll(/\{([^}]+)\}/g), (m) => m[1]) : []

/** One import line per copy, in the format the Proxxied extension parses. */
export function importLines(pairs: { qty: number; day: { name: string; set: string; collector: string }; night: { name: string; set: string; collector: string } }[]) {
  return pairs.flatMap((p) =>
    Array<string>(p.qty).fill(
      `${p.day.name}|${p.night.name}|${p.day.set}-${p.day.collector}|${p.night.set}-${p.night.collector}`,
    ),
  )
}
