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

Automated export/import tooling is implemented in Step 24. Until then, the stopped-directory copy above is the supported backup method.
