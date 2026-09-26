from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import BACKEND_ROOT, settings


class Base(DeclarativeBase):
    pass


def resolve_sqlite_url(url: str) -> str:
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        return url
    raw = url[len(prefix) :]
    path = Path(raw)
    if not path.is_absolute():
        path = (BACKEND_ROOT / path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    return prefix + path.as_posix()


engine = create_engine(
    resolve_sqlite_url(settings.database_url),
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _enable_sqlite_fks(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
