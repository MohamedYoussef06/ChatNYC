import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    place_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("places.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    origin: Mapped[str] = mapped_column(String(200))
    destination: Mapped[str] = mapped_column(String(200))
    summary: Mapped[str] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="trips")
