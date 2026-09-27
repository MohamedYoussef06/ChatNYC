import os
import tempfile
from pathlib import Path

_db = Path(tempfile.gettempdir()) / "divhacks-nyc-planner-test.db"
if _db.exists():
    _db.unlink()
os.environ["DATABASE_URL"] = "sqlite:///" + _db.as_posix()
os.environ["MTA_API_KEY"] = ""

import pytest

from app.feeds.realtime import live_store


@pytest.fixture(autouse=True)
def _clear_live_cache():
    live_store.publish({}, ())
    yield
    live_store.publish({}, ())
