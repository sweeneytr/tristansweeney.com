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