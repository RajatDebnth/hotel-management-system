from app.core.config import Settings


def test_supabase_configuration_is_optional_for_isolated_tests() -> None:
    settings = Settings(_env_file=None)

    assert settings.supabase_configured is False


def test_supabase_configuration_reports_complete_without_revealing_secret() -> None:
    settings = Settings(
        _env_file=None,
        supabase_url="https://example.supabase.co",
        supabase_publishable_key="sb_publishable_example",
        supabase_secret_key="sb_secret_example",
        database_url="postgresql+psycopg://postgres:password@localhost:5432/postgres",
    )

    assert settings.supabase_configured is True
    assert "sb_secret_example" not in repr(settings)

