import { memo } from 'react'
import type { Face, Pair } from '../types'
import { artUrl } from '../lib/scryfall'
import { ManaCost, OracleText } from './ManaCost'
import { CopyButton } from './CopyButton'
import { PrintedBox, usePrinted } from './PrintedBox'
import { SetIcon } from './SetIcon'
import { importLines } from '../lib/scryfall'

function Panel({ face, side, delta }: { face: Face; side: 'day' | 'night'; delta?: number }) {
  return (
    <div className={`panel ${side}`}>
      <img className="art" src={artUrl(face.id)} alt={`Art from ${face.name}`} loading="lazy" decoding="async" />
      <div className="cn">{face.name}</div>
      <div className="meta">
        <ManaCost cost={face.cost} />
        <span className={`rar r-${face.rarity[0]}`} title={face.rarity}>{face.rarity[0].toUpperCase()}</span>
        <span className="setcode"><SetIcon code={face.set} />{face.set}</span>
        {delta ? <span className={`delta ${delta > 0 ? 'up' : 'down'}`}>{delta > 0 ? `+${delta}` : delta}</span> : null}
      </div>
      <div className="tl">{face.type}{face.pt ? ` · ${face.pt}` : ''}</div>
      <OracleText text={face.oracle} />
    </div>
  )
}

export const PairCard = memo(function PairCard({ pair }: { pair: Pair }) {
  const shifted = pair.day.rarity !== pair.night.rarity
  const printed = usePrinted()
  return (
    <article className={`pair${printed[pair.day.name] ? ' is-printed' : ''}`}>
      <div className="phead">
        <PrintedBox pairKey={pair.day.name} />
        <span className="qty">{pair.qty}×</span>
        {shifted && <span className="rmiss">rarity shifted</span>}
        <span className="pair-copy">
          <CopyButton lines={importLines([pair])} label="Copy" />
        </span>
      </div>
      <div className="faces">
        <Panel face={pair.day} side="day" />
        <div className="hinge" aria-hidden="true" />
        <Panel face={pair.night} side="night" delta={pair.cmcDelta} />
      </div>
      <p className="note">{pair.note}</p>
    </article>
  )
})
