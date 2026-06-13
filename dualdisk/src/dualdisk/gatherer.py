from html.parser import HTMLParser

import requests
from pydantic import BaseModel, computed_field

BASE = "https://gatherer.wizards.com"


def image_url(multiverse_id: int) -> str:
    return f"{BASE}/Handlers/Image.ashx?multiverseid={multiverse_id}&type=card"


class GathererCard(BaseModel):
    multiverse_id: int
    url: str
    oracle_text: str
    flavor_text: str
    artist: str

    @computed_field
    @property
    def image_url(self) -> str:
        return image_url(self.multiverse_id)


class _GathererParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._in_cardtextbox = False
        self._in_flavortext = False
        self._in_artist = False
        self._oracle_parts: list[str] = []
        self._flavor_parts: list[str] = []
        self.artist: str = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = dict(attrs)
        classes = attr.get("class", "") or ""
        if tag == "div" and "cardtextbox" in classes:
            self._in_cardtextbox = True
        if tag == "div" and "flavortextbox" in classes:
            self._in_flavortext = True
        if tag == "a" and "artist=" in (attr.get("href", "") or ""):
            self._in_artist = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "div":
            self._in_cardtextbox = False
            self._in_flavortext = False
        if tag == "a":
            self._in_artist = False

    def handle_data(self, data: str) -> None:
        text = data.strip()
        if not text:
            return
        if self._in_cardtextbox:
            self._oracle_parts.append(text)
        elif self._in_flavortext:
            self._flavor_parts.append(text)
        elif self._in_artist:
            self.artist = text

    @property
    def oracle_text(self) -> str:
        return "\n".join(self._oracle_parts)

    @property
    def flavor_text(self) -> str:
        return "\n".join(self._flavor_parts)


def fetch(multiverse_id: int) -> GathererCard:
    url = f"{BASE}/Pages/Card/Details.aspx?multiverseid={multiverse_id}"
    resp = requests.get(url, headers={"User-Agent": "cubecobra-import/0.1"})
    resp.raise_for_status()

    parser = _GathererParser()
    parser.feed(resp.text)

    return GathererCard(
        multiverse_id=multiverse_id,
        url=url,
        oracle_text=parser.oracle_text,
        flavor_text=parser.flavor_text,
        artist=parser.artist,
    )
