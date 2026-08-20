import csv
import enum
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


def _link(text: str, url: str) -> str:
    return f"\033]8;;{url}\033\\{text}\033]8;;\033\\"


def _card_link(card: scryfall.ScryfallCard) -> str:
    url = f"https://scryfall.com/card/{card.card_id.set_code.lower()}/{card.card_id.collector_number}"
    return _link(str(card.card_id), url)


def _artist_link(artist: str) -> str:
    url = f"https://scryfall.com/search?q=a%3A%22{artist.replace(' ', '+')}%22"
    return _link(artist, url)


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
            return [CardEntry(**{k.lower(): v for k, v in row.items()}) for row in csv.DictReader(f)]
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
def clear_cubes(
    config_path: str = typer.Option("dualdisk.toml", "--config", "-c", help="Path to config file"),
) -> None:
    """Clear all cards from both cubes."""
    cfg = config.load(config_path)

    typer.echo("Loading session from browser cookies...")
    session = cubecobra.load_session()
    typer.echo("Session loaded")

    typer.echo(f"Clearing front cube {cfg.front_cube_id}...")
    cubecobra.clear_cube(session, cfg.front_cube_id)

    typer.echo(f"Clearing back cube {cfg.back_cube_id}...")
    cubecobra.clear_cube(session, cfg.back_cube_id)

    typer.echo("Done")


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
def lands(
    set_code: str = typer.Argument(help="Set code to fetch lands for (e.g. LRW)"),
    basic: bool = typer.Option(False, "--basic", help="Only show basic lands"),
) -> None:
    """List all land cards in a set, grouped by artist."""
    cards = scryfall.lands_in_set(set_code, basic_only=basic)

    by_artist: dict[str, list[scryfall.ScryfallCard]] = defaultdict(list)
    for card in cards:
        by_artist[card.artist].append(card)

    for artist, artist_cards in sorted(by_artist.items()):
        pip_width = max(len(card.color_identity) for card in artist_cards)
        typer.echo(f"\n{_artist_link(artist)}")
        for card in artist_cards:
            typer.echo(f"  {_card_link(card)}  {_color_name(card.name, card.color_identity, pip_width)}")


@app.command()
def pair_lands(
    set1: str = typer.Argument(help="Front set code (e.g. LRW)"),
    set2: str = typer.Argument(help="Back set code (e.g. MH2)"),
    csv_out: bool = typer.Option(False, "--csv", help="Output matched pairs as CSV"),
    count: int = typer.Option(10, "--count", help="Count per card in CSV output"),
) -> None:
    """Show basic lands from two sets grouped by artist."""
    cards1 = scryfall.lands_in_set(set1, basic_only=True)
    cards2 = scryfall.lands_in_set(set2, basic_only=True)

    def by_artist(cards: list[scryfall.ScryfallCard]) -> dict[str, list[scryfall.ScryfallCard]]:
        result: dict[str, list[scryfall.ScryfallCard]] = defaultdict(list)
        for card in cards:
            result[card.artist].append(card)
        return result

    def color_profile(cards: list[scryfall.ScryfallCard]) -> tuple[str, ...]:
        return tuple(sorted({c for card in cards for c in card.color_identity}, key=_WUBRG.index))

    def by_profile(idx: dict[str, list[scryfall.ScryfallCard]]) -> dict[tuple[str, ...], list[tuple[str, list[scryfall.ScryfallCard]]]]:
        result: dict[tuple[str, ...], list[tuple[str, list[scryfall.ScryfallCard]]]] = defaultdict(list)
        for artist, cards in idx.items():
            result[color_profile(cards)].append((artist, cards))
        return result

    idx1 = by_profile(by_artist(cards1))
    idx2 = by_profile(by_artist(cards2))

    pairs: list[tuple[scryfall.ScryfallCard, scryfall.ScryfallCard]] = []

    for profile in sorted(set(idx1) & set(idx2), key=lambda p: [_WUBRG.index(c) for c in p]):
        pip_width = len(profile)
        for (a1, c1), (a2, c2) in zip(sorted(idx1[profile]), sorted(idx2[profile])):
            by_name1 = {card.name: card for card in c1}
            by_name2 = {card.name: card for card in c2}
            matched = sorted(set(by_name1) & set(by_name2), key=lambda n: [_WUBRG.index(c) for c in by_name1[n].color_identity])
            if not csv_out:
                typer.echo("")
                typer.echo(f"  {_artist_link(a1)}  ↔  {_artist_link(a2)}")
            for name in matched:
                card1, card2 = by_name1[name], by_name2[name]
                pairs.append((card1, card2))
                if not csv_out:
                    typer.echo(f"    {_card_link(card1)} ↔ {_card_link(card2)}  {_color_name(name, card1.color_identity, pip_width)}")
        if not csv_out:
            for (a1, _) in sorted(idx1[profile])[len(idx2[profile]):]:
                typer.echo(f"  {_artist_link(a1)}  ↔  (unmatched)")
            for (a2, _) in sorted(idx2[profile])[len(idx1[profile]):]:
                typer.echo(f"  (unmatched)  ↔  {_artist_link(a2)}")

    if csv_out:
        writer = csv.writer(sys.stdout)
        writer.writerow(["Count", "Front", "Back"])
        for card1, card2 in pairs:
            writer.writerow([count, card1.card_id, card2.card_id])


_CUBECOBRA_BASE = "https://cubecobra.com"


class _Rarity(str, enum.Enum):
    common = "common"
    uncommon = "uncommon"
    rare = "rare"
    mythic = "mythic"


@app.command()
def create_cube(
    set_code: str = typer.Argument(help="Set code (e.g. MH3)"),
    name: str | None = typer.Option(None, "--name", "-n", help="Cube name (defaults to set code)"),
    rarity: _Rarity | None = typer.Option(None, "--rarity", "-r", help="Filter by rarity"),
    card_type: str | None = typer.Option(None, "--type", "-t", help="Filter by card type (e.g. creature)"),
) -> None:
    """Create a new CubeCobra cube from all cards in a set."""
    if name is None:
        name = set_code.upper()

    typer.echo(f"Fetching cards for {set_code.upper()}...")
    cards = scryfall.cards_in_set(
        set_code,
        rarity=rarity.value if rarity else None,
        card_type=card_type,
    )
    typer.echo(f"Found {len(cards)} cards")

    typer.echo("Loading session from browser cookies...")
    session = cubecobra.load_session()
    typer.echo("Session loaded")

    typer.echo(f"Creating cube {name!r}...")
    cube_id = cubecobra.create_cube(session, name)
    typer.echo(f"Cube created: {_CUBECOBRA_BASE}/cube/view/{cube_id}")

    card_ids = [card.scryfall_id for card in cards]
    typer.echo(f"Adding {len(card_ids)} cards...")
    cubecobra.add_cards(session, cube_id, card_ids)
    typer.echo("Done")


@app.command()
def package(
    set_code: str = typer.Argument(help="Set code (e.g. MH3)"),
    name: str = typer.Option(..., "--name", "-n", help="Package name"),
    rarity: _Rarity | None = typer.Option(None, "--rarity", "-r", help="Filter by rarity"),
    card_type: str | None = typer.Option(None, "--type", "-t", help="Filter by card type (e.g. creature)"),
) -> None:
    """Create a CubeCobra package from all cards in a set."""
    typer.echo(f"Fetching cards for {set_code.upper()}...")
    cards = scryfall.cards_in_set(
        set_code,
        rarity=rarity.value if rarity else None,
        card_type=card_type,
    )
    typer.echo(f"Found {len(cards)} cards")

    if len(cards) < 2:
        typer.echo("Error: need at least 2 cards for a package", err=True)
        raise typer.Exit(1)
    if len(cards) > 100:
        typer.echo(f"Error: {len(cards)} cards exceeds the 100-card package limit — use --rarity or --type to narrow the selection", err=True)
        raise typer.Exit(1)

    card_ids = [card.scryfall_id for card in cards]

    typer.echo("Loading session from browser cookies...")
    session = cubecobra.load_session()
    typer.echo("Session loaded")

    typer.echo(f"Creating package {name!r}...")
    package_id = cubecobra.create_package(session, name, card_ids)
    typer.echo(f"Done — package ID: {package_id}")


if __name__ == "__main__":
    app()
