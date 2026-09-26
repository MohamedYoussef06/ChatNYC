from pydantic import BaseModel


class PlaceRead(BaseModel):
    id: str
    name: str
    neighborhood: str
    summary: str
