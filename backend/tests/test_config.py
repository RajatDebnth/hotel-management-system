from app.core.config import Settings


def test_local_database_configuration_has_offline_defaults() -> None:
    settings = Settings(_env_file=None)

    assert settings.supabase_storage_configured is False
    assert settings.database_path.name == "hms.db"
    assert settings.uploads_dir.name == "uploads"


def test_temporary_storage_configuration_does_not_reveal_secret() -> None:
    settings = Settings(
        _env_file=None,
        supabase_url="https://example.supabase.co",
        supabase_secret_key="sb_secret_example",
    )

    assert settings.supabase_storage_configured is True
    assert "sb_secret_example" not in repr(settings)
