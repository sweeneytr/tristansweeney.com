import sys

import requests
from pydantic import BaseModel

BASE = "https://api.scryfall.com"
COLLECTION_LIMIT = 75
from .model import CardId


class ScryfallCard(BaseModel):
    card_id: CardId
    scryfall_id: str
    multiverse_ids: list[int]
    gatherer_url: str | None
    front_art_url: str | None
    back_art_url: str | None


def resolve(card_ids: set[CardId]) -> dict[str, ScryfallCard]:
    id_list = list(card_ids)
    resolved: dict[str, ScryfallCard] = {}

    for i in range(0, len(id_list), COLLECTION_LIMIT):
        chunk = id_list[i : i + COLLECTION_LIMIT]
        identifiers = [
            {"set": cid.set_code.lower(), "collector_number": str(cid.collector_number)}
            for cid in chunk
        ]

        resp = requests.post(
            f"{BASE}/cards/collection",
            json={"identifiers": identifiers},
            headers={"User-Agent": "cubecobra-import/0.1"},
        )
        resp.raise_for_status()
        data = resp.json()

        for nf in data.get("not_found", []):
            print(f"Warning: not found in Scryfall: {nf}", file=sys.stderr)

        for c in data["data"]:
            faces = c.get("card_faces") or []
            front_art_url = (c.get("image_uris") or {}).get("art_crop") or (
                (faces[0].get("image_uris") or {}).get("art_crop") if faces else None
            )
            back_art_url = (
                (faces[1].get("image_uris") or {}).get("art_crop") if len(faces) > 1 else None
            )
            card = ScryfallCard(
                card_id=CardId(
                    set_code=c["set"], collector_number=c["collector_number"]
                ),
                scryfall_id=c["id"],
                multiverse_ids=c.get("multiverse_ids", []),
                gatherer_url=c.get("related_uris", {}).get("gatherer"),
                front_art_url=front_art_url,
                back_art_url=back_art_url,
            )
            resolved[str(card.card_id)] = card

    return resolved
