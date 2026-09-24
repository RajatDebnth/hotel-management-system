# Local backup and recovery

The local system of record is `backend/data/hms.db`. Room image bytes live in `backend/data/uploads/`, and the session signing key lives at `backend/data/.session-key`.

## Backup

1. Stop the frontend and backend so the database and uploads cannot change during the copy.
2. Copy `backend/data/hms.db` and the complete `backend/data/uploads/` directory into the same dated backup set.
3. Copy `backend/data/.session-key` only if existing browser sessions must survive restoration. Treat it as a secret.
4. Store the backup outside the repository with restricted access. Never commit runtime data or real customer records.
5. Record the application commit and backup timestamp beside the files.

The SQLite database may use `-wal` and `-shm` sidecars while the backend is running. Stopping the backend before copying avoids an inconsistent manual backup.

## Recovery

1. Stop both services.
2. Preserve the failed `backend/data/` directory for diagnosis.
3. Create a new `backend/data/` directory and restore `hms.db`, `uploads/`, and optionally `.session-key` from one matching backup set.
4. Start FastAPI. Its versioned initializer validates/upgrades the database and repairs safe media state.
5. Start Next.js and verify customer login, catalog media, booking history, administrator inventory, and reports.

If `.session-key` is not restored, FastAPI creates a new key and all previous browser sessions become invalid; users can sign in again. If no database is restored, startup creates a fresh seeded installation and a new administrator password.

## JSON export and import

From `backend/`:

```powershell
.\.venv\Scripts\python.exe scripts\export_db.py
.\.venv\Scripts\python.exe scripts\import_db.py <backup.json> --yes
```

The versioned JSON export contains every application table, including password hashes and customer data, and is therefore sensitive. By default it is written below ignored `backend/data/exports/`, refuses to overwrite an existing file, and uses an atomic replacement. Use `--force` only when replacement is intentional.

Import validates the format, schema version, exact tables, and exact columns before opening its replacement transaction. Any validation or insertion failure leaves the existing table data unchanged. Stop FastAPI before importing. JSON does not contain uploaded image bytes, so restore the matching `uploads/` directory separately.

## Reset and reporting export

```powershell
.\.venv\Scripts\python.exe scripts\reset_db.py --yes
.\.venv\Scripts\python.exe scripts\export_bookings.py
```

Reset is confined to `backend/data`, stages existing database/media paths for rollback, recreates the seed, and prints a new one-time administrator password. It permanently replaces local records and media after successful recreation. The booking CSV includes guest contact details and monetary values in paise; protect it as customer data.
