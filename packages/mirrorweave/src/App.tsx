import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import rawPairs from './data/pairs.json'
import type { Pair, View } from './types'
import { groupsFor, matches } from './lib/groups'
import { importLines } from './lib/scryfall'
import { Rail } from './components/Rail'
import { PairCard } from './components/PairCard'
import { CopyButton } from './components/CopyButton'
import { ClearPrintedButton, PrintedSectionBox, usePrinted } from './components/PrintedBox'
import { SetIcon } from './components/SetIcon'
import {
  getSnapshot as collapsedSnapshot,
  setAllCollapsed,
  subscribe as subscribeCollapsed,
  toggleCollapsed,
} from './lib/collapsed'

const PAIRS = rawPairs as Pair[]
const isView = (v: string | undefined): v is View =>
  v === 'color' || v === 'cycle' || v === 'rarity'

/** Split a group into ascending mana-value bands, so a big section can be worked through in chunks. */
function cmcBands(pairs: Pair[]) {
  const by = new Map<number, Pair[]>()
  for (const p of pairs) {
    const mv = p.day.cmc
    if (!by.has(mv)) by.set(mv, [])
    by.get(mv)!.push(p)
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([mv, list]) => ({ mv, pairs: list, slots: list.reduce((n, p) => n + p.qty, 0) }))
}

function Board() {
  const { view, section } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') ?? ''
  const shell = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => PAIRS.filter((p) => matches(p, q)), [q])
  const groups = useMemo(
    () => groupsFor(view as View, filtered).filter((g) => g.pairs.length > 0),
    [view, filtered],
  )

  // Latest values without re-subscribing the scroll listener on every section change.
  const sectionRef = useRef(section)
  sectionRef.current = section
  const groupsRef = useRef(groups)
  groupsRef.current = groups
  // Set when the spy itself wrote the section, so we don't scroll in response to our own write.
  const spyWrote = useRef<string | undefined>(undefined)
  // Ignore scroll events while a programmatic smooth-scroll is in flight.
  const quietUntil = useRef(0)

  // Clicking a section scrolls to it. Scrolling into a section does NOT scroll again.
  useEffect(() => {
    if (!section || spyWrote.current === section) return
    const el = document.getElementById(`g-${section}`)
    if (!el) return
    quietUntil.current = Date.now() + 900
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section, view])

  // Scroll position writes back to the URL, replacing history so Back stays useful.
  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (Date.now() < quietUntil.current) return
        const probe = window.innerHeight * 0.28
        let active = groupsRef.current[0]?.id
        for (const g of groupsRef.current) {
          const el = document.getElementById(`g-${g.id}`)
          if (el && el.getBoundingClientRect().top <= probe) active = g.id
        }
        if (active && active !== sectionRef.current) {
          spyWrote.current = active
          navigate(`/${view}/${active}${window.location.search}`, { replace: true })
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [view, navigate])

  const allLines = useMemo(() => importLines(filtered), [filtered])
  const slots = filtered.reduce((n, p) => n + p.qty, 0)
  const printed = usePrinted()
  const donePairs = PAIRS.filter((p) => printed[p.day.name]).length
  const collapsed = useSyncExternalStore(subscribeCollapsed, collapsedSnapshot, collapsedSnapshot)
  const allIds = groups.map((g) => g.id)
  const allShut = allIds.length > 0 && allIds.every((id) => collapsed[id])

  return (
    <>
    <div className="topbar">
      <span className="wordmark">
        <span className="lit">Mirror</span><span className="dark">weave</span>
      </span>
      <input
        className="search"
        type="search"
        placeholder="Filter by card, type or reasoning…"
        value={q}
        onChange={(e) => {
          const next = new URLSearchParams(params)
          if (e.target.value) next.set('q', e.target.value)
          else next.delete('q')
          setParams(next, { replace: true })
        }}
      />
      <span className="tally">{filtered.length} pairs · {slots} slots</span>
      <span className="tally">Printed {donePairs}/{PAIRS.length}</span>
      <ClearPrintedButton keys={PAIRS.map((p) => p.day.name)} />
      <button className="copybtn" type="button" onClick={() => setAllCollapsed(allIds, !allShut)}>
        {allShut ? 'Expand all' : 'Collapse all'}
      </button>
      <CopyButton lines={allLines} label={`Copy all ${slots}`} />
    </div>
    <div className="shell" ref={shell}>
      <Rail view={view as View} groups={groups} />
      <div className="wrap">
        <header className="mast">
          <p className="eyebrow">
            <span className="srcset is-day">
              <SetIcon code="lrw" /><SetIcon code="mor" />
              <span className="srcset-label">day</span>
            </span>
            <span className="srcset is-night">
              <span className="srcset-label">night</span>
              <SetIcon code="shm" /><SetIcon code="eve" />
            </span>
          </p>
          <h1><span className="lit">Mirror</span><span className="dark">weave</span></h1>
          <p className="standfirst">
            Every card in the Lorwyn 360 cube paired with a Shadowmoor or Eventide counterpart that
            fills the same slot, to be printed as one double-faced card. Grouping and search live in
            the URL — copy a link and you land exactly here.
          </p>
        </header>

        {groups.length === 0 && <p className="empty">Nothing matches “{q}”.</p>}

        {groups.map((g) => (
          <section className="lane" id={`g-${g.id}`} key={g.id}>
            <header className="lane-head">
              <button
                className="collapse"
                type="button"
                aria-expanded={!collapsed[g.id]}
                aria-controls={`pairs-${g.id}`}
                onClick={() => toggleCollapsed(g.id)}
              >
                <span className="chev" aria-hidden="true">▾</span>
                <h2>{g.name}</h2>
              </button>
              <p className="lane-count">{g.pairs.length} pairs · {g.slots} slots</p>
              <PrintedSectionBox keys={g.pairs.map((p) => p.day.name)} />
              <CopyButton lines={importLines(g.pairs)} />
            </header>
            <div className="pairs" id={`pairs-${g.id}`} hidden={!!collapsed[g.id]}>
              {g.id === 'singles'
                ? cmcBands(g.pairs).flatMap((b) => {
                    const bandId = `${g.id}-mv${b.mv}`
                    const shut = !!collapsed[bandId]
                    return [
                      <div className="band" key={`b-${b.mv}`}>
                        <button
                          className="collapse band-collapse"
                          type="button"
                          aria-expanded={!shut}
                          onClick={() => toggleCollapsed(bandId)}
                        >
                          <span className="chev" aria-hidden="true">▾</span>
                          <span className="band-name">{b.mv} mana</span>
                        </button>
                        <span className="band-n">{b.pairs.length} pairs · {b.slots} slots</span>
                        <PrintedSectionBox keys={b.pairs.map((p) => p.day.name)} />
                        <CopyButton lines={importLines(b.pairs)} />
                      </div>,
                      ...(shut ? [] : b.pairs.map((p) => <PairCard key={p.day.name} pair={p} />)),
                    ]
                  })
                : g.pairs.map((p) => <PairCard key={p.day.name} pair={p} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
    </>
  )
}

function Guard() {
  const { view } = useParams()
  return isView(view) ? <Board /> : <Navigate to="/color" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/color" replace />} />
      <Route path="/:view" element={<Guard />} />
      <Route path="/:view/:section" element={<Guard />} />
      <Route path="*" element={<Navigate to="/color" replace />} />
    </Routes>
  )
}
