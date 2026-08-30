import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { createCube, createPackage, searchCards } from '../api'
import type { Card } from '../types'
import { useSet } from '../useSet'
import { GathererButton } from './GathererButton'
import { SetIcon } from './SetIcon'

const RARITIES = ['common', 'uncommon', 'rare', 'mythic']

export function SearchPanel({ pushToast }: { pushToast: (html: string, ok: boolean) => void }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { set: setCode, setSet } = useSet()
  const [rarity, setRarity] = useState('')
  const [cardType, setCardType] = useState('')
  const [actionName, setActionName] = useState('')
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<
    { kind: 'results'; count: number; label: string; set: string } | { kind: 'error' | 'ok'; text: string } | null
  >(null)

  async function runSearchFor(set: string) {
    if (!set) return
    setSearchParams({ set }, { replace: true })
    setLoading(true)
    setCards([])
    setStatus(null)
    try {
      const results = await searchCards({ setCode: set, rarity, cardType: cardType.trim() })
      setCards(results)
      const label = [rarity, cardType.trim()].filter(Boolean).join(', ')
      setStatus({ kind: 'results', count: results.length, label, set: set.toUpperCase() })
      setActionName(set.toUpperCase())
    } catch (e) {
      setStatus({ kind: 'error', text: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  function runSearch() {
    runSearchFor(setCode.trim())
  }

  // Deep-linked search: run once on mount using the URL's initial `set` param, intentionally excluded from deps.
  useEffect(() => {
    const urlSet = searchParams.get('set')
    if (urlSet) {
      setSet(urlSet)
      runSearchFor(urlSet)
    }
  }, [])

  async function handleCreatePackage() {
    const name = actionName.trim()
    if (!name) { pushToast('Enter a package name', false); return }
    if (cards.length > 100) { pushToast(`${cards.length} cards exceeds the 100-card package limit`, false); return }
    setBusy(true)
    setStatus(null)
    try {
      const data = await createPackage({ setCode: setCode.trim(), name, rarity, cardType: cardType.trim() })
      pushToast(`Package created · <a href="${data.url}" target="_blank">View on CubeCobra</a>`, true)
      setStatus({ kind: 'ok', text: 'Package created' })
    } catch (e) {
      pushToast((e as Error).message, false)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateCube() {
    const name = actionName.trim() || setCode.trim().toUpperCase()
    setBusy(true)
    setStatus(null)
    try {
      const data = await createCube({ setCode: setCode.trim(), name, rarity, cardType: cardType.trim() })
      pushToast(`Cube created · <a href="${data.url}" target="_blank">View on CubeCobra</a>`, true)
      setStatus({ kind: 'ok', text: 'Cube created' })
    } catch (e) {
      pushToast((e as Error).message, false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <div className="controls">
        <div className="field">
          <label>Rarity</label>
          <select value={rarity} onChange={(e) => setRarity(e.target.value)}>
            <option value="">Any</option>
            {RARITIES.map((r) => (
              <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="field type">
          <label>Type</label>
          <input
            value={cardType}
            onChange={(e) => setCardType(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="creature, land…"
          />
        </div>
        <button onClick={runSearch} disabled={loading}>Search</button>
      </div>

      <div className="status-bar">
        {loading && <><div className="spinner" /> Fetching cards…</>}
        {!loading && status?.kind === 'error' && <span className="error">{status.text}</span>}
        {!loading && status?.kind === 'ok' && <span className="ok">{status.text}</span>}
        {!loading && status?.kind === 'results' && (
          <>
            <span className="count">{status.count} cards</span>
            {status.label ? ` · ${status.label}` : ''} in <strong>{status.set}</strong>
          </>
        )}
      </div>

      <div className="card-grid">
        {cards.map((card) => (
          <div key={card.scryfall_id} className="card-tile" title={`${card.name} · ${card.set_code}-${card.collector_number}`}>
            {card.front_art_url ? (
              <>
                <img className="card-art" src={card.front_art_url} alt={card.name} loading="lazy" />
                <GathererButton url={card.gatherer_url} />
              </>
            ) : (
              <div className="art-placeholder">🃏</div>
            )}
            <div className="card-name">
              <SetIcon setCode={card.set_code} /> {card.name} <span style={{ opacity: 0.75 }}>{card.set_code}-{card.collector_number}</span>
            </div>
          </div>
        ))}
      </div>

      {cards.length > 0 && (
        <div className="actions">
          <div className="field name">
            <label>Name</label>
            <input value={actionName} onChange={(e) => setActionName(e.target.value)} placeholder="My Package" />
          </div>
          <button onClick={handleCreatePackage} disabled={busy}>Create Package</button>
          <div className="divider" />
          <button className="secondary" onClick={handleCreateCube} disabled={busy}>Create Cube</button>
        </div>
      )}
    </div>
  )
}
