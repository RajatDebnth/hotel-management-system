# Local mode guide

The Hotel Management System runs entirely on one computer. Next.js serves the
interface, FastAPI owns application rules, SQLite stores the data, and uploaded
room images are kept on the local filesystem. No cloud account, `.env` file,
database server, or internet connection is needed after dependencies are installed.

## Install

Prerequisites:

- Python 3.12 or newer
- Node.js 20.9 or newer and npm 10 or newer

From the extracted project folder, prepare the backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
```

Then prepare the frontend:

```powershell
cd ..\frontend
npm install
cd ..
```

## Start and stop

Start both applications from the project root:

```powershell
python start_local.py
```

Open <http://localhost:3000>. The API health endpoint is
<http://localhost:8000/api/v1/health>. Press `Ctrl+C` in the launcher terminal to
stop both services.

The first backend start creates and seeds the database. It also creates the local
administrator `admin@example.com` and prints a generated one-time password in the
terminal. Sign in with that password and change it from the account page. The
password is not stored in the source archive or printed again.

## Local files

Runtime files are created below `backend/data/`:

- `hms.db` is the SQLite database.
- `uploads/` contains uploaded and seeded room images.
- `.session-key` signs local login sessions.

The folder is excluded from Git and release archives. Each extracted copy starts
with independent data and credentials.

## Back up, export, import, and reset

Stop the application before replacing or resetting data. From `backend/`:

```powershell
.\.venv\Scripts\python.exe scripts\export_db.py
.\.venv\Scripts\python.exe scripts\export_bookings.py
.\.venv\Scripts\python.exe scripts\reset_admin_password.py --yes
.\.venv\Scripts\python.exe scripts\import_db.py <backup.json> --yes
.\.venv\Scripts\python.exe scripts\reset_db.py --yes
.\.venv\Scripts\python.exe scripts\seed_db.py
```

Database exports contain account and booking information, so store them privately.
The administrator-password reset changes only the built-in `admin@example.com`
password and the session-signing key. It preserves hotel data, signs out every
existing browser session, and prints the new password only in the local terminal.
The JSON export does not include uploaded image bytes; for a complete backup, copy
the database and `uploads/` together while the application is stopped. See
[backup and recovery](backup-recovery.md) for the full procedure.

## Create a shareable ZIP

Commit the intended release first and make sure the Git working tree is clean. From
the project root run:

```powershell
python package_local.py
```

The command creates `dist/hotel-management-system-local.zip` from the current Git
commit and validates that dependencies, caches, environment files, logs, local
database files, uploads, and session keys are absent. The recipient can extract
the archive and follow the Install and Start sections above.
