from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import cubecobra, scryfall

app = FastAPI(title="DualDisk")

_STATIC = Path(__file__).parent / "static"
_CUBECOBRA_BASE = "https://cubecobra.com"


class PackageRequest(BaseModel):
    set_code: str
    name: str
    rarity: str | None = None
    card_type: str | None = None


class CubeRequest(BaseModel):
    set_code: str
    name: str | None = None
    rarity: str | None = None
    card_type: str | None = None


def _card_dict(card: scryfall.ScryfallCard) -> dict:
    return {
        "scryfall_id": card.scryfall_id,
        "name": card.name,
        "set_code": card.card_id.set_code,
        "collector_number": card.card_id.collector_number,
        "front_art_url": card.front_art_url,
        "artist": card.artist,
        "color_identity": card.color_identity,
        "gatherer_url": card.gatherer_url,
    }


@app.get("/api/pair-lands")
def get_pair_lands(set1: str, set2: str):
    try:
        matches = scryfall.pair_basic_lands(set1, set2)
    except Exception as e:
        raise HTTPException(400, str(e))
    return [
        {
            "artist1": m.artist1,
            "artist2": m.artist2,
            "pairs": [{"front": _card_dict(p.front), "back": _card_dict(p.back)} for p in m.pairs],
        }
        for m in matches
    ]


@app.get("/api/cards")
def get_cards(set_code: str, rarity: str | None = None, card_type: str | None = None):
    try:
        cards = scryfall.cards_in_set(set_code, rarity=rarity, card_type=card_type)
    except Exception as e:
        raise HTTPException(400, str(e))
    return [_card_dict(card) for card in cards]


@app.post("/api/packages")
def create_package(req: PackageRequest):
    try:
        cards = scryfall.cards_in_set(req.set_code, rarity=req.rarity, card_type=req.card_type)
    except Exception as e:
        raise HTTPException(400, str(e))
    if len(cards) < 2:
        raise HTTPException(400, "Need at least 2 cards for a package")
    if len(cards) > 100:
        raise HTTPException(400, f"{len(cards)} cards exceeds the 100-card package limit — use rarity or type filters to narrow the selection")
    try:
        session = cubecobra.load_session()
        package_id = cubecobra.create_package(session, req.name, [c.scryfall_id for c in cards])
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"package_id": package_id, "url": f"{_CUBECOBRA_BASE}/packages/{package_id}"}


@app.post("/api/cubes")
def create_cube(req: CubeRequest):
    name = req.name or req.set_code.upper()
    try:
        cards = scryfall.cards_in_set(req.set_code, rarity=req.rarity, card_type=req.card_type)
    except Exception as e:
        raise HTTPException(400, str(e))
    try:
        session = cubecobra.load_session()
        cube_id = cubecobra.create_cube(session, name)
        cubecobra.add_cards(session, cube_id, [c.scryfall_id for c in cards])
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"cube_id": cube_id, "url": f"{_CUBECOBRA_BASE}/cube/view/{cube_id}"}


@app.get("/")
def index():
    return FileResponse(_STATIC / "index.html")


app.mount("/static", StaticFiles(directory=_STATIC), name="static")


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    return FileResponse(_STATIC / "index.html")
