export interface Card {
  scryfall_id: string
  name: string
  set_code: string
  collector_number: number
  front_art_url: string | null
  artist: string
  color_identity: string[]
  gatherer_url: string | null
}

export interface CardPair {
  front: Card
  back: Card
}

export interface ArtistMatch {
  artist1: string
  artist2: string
  pairs: CardPair[]
}

export interface CreateResult {
  url: string
}

export interface ApiError {
  detail: string
}
