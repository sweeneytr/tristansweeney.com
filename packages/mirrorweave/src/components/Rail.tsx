import { NavLink, useSearchParams } from 'react-router-dom'
import type { Group, View } from '../types'
import { usePrinted } from './PrintedBox'

export function Rail({ view, groups }: { view: View; groups: Group[] }) {
  const [params] = useSearchParams()
  const qs = params.toString() ? `?${params.toString()}` : ''
  const printed = usePrinted()

  return (
    <nav className="rail" aria-label="Sections">
      <div className="rail-switch" role="tablist" aria-label="How to group the pairs">
        {(['color', 'cycle', 'rarity'] as View[]).map((v) => (
          <NavLink
            key={v}
            to={`/${v}${qs}`}
            role="tab"
            aria-selected={view === v}
            className={({ isActive }) => `tab rail-tab${isActive ? ' on' : ''}`}
          >
            {v[0].toUpperCase() + v.slice(1)}
          </NavLink>
        ))}
      </div>
      <div className="rail-in">
        {groups.map((g) => {
          const done = g.pairs.filter((p) => printed[p.day.name]).length
          const all = done === g.pairs.length
          return (
            <NavLink
              key={g.id}
              to={`/${view}/${g.id}${qs}`}
              className={`rail-i${all ? ' is-printed' : ''}`}
              title={all ? `${g.name} — all printed` : `${g.name} — ${done}/${g.pairs.length} printed`}
              end
            >
              <span className="rail-t">{g.name}</span>
              <span className="rail-n">{all ? '✓' : g.slots}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
