import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

import typer

from . import config, cubecobra, gatherer, scryfall
from .model import CardEntry

app = typer.Typer()

_SINGLE_COLOR_FG = {
    "W": typer.colors.BRIGHT_WHITE,
    "U": typer.colors.BRIGHT_BLUE,
    "B": typer.colors.MAGENTA,
    "R": typer.colors.BRIGHT_RED,
    "G": typer.colors.BRIGHT_GREEN,
}


_WUBRG = ["W", "U", "B", "R", "G"]


def _color_pips(color_identity: list[str], width: int) -> str:
    identity = set(color_identity)
    pips = "".join(typer.style(c, fg=_SINGLE_COLOR_FG[c]) for c in _WUBRG if c in identity)
    return pips + " " * (width - len(identity) + 1)


def _color_name(name: str, color_identity: list[str], pip_width: int) -> str:
    pips = _color_pips(color_identity, pip_width)
    if not color_identity:
        return pips + typer.style(name, fg=typer.colors.BRIGHT_BLACK)
    if len(color_identity) == 1:
        return pips + typer.style(name, fg=_SINGLE_COLOR_FG[color_identity[0]])
    return pips + typer.style(name, fg=typer.colors.YELLOW)


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


@app.command()
def import_cards(
    config_path: str = typer.Option("dualdisk.toml", "--config", "-c", help="Path to config file"),
) -> None:
    """Import cards from a CSV or JSON file into two CubeCobra cubes."""
    cfg = config.load(config_path)

    card_list = load_cards(cfg.cards_file)

    typer.echo(f"Resolving {len(card_list)} card entries via Scryfall...")
    all_ids = {face for entry in card_list for face in (entry.front, entry.back)}
    id_map = scryfall.resolve(all_ids)
    front_ids, back_ids = expand_for_count(card_list, id_map)
    typer.echo(f"Resolved to {len(front_ids)} fronts, {len(back_ids)} backs")

    typer.echo("Loading session from browser cookies...")
    session = cubecobra.load_session()
    typer.echo("Session loaded")

    typer.echo(f"Adding fronts to cube {cfg.front_cube_id}...")
    cubecobra.add_cards(session, cfg.front_cube_id, front_ids)

    typer.echo(f"Adding backs to cube {cfg.back_cube_id}...")
    cubecobra.add_cards(session, cfg.back_cube_id, back_ids)

    typer.echo("Done")


@app.command()
def lands(set_code: str = typer.Argument(help="Set code to fetch lands for (e.g. LRW)")) -> None:
    """List all land cards in a set, grouped by artist."""
    cards = scryfall.lands_in_set(set_code)

    by_artist: dict[str, list[scryfall.ScryfallCard]] = defaultdict(list)
    for card in cards:
        by_artist[card.artist].append(card)

    for artist, artist_cards in sorted(by_artist.items()):
        pip_width = max(len(card.color_identity) for card in artist_cards)
        typer.echo(f"\n{artist}")
        for card in artist_cards:
            typer.echo(f"  {card.card_id}  {_color_name(card.name, card.color_identity, pip_width)}")


if __name__ == "__main__":
    app()
