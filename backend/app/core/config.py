from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Hotel Management API"
    app_env: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    frontend_url: AnyHttpUrl = "http://localhost:3000"
    log_level: str = "INFO"
    enquiry_rate_limit: int = 5
    enquiry_rate_window_seconds: int = 60
    supabase_url: AnyHttpUrl | None = None
    supabase_publishable_key: str | None = None
    supabase_secret_key: SecretStr | None = None
    # Keep the SQLAlchemy driver qualifier (for example, +psycopg) intact.
    database_url: str | None = None

    @property
    def supabase_configured(self) -> bool:
        return all(
            (
                self.supabase_url,
                self.supabase_publishable_key,
                self.supabase_secret_key,
                self.database_url,
            )
        )

    @property
    def cors_origins(self) -> list[str]:
        return [str(self.frontend_url).rstrip("/")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
