import csv
import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class CardId(BaseModel):
    model_config = ConfigDict(frozen=True)

    set_code: str
    collector_number: int

    @field_validator("set_code")
    @classmethod
    def normalize_set_code(cls, v: str) -> str:
        return v.upper()

    @model_validator(mode="before")
    @classmethod
    def from_string(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            try:
                set_code, collector_number = v.split("-", 1)
                return {"set_code": set_code, "collector_number": int(collector_number)}
            except ValueError:
                raise ValueError(f"Invalid card ID: {v!r}")
        return v

    def __str__(self) -> str:
        return f"{self.set_code}-{self.collector_number}"


class CardEntry(BaseModel):
    count: int
    front: CardId
    back: CardId


class SetMap(BaseModel):
    mappings: dict[CardId, CardId] = {}

    def __getitem__(self, key: CardId) -> CardId:
        return self.mappings[key]

    def __setitem__(self, key: CardId, value: CardId) -> None:
        self.mappings[key] = value

    def __contains__(self, key: object) -> bool:
        return key in self.mappings

    @classmethod
    def from_file(cls, path: str) -> "SetMap":
        suffix = Path(path).suffix
        if suffix == ".csv":
            with open(path, newline="") as f:
                mappings = {CardId(row["from"]): CardId(row["to"]) for row in csv.DictReader(f)}
        elif suffix == ".json":
            with open(path) as f:
                mappings = {CardId(k): CardId(v) for k, v in json.load(f).items()}
        else:
            raise ValueError(f"Unknown file format: {suffix!r}")
        return cls(mappings=mappings)
