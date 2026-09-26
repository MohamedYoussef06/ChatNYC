from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class TripRecord(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class MeetingRecord(Base):
    """Frozen trip shared by code. A later participants table can hang off id."""

    __tablename__ = "meetings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    trip_id: Mapped[str] = mapped_column(ForeignKey("trips.id"), nullable=False, index=True)
    place_name: Mapped[str] = mapped_column(String(200), nullable=False)
    arrive_by: Mapped[str | None] = mapped_column(String(40), nullable=True)
    share_code: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
