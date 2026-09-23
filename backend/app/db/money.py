from decimal import ROUND_HALF_UP, Decimal

PAISE = Decimal("100")
MONEY = Decimal("0.01")


def to_paise(value: Decimal | int | str) -> int:
    amount = Decimal(value).quantize(MONEY, rounding=ROUND_HALF_UP)
    return int((amount * PAISE).to_integral_exact())


def from_paise(value: int) -> Decimal:
    return (Decimal(value) / PAISE).quantize(MONEY)
