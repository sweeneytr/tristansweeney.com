#!/usr/bin/env python3
"""Import cards from a JSON or CSV file into a CubeCobra cube.

Session is read from your browser's cookie store — log in to cubecobra.com in
Chrome or Firefox first, then run this script.

Config file: dualdisk.toml
    front_cube_id = "uuid"
    back_cube_id  = "uuid"
    cards_file    = "cards.csv"
"""

import csv
import json
import sys
from pathlib import Path

from . import config, cubecobra, scryfall, gatherer
from .model import CardEntry


def load_cards(path: str) -> list[CardEntry]:
    suffix = Path(path).suffix
    if suffix == ".csv":
        with open(path, newline="") as f:
            return [CardEntry(**row) for row in csv.DictReader(f)]
    if suffix == ".json":
        with open(path) as f:
            return [CardEntry(**item) for item in json.load(f)]
    raise ValueError(f"Unknown file format: {suffix!r}")


def expand_for_count(
    card_list: list[CardEntry],
    id_map: dict[str, scryfall.ScryfallCard],
) -> tuple[list[str], list[str]]:
    fronts: list[str] = []
    backs: list[str] = []
    for entry in card_list:
        for card_id, target in ((entry.front, fronts), (entry.back, backs)):
            card = id_map.get(str(card_id))
            if card is None:
                print(f"Skipping {card_id}: not resolved", file=sys.stderr)
                continue
            print(gatherer.image_url(card.multiverse_ids[0]))
            target.extend([card.scryfall_id] * entry.count)
    return fronts, backs

def main() -> None:
    cfg = config.load()

    card_list = load_cards(cfg.cards_file)

    print(f"Resolving {len(card_list)} card entries via Scryfall...")
    all_ids = {face for entry in card_list for face in (entry.front, entry.back)}
    id_map = scryfall.resolve(all_ids)
    front_ids, back_ids = expand_for_count(card_list, id_map)
    print(f"Resolved to {len(front_ids)} fronts, {len(back_ids)} backs")

    print("Loading session from browser cookies...")
    session = cubecobra.load_session()
    print("Session loaded")

    print(f"Adding fronts to cube {cfg.front_cube_id}...")
    cubecobra.add_cards(session, cfg.front_cube_id, front_ids)

    print(f"Adding backs to cube {cfg.back_cube_id}...")
    cubecobra.add_cards(session, cfg.back_cube_id, back_ids)

    print("Done")

if __name__ == "__main__":
    main()
