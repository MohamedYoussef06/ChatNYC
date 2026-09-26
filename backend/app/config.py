from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_ROOT / "data"

NY_TZ = "America/New_York"

SUBWAY_FEEDS = (
    "nyct/gtfs",
    "nyct/gtfs-ace",
    "nyct/gtfs-bdfm",
    "nyct/gtfs-g",
    "nyct/gtfs-jz",
    "nyct/gtfs-nqrw",
    "nyct/gtfs-l",
    "nyct/gtfs-si",
)
ALERTS_FEED = "camsys/all-alerts"


class Settings(BaseSettings):
    mta_api_key: str = ""
    mta_feed_base: str = "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/"
    gtfs_static_url: str = "http://web.mta.info/developers/data/nyct/subway/google_transit.zip"
    poll_interval_seconds: int = 30
    database_url: str = "sqlite:///./data/trips.db"
    geosearch_url: str = "https://geosearch.planninglabs.nyc/v2/search"
    transfer_penalty_seconds: int = 120
    walk_speed_mps: float = 1.3
    max_snap_meters: float = 3000
    snap_candidates: int = 5
    snap_radius_meters: float = 1000
    transfer_weight_seconds: int = 240
    search_hours: int = 3
    arrive_buffer_minutes: int = 5
    nominatim_url: str = "https://nominatim.openstreetmap.org/search"
    share_url_base: str = "http://localhost:3000/meet"

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
