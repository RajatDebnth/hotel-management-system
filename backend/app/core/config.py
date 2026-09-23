from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AnyHttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


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
    supabase_secret_key: SecretStr | None = None
    database_path: Path = BACKEND_ROOT / "data" / "hms.db"
    uploads_dir: Path = BACKEND_ROOT / "data" / "uploads"
    secret_key_path: Path = BACKEND_ROOT / "data" / ".session-key"
    session_cookie_name: str = "hms_session"
    session_lifetime_minutes: int = 480

    @property
    def supabase_storage_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_secret_key)

    @property
    def cors_origins(self) -> list[str]:
        return [str(self.frontend_url).rstrip("/")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
