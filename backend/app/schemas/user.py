from pydantic import BaseModel


class UserRead(BaseModel):
    id: str
    name: str
    neighborhood: str
