from app.core.config import Settings


def test_local_database_configuration_has_offline_defaults() -> None:
    settings = Settings(_env_file=None)

    assert settings.supabase_configured is False
    assert settings.database_path.name == "hms.db"
    assert settings.uploads_dir.name == "uploads"


def test_supabase_configuration_reports_complete_without_revealing_secret() -> None:
    settings = Settings(
        _env_file=None,
        supabase_url="https://example.supabase.co",
        supabase_publishable_key="sb_publishable_example",
        supabase_secret_key="sb_secret_example",
    )

    assert settings.supabase_configured is True
    assert "sb_secret_example" not in repr(settings)
