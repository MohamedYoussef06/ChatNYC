from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ENV = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_BACKEND_ENV, extra="ignore")

    database_url: str | None = None
    cors_origins: str = "http://localhost:3000"
    grok_api_key: str | None = None
    grok_model: str = "grok-4.7"
    backboard_api_key: str | None = None
    elevenlabs_api_key: str | None = None
    maps_api_key: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
