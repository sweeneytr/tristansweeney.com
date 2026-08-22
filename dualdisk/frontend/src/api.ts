import type { ArtistMatch, Card, CreateResult } from './types'

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, init)
  const data = await resp.json().catch(() => ({ detail: resp.statusText }))
  if (!resp.ok) {
    throw new Error(data.detail ?? resp.statusText)
  }
  return data as T
}

export interface SetFilters {
  setCode: string
  rarity?: string
  cardType?: string
}

export function searchCards({ setCode, rarity, cardType }: SetFilters): Promise<Card[]> {
  const params = new URLSearchParams({ set_code: setCode })
  if (rarity) params.set('rarity', rarity)
  if (cardType) params.set('card_type', cardType)
  return requestJson(`/api/cards?${params}`)
}

export function pairLands(set1: string, set2: string): Promise<ArtistMatch[]> {
  const params = new URLSearchParams({ set1, set2 })
  return requestJson(`/api/pair-lands?${params}`)
}

export function createPackage(req: SetFilters & { name: string }): Promise<CreateResult> {
  return requestJson('/api/packages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      set_code: req.setCode,
      name: req.name,
      rarity: req.rarity || null,
      card_type: req.cardType || null,
    }),
  })
}

export function createCube(req: SetFilters & { name: string }): Promise<CreateResult> {
  return requestJson('/api/cubes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      set_code: req.setCode,
      name: req.name,
      rarity: req.rarity || null,
      card_type: req.cardType || null,
    }),
  })
}
