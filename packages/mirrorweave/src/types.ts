export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic'

export interface Face {
  name: string
  cost: string
  cmc: number
  type: string
  pt: string
  set: string
  collector: string
  rarity: Rarity
  oracle: string
  id: string
}

export interface Pair {
  qty: number
  lane: string
  cycle: string
  cycleName: string
  note: string
  cmcDelta: number
  day: Face
  night: Face
}

export type View = 'color' | 'cycle' | 'rarity'

export interface Group {
  id: string
  name: string
  pairs: Pair[]
  slots: number
}
