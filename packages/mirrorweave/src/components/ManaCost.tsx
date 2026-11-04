import { parseCost, symbolUrl } from '../lib/scryfall'

/** Renders `{1}{W/U}` as real Scryfall pips. Falls back to the raw text if an image 404s. */
export function ManaCost({ cost, size = 13 }: { cost: string; size?: number }) {
  const symbols = parseCost(cost)
  if (!symbols.length) return <span className="cost-none">—</span>
  return (
    <span className="cost" role="img" aria-label={`mana cost ${symbols.join(' ').toUpperCase()}`}>
      {symbols.map((s, i) => (
        <img key={i} className="pip" src={symbolUrl(s)} alt="" width={size} height={size} />
      ))}
    </span>
  )
}

/** Oracle text with inline pips, real line breaks, and dimmed reminder text. */
export function OracleText({ text }: { text: string }) {
  if (!text.trim()) return null
  return (
    <div className="oracle">
      {text.split('\n').map((line, li) => (
        <span className="ol" key={li}>
          {line.split(/(\{[^}]+\}|\([^)]*\))/g).map((chunk, ci) => {
            if (/^\{[^}]+\}$/.test(chunk)) {
              return <img key={ci} className="pip pip-o" src={symbolUrl(chunk.slice(1, -1))} alt={chunk} />
            }
            if (/^\([^)]*\)$/.test(chunk)) return <i key={ci} className="rem">{chunk}</i>
            return <span key={ci}>{chunk}</span>
          })}
        </span>
      ))}
    </div>
  )
}
