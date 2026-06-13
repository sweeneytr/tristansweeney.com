import tomllib

from pydantic import BaseModel


class Config(BaseModel):
    front_cube_id: str
    back_cube_id: str
    cards_file: str


def load(path: str = "dualdisk.toml") -> Config:
    with open(path, "rb") as f:
        return Config.model_validate(tomllib.load(f))
