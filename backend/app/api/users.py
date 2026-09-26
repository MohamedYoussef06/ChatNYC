from fastapi import APIRouter

from app.core.personalization import current_user
from app.schemas.user import UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
def me() -> UserRead:
    profile = current_user()
    return UserRead(id=profile["id"], name=profile["name"], neighborhood=profile["neighborhood"])
