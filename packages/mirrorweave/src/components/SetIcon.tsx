import { SET_ICONS } from '../assets/sets'

/** Scryfall set symbol, inline so it inherits the surrounding text colour. */
export function SetIcon({ code }: { code: string }) {
  const icon = SET_ICONS[code.toLowerCase()]
  if (!icon) return null
  return (
    <svg className="seticon" viewBox={icon.viewBox} role="img" aria-label={icon.name}>
      <title>{icon.name}</title>
      {icon.paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}
