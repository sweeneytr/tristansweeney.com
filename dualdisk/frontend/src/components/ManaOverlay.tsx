const MANA_MAP: Record<string, string> = { W: 'w', U: 'u', B: 'b', R: 'r', G: 'g' }

export function ManaOverlay({ colorIdentity }: { colorIdentity: string[] }) {
  const symbols = colorIdentity.length
    ? colorIdentity.map((c) => MANA_MAP[c])
    : ['c']
  return (
    <div className="mana-overlay">
      {symbols.map((s, i) => (
        <i key={i} className={`ms ms-${s} ms-cost`} />
      ))}
    </div>
  )
}
