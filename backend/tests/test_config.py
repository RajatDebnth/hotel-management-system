from app.core.config import Settings


def test_local_database_configuration_has_offline_defaults() -> None:
    settings = Settings(_env_file=None)

    assert settings.database_path.name == "hms.db"
    assert settings.uploads_dir.name == "uploads"
    assert str(settings.api_url).rstrip("/") == "http://localhost:8000"
