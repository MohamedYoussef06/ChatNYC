from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str | None = None
    cors_origins: str = "http://localhost:3000"
    # Primary name used by this repo; XAI_API_KEY is accepted as an alias.
    grok_api_key: str | None = None
    xai_api_key: str | None = None
    grok_model: str = "grok-3-mini"
    backboard_api_key: str | None = None
    elevenlabs_api_key: str | None = None
    maps_api_key: str | None = None

    @staticmethod
    def _present(value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed or None

    @property
    def effective_grok_api_key(self) -> str | None:
        """GROK_API_KEY first, then XAI_API_KEY (xAI convention)."""
        return self._present(self.grok_api_key) or self._present(self.xai_api_key)

    @property
    def effective_maps_api_key(self) -> str | None:
        return self._present(self.maps_api_key)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
