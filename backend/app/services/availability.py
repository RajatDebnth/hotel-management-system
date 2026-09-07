from datetime import date

from fastapi import HTTPException, status

MAX_STAY_NIGHTS = 30


def validate_stay(check_in: date, check_out: date, today: date | None = None) -> int:
    current_date = today or date.today()
    if check_in < current_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Check-in cannot be in the past",
        )
    nights = (check_out - check_in).days
    if nights < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Check-out must be after check-in",
        )
    if nights > MAX_STAY_NIGHTS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Stays cannot exceed {MAX_STAY_NIGHTS} nights",
        )
    return nights
