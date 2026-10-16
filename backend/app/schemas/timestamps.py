from datetime import UTC, datetime


def as_utc(value: datetime) -> datetime:
    """Treat SQLite's timezone-less CURRENT_TIMESTAMP values as UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
