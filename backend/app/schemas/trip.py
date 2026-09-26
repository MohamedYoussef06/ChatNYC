from pydantic import BaseModel


class TripRead(BaseModel):
    id: str
    title: str
    origin: str
    destination: str
    summary: str
