from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str | None = None
    cors_origins: str = "http://localhost:3000"
    grok_api_key: str | None = None
    backboard_api_key: str | None = None
    elevenlabs_api_key: str | None = None
    maps_api_key: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
