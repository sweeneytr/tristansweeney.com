import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { pairLands as fetchPairLands } from '../api'
import type { ArtistMatch, Card } from '../types'
import { GathererButton } from './GathererButton'
import { ManaOverlay } from './ManaOverlay'

const SWAP_CARDS = new Set([
  'LRW-294', 'SHM-294', 'SHM-298', 'SHM-288', 'LRW-289', 'SHM-289', 'LRW-293',
])

function cardKey(card: Card) {
  return `${card.set_code}-${card.collector_number}`
}

function applySwaps(matches: ArtistMatch[]): ArtistMatch[] {
  return matches.map((match) => {
    const fronts = match.pairs.map((p) => p.front)
    const backs = match.pairs.map((p) => p.back)
    const orderedFronts = fronts.some((c) => SWAP_CARDS.has(cardKey(c))) ? [...fronts].reverse() : fronts
    const orderedBacks = backs.some((c) => SWAP_CARDS.has(cardKey(c))) ? [...backs].reverse() : backs
    return { ...match, pairs: orderedFronts.map((front, i) => ({ front, back: orderedBacks[i] })) }
  })
}

function ArtCell({ card, borderRight, borderBottom }: { card: Card; borderRight: boolean; borderBottom: boolean }) {
  const style: React.CSSProperties = {
    borderRight: borderRight ? '2px solid var(--bg)' : undefined,
    borderBottom: borderBottom ? '2px solid var(--bg)' : undefined,
  }
  return (
    <div className="quadrant-cell" style={style}>
      {card.front_art_url ? (
        <>
          <img src={card.front_art_url} alt={card.name} loading="lazy" />
          <ManaOverlay colorIdentity={card.color_identity} />
          <GathererButton url={card.gatherer_url} />
        </>
      ) : (
        <div className="art-placeholder">🃏</div>
      )}
      <div className="card-name">
        {card.name} <span style={{ opacity: 0.75 }}>{card.set_code}-{card.collector_number}</span>
      </div>
    </div>
  )
}

export function PairLandsPanel() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [set1, setSet1] = useState(searchParams.get('set1') ?? '')
  const [set2, setSet2] = useState(searchParams.get('set2') ?? '')
  const [matches, setMatches] = useState<ArtistMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<
    { kind: 'results'; artistCount: number; pairCount: number; set1: string; set2: string } | { kind: 'error'; text: string } | null
  >(null)

  async function runPair() {
    const s1 = set1.trim()
    const s2 = set2.trim()
    if (!s1 || !s2) return
    setSearchParams({ set1: s1, set2: s2 }, { replace: true })
    setLoading(true)
    setMatches([])
    setStatus(null)
    try {
      const results = applySwaps(await fetchPairLands(s1, s2))
      setMatches(results)
      const pairCount = results.reduce((n, m) => n + m.pairs.length, 0)
      setStatus({ kind: 'results', artistCount: results.length, pairCount, set1: s1.toUpperCase(), set2: s2.toUpperCase() })
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // Deep-linked pairing: run once on mount using the URL's initial set1/set2 params, intentionally excluded from deps.
  useEffect(() => {
    if (searchParams.get('set1') && searchParams.get('set2')) runPair()
  }, [])

  return (
    <div className="panel">
      <div className="controls">
        <div className="field set">
          <label>Front set</label>
          <input
            value={set1}
            onChange={(e) => setSet1(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runPair()}
            placeholder="LRW"
            spellCheck={false}
          />
        </div>
        <div className="field set">
          <label>Back set</label>
          <input
            value={set2}
            onChange={(e) => setSet2(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runPair()}
            placeholder="MH2"
            spellCheck={false}
          />
        </div>
        <button onClick={runPair} disabled={loading}>Pair</button>
      </div>

      <div className="status-bar">
        {loading && <><div className="spinner" /> Fetching lands…</>}
        {!loading && status?.kind === 'error' && <span className="error">{status.text}</span>}
        {!loading && status?.kind === 'results' && (
          <>
            <span className="count">{status.artistCount} artist matches</span>, {status.pairCount} pairs · <strong>{status.set1}</strong> ↔ <strong>{status.set2}</strong>
          </>
        )}
      </div>

      <div className="pair-grid">
        {matches.map(({ artist1, artist2, pairs }, i) => {
          const n = pairs.length
          return (
            <div key={i} className="artist-match">
              <div className="artist-header">
                <span className="name">{artist1}</span>
                <span className="sep">↔</span>
                <span className="name">{artist2}</span>
              </div>
              <div className="quadrant" style={{ gridTemplateColumns: `repeat(${n},1fr)` }}>
                {pairs.map(({ front }, j) => (
                  <ArtCell key={`f${j}`} card={front} borderRight={j < n - 1} borderBottom />
                ))}
                {pairs.map(({ back }, j) => (
                  <ArtCell key={`b${j}`} card={back} borderRight={j < n - 1} borderBottom={false} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
