import time

import browser_cookie3
import requests

BASE = "https://cubecobra.com"
BATCH_SIZE = 100


_JSON_HEADERS = {"X-Requested-With": "XMLHttpRequest"}


def load_session() -> requests.Session:
    session = requests.Session()
    for loader in (browser_cookie3.chrome, browser_cookie3.firefox):
        try:
            jar = loader(domain_name="cubecobra.com")
            for cookie in jar:
                session.cookies.set(
                    cookie.name, cookie.value, domain="cubecobra.com", path="/"
                )
            if "connect.sid" in session.cookies:
                return session
        except browser_cookie3.BrowserCookieError:
            pass
    raise RuntimeError(
        "No cubecobra.com session found — log in at cubecobra.com in Chrome or Firefox first"
    )


def clear_cube(session: requests.Session, cube_id: str) -> None:
    resp = session.post(f"{BASE}/cube/api/cubemetadata/{cube_id}")
    resp.raise_for_status()
    data = resp.json()
    if data.get("success") != "true":
        raise RuntimeError(f"Metadata fetch failed: {data.get('message')}")

    cube = data["cube"]
    version = cube["version"]
    card_count = cube["cardCount"]
    if card_count == 0:
        print("  Cube is already empty")
        return

    removes = [{"index": i} for i in range(card_count)]
    resp = session.post(
        f"{BASE}/cube/api/commit",
        json={
            "id": cube_id,
            "changes": {"mainboard": {"removes": removes}},
            "expectedVersion": version,
            "title": "Clear cube",
            "useBlog": False,
        },
        headers=_JSON_HEADERS,
    )
    if resp.status_code not in (200, 500):
        resp.raise_for_status()
    result = resp.json()
    if not result.get("updateApplied"):
        raise RuntimeError(f"Clear failed: {result.get('message')}")
    print(f"  {card_count} cards removed")


def add_cards(session: requests.Session, cube_id: str, card_ids: list[str]) -> None:
    for i in range(0, len(card_ids), BATCH_SIZE):
        batch = card_ids[i : i + BATCH_SIZE]
        resp = session.post(
            f"{BASE}/cube/api/addtocube/{cube_id}",
            json={"cards": batch, "board": "mainboard", "createBlogPost": False},
        )
        resp.raise_for_status()
        result = resp.json()
        if result.get("success") != "true":
            raise RuntimeError(f"Add failed: {result.get('message')}")
        print(f"  {i + len(batch)}/{len(card_ids)} cards added")
        time.sleep(0.2)
