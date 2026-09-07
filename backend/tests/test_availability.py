from datetime import date, timedelta

import pytest
from fastapi import HTTPException

from app.services.availability import MAX_STAY_NIGHTS, validate_stay


def test_checkout_is_exclusive_and_one_night_is_valid() -> None:
    today = date(2026, 9, 7)

    assert validate_stay(today, today + timedelta(days=1), today) == 1


@pytest.mark.parametrize(
    ("check_in", "check_out", "detail"),
    [
        (date(2026, 9, 6), date(2026, 9, 8), "past"),
        (date(2026, 9, 7), date(2026, 9, 7), "after"),
        (
            date(2026, 9, 7),
            date(2026, 9, 7) + timedelta(days=MAX_STAY_NIGHTS + 1),
            "exceed",
        ),
    ],
)
def test_invalid_stay_boundaries(check_in: date, check_out: date, detail: str) -> None:
    with pytest.raises(HTTPException, match=detail):
        validate_stay(check_in, check_out, date(2026, 9, 7))
