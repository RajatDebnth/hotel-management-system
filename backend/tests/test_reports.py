from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.services.reports import percentage, validate_report_range


def test_percentage_handles_empty_and_partial_capacity() -> None:
    assert percentage(0, 0) == Decimal("0.00")
    assert percentage(1, 3) == Decimal("33.33")
    assert percentage(3, 4) == Decimal("75.00")


def test_report_range_is_checkout_exclusive_and_bounded() -> None:
    start = date(2026, 9, 1)
    assert validate_report_range(start, start + timedelta(days=1)) == 1
    assert validate_report_range(start, start + timedelta(days=366)) == 366

    with pytest.raises(HTTPException):
        validate_report_range(start, start)
    with pytest.raises(HTTPException):
        validate_report_range(start, start + timedelta(days=367))
