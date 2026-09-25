from __future__ import annotations

import secrets
import shutil
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from uuid import NAMESPACE_URL, uuid4, uuid5

from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.passwords import hash_password
from app.core.storage import prepare_uploads
from app.db.schema import SEED_STATEMENTS, InitialAdminCredential

CUSTOMERS = (
    ("Arjun Mehta", "arjun.mehta@example.com", "9000000001"),
    ("Priya Nair", "priya.nair@example.com", "9000000002"),
    ("Rohan Kapoor", "rohan.kapoor@example.com", "9000000003"),
    ("Kavya Iyer", "kavya.iyer@example.com", "9000000004"),
    ("Aditya Bose", "aditya.bose@example.com", "9000000005"),
    ("Sneha Kulkarni", "sneha.kulkarni@example.com", "9000000006"),
    ("Vikram Singh", "vikram.singh@example.com", "9000000007"),
    ("Meera Joshi", "meera.joshi@example.com", "9000000008"),
    ("Rahul Verma", "rahul.verma@example.com", "9000000009"),
    ("Ananya Das", "ananya.das@example.com", "9000000010"),
    ("Karan Malhotra", "karan.malhotra@example.com", "9000000011"),
    ("Nisha Patel", "nisha.patel@example.com", "9000000012"),
    ("Siddharth Rao", "siddharth.rao@example.com", "9000000013"),
    ("Pooja Chatterjee", "pooja.chatterjee@example.com", "9000000014"),
    ("Aman Gupta", "aman.gupta@example.com", "9000000015"),
    ("Isha Menon", "isha.menon@example.com", "9000000016"),
    ("Neel Shah", "neel.shah@example.com", "9000000017"),
    ("Tanya Roy", "tanya.roy@example.com", "9000000018"),
    ("Dev Khanna", "dev.khanna@example.com", "9000000019"),
    ("Riya Sen", "riya.sen@example.com", "9000000020"),
)

ROOMS = (
    ("30000000-0000-0000-0000-000000000101", 520000),
    ("30000000-0000-0000-0000-000000000102", 440000),
    ("30000000-0000-0000-0000-000000000201", 780000),
    ("30000000-0000-0000-0000-000000000202", 520000),
    ("30000000-0000-0000-0000-000000000103", 440000),
    ("30000000-0000-0000-0000-000000000203", 780000),
    ("30000000-0000-0000-0000-000000000301", 520000),
    ("30000000-0000-0000-0000-000000000302", 440000),
)

SPECIAL_REQUESTS = (
    "Quiet room away from the lift, if available.",
    "Vegetarian breakfast for both guests.",
    "Late arrival expected around 10:30 PM.",
    "Please arrange twin beds and an extra towel.",
    "Airport pickup information requested.",
)

ENQUIRIES = (
    ("Airport transfer", "Could you arrange a pickup from the airport at 7:00 PM?"),
    ("Early check-in", "Is an early check-in around noon possible?"),
    ("Breakfast options", "Please share the vegetarian breakfast choices."),
    ("Family amenities", "Do you provide a cot for a two-year-old child?"),
    ("Parking", "Is secure overnight parking available on the property?"),
    ("Local sightseeing", "Can the front desk arrange a city tour?"),
    ("Late checkout", "What is the charge for a 2:00 PM checkout?"),
    ("Laundry service", "Is same-day laundry service available?"),
    ("Accessibility", "Is there step-free access to the guest rooms?"),
    ("Celebration setup", "Can you arrange a simple anniversary room setup?"),
    ("Invoice request", "Can the final invoice include our company tax details?"),
    ("Train station transfer", "Please share transfer options to the railway station."),
)


@dataclass(frozen=True)
class DemoCredentials:
    administrator: InitialAdminCredential
    customer: InitialAdminCredential


def stable_id(kind: str, value: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"hotel-management/{kind}/{value}"))


async def replace_with_realistic_demo_data(
    engine: AsyncEngine,
    uploads_dir: Path,
    *,
    today: date | None = None,
    administrator_password: str | None = None,
    customer_password: str | None = None,
) -> DemoCredentials:
    current_date = today or date.today()
    admin_password = administrator_password or secrets.token_urlsafe(18)
    featured_password = customer_password or secrets.token_urlsafe(18)

    uploads_dir.parent.mkdir(parents=True, exist_ok=True)
    staged_uploads = uploads_dir.with_name(f"{uploads_dir.name}.demo-{uuid4().hex}")
    if uploads_dir.exists():
        uploads_dir.replace(staged_uploads)
    try:
        prepare_uploads(uploads_dir)
        async with engine.begin() as connection:
            administrator = (
                await connection.exec_driver_sql(
                    """select id from profiles where lower(email) = 'admin@example.com'
                    and role = 'admin' and is_active = 1"""
                )
            ).mappings().one_or_none()
            if administrator is None:
                raise ValueError("The active built-in administrator must exist")
            administrator_id = str(administrator["id"])

            for table in (
                "booking_status_history",
                "bookings",
                "enquiries",
                "room_category_facilities",
                "room_images",
                "rooms",
                "facilities",
                "room_categories",
            ):
                await connection.exec_driver_sql(f'DELETE FROM "{table}"')
            await connection.exec_driver_sql(
                "delete from profiles where lower(email) <> 'admin@example.com'"
            )
            await connection.exec_driver_sql(
                """update profiles set password_hash = ?, full_name = 'Rajat Debnath',
                phone = '9000000100', role = 'admin', is_active = 1,
                updated_at = current_timestamp where id = ?""",
                (hash_password(admin_password), administrator_id),
            )

            for statement in SEED_STATEMENTS:
                await connection.exec_driver_sql(statement)
            await connection.exec_driver_sql(
                """insert into rooms
                (id, room_number, category_id, floor, description) values
                ('30000000-0000-0000-0000-000000000103', '103',
                 '10000000-0000-0000-0000-000000000003', 1,
                 'Garden-facing twin room near the courtyard.'),
                ('30000000-0000-0000-0000-000000000203', '203',
                 '10000000-0000-0000-0000-000000000002', 2,
                 'Family suite with a quiet sitting area.'),
                ('30000000-0000-0000-0000-000000000301', '301',
                 '10000000-0000-0000-0000-000000000001', 3,
                 'Upper-floor king room with city views.'),
                ('30000000-0000-0000-0000-000000000302', '302',
                 '10000000-0000-0000-0000-000000000003', 3,
                 'Bright twin room overlooking the garden.')"""
            )
            await connection.exec_driver_sql(
                """insert into facilities (id, name, icon, description) values
                ('20000000-0000-0000-0000-000000000005', 'Airport transfer', 'car',
                 'Pre-booked airport pickup and drop service.'),
                ('20000000-0000-0000-0000-000000000006', 'Laundry service', 'shirt',
                 'Same-day laundry service for guest clothing.')"""
            )
            await connection.exec_driver_sql(
                """insert into room_category_facilities (category_id, facility_id) values
                ('10000000-0000-0000-0000-000000000001',
                 '20000000-0000-0000-0000-000000000005'),
                ('10000000-0000-0000-0000-000000000002',
                 '20000000-0000-0000-0000-000000000005'),
                ('10000000-0000-0000-0000-000000000002',
                 '20000000-0000-0000-0000-000000000006'),
                ('10000000-0000-0000-0000-000000000003',
                 '20000000-0000-0000-0000-000000000006')"""
            )

            for index, (name, email, phone) in enumerate(CUSTOMERS):
                password = featured_password if index == 0 else secrets.token_urlsafe(18)
                await connection.exec_driver_sql(
                    """insert into profiles
                    (id, email, password_hash, full_name, phone, role, is_active)
                    values (?, ?, ?, ?, ?, 'customer', 1)""",
                    (stable_id("profile", email), email, hash_password(password), name, phone),
                )

            for index, (name, email, phone) in enumerate(CUSTOMERS):
                room_id, nightly_price = ROOMS[index % len(ROOMS)]
                if index == 0:
                    check_in, status = current_date, "checked_in"
                elif index == 1:
                    check_in, status = current_date - timedelta(days=10), "checked_out"
                else:
                    check_in = current_date + timedelta(days=5 + index * 3)
                    status = ("confirmed", "pending", "cancelled", "rejected")[(index - 2) % 4]
                check_out = check_in + timedelta(days=2)
                booking_id = stable_id("booking", email)
                reference = f"AH-{current_date.year}-{1001 + index}"
                child_count = 1 if room_id.endswith(("201", "203")) else 0
                total = nightly_price * 2
                await connection.exec_driver_sql(
                    """insert into bookings
                    (id, booking_reference, user_id, room_id, check_in, check_out,
                     adult_count, child_count, guest_name, guest_email, guest_phone,
                     price_per_night, night_count, subtotal, tax_amount, total_amount,
                     status, special_requests, cancelled_at)
                    values (?, ?, ?, ?, ?, ?, 2, ?, ?, ?, ?, ?, 2, ?, 0, ?, ?, ?,
                     case when ? = 'cancelled' then current_timestamp else null end)""",
                    (
                        booking_id,
                        reference,
                        stable_id("profile", email),
                        room_id,
                        check_in.isoformat(),
                        check_out.isoformat(),
                        child_count,
                        name,
                        email,
                        phone,
                        nightly_price,
                        total,
                        total,
                        status,
                        SPECIAL_REQUESTS[index % len(SPECIAL_REQUESTS)],
                        status,
                    ),
                )
                transitions = ["pending"]
                if status == "checked_in":
                    transitions.extend(("confirmed", "checked_in"))
                elif status == "checked_out":
                    transitions.extend(("confirmed", "checked_in", "checked_out"))
                elif status != "pending":
                    transitions.append(status)
                previous: str | None = None
                for order, target_status in enumerate(transitions):
                    reason = (
                        "Reservation request received"
                        if order == 0
                        else "Front desk verification completed"
                    )
                    await connection.exec_driver_sql(
                        """insert into booking_status_history
                        (id, booking_id, from_status, to_status, changed_by, reason)
                        values (?, ?, ?, ?, ?, ?)""",
                        (
                            stable_id("history", f"{email}-{order}"),
                            booking_id,
                            previous,
                            target_status,
                            administrator_id if order else stable_id("profile", email),
                            reason,
                        ),
                    )
                    previous = target_status

            enquiry_statuses = ("new", "in_progress", "resolved", "closed")
            for index, (subject, message) in enumerate(ENQUIRIES):
                name, email, phone = CUSTOMERS[index]
                status = enquiry_statuses[index % len(enquiry_statuses)]
                await connection.exec_driver_sql(
                    """insert into enquiries
                    (id, user_id, name, email, phone, subject, message, status,
                     assigned_to, admin_notes)
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        stable_id("enquiry", email),
                        stable_id("profile", email),
                        name,
                        email,
                        phone,
                        subject,
                        message,
                        status,
                        None if status == "new" else administrator_id,
                        None
                        if status == "new"
                        else "Guest relations follow-up recorded by the front desk.",
                    ),
                )
    except Exception:
        if uploads_dir.exists():
            shutil.rmtree(uploads_dir)
        if staged_uploads.exists():
            staged_uploads.replace(uploads_dir)
        raise
    else:
        if staged_uploads.exists():
            shutil.rmtree(staged_uploads)

    return DemoCredentials(
        administrator=InitialAdminCredential("admin@example.com", admin_password),
        customer=InitialAdminCredential(CUSTOMERS[0][1], featured_password),
    )
