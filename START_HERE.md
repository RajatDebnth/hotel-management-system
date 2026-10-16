# Hotel Management System — Setup and Run Guide

This guide is for a Windows user who receives the project as a ZIP file. No coding
knowledge, cloud account, database account, or paid service is required.

## What this computer needs

Install these two programs before setting up the project:

1. **Python 3.12 or newer** — download it from <https://www.python.org/downloads/windows/>.
   During installation, select **Add Python to PATH**, then choose **Install Now**.
2. **Node.js 20.9 or newer (LTS recommended)** — download it from
   <https://nodejs.org/en/download>. Keep the installer defaults.
3. **Visual Studio Code** — download it from <https://code.visualstudio.com/download>.
   Keep the installer defaults. If offered, enable **Add to PATH** and
   **Add “Open with Code” action to Windows Explorer**.

An internet connection is required for installation. After setup finishes, the hotel
system can run locally without an internet connection.

Restart the computer after installing Python and Node.js. This helps Windows recognize
the new commands.

## Part 1 — Extract the ZIP

1. Right-click the ZIP file.
2. Select **Extract All**.
3. Choose a permanent location, such as `Documents` or `Desktop`.
4. Open the extracted `hotel-management-system` folder.
5. Confirm that the folder contains `START_HERE.md`, `start_local.py`, `backend`, and
   `frontend`.

Do not run the application from inside the ZIP preview. Extract it first. After setup,
do not rename or move the project folder; if it is moved, repeat Part 3.

## Part 2 — Open the project in VS Code

1. Start **Visual Studio Code**.
2. Select **File → Open Folder**.
3. Select the extracted `hotel-management-system` folder, then click
   **Select Folder**.
4. If VS Code asks whether you trust the authors of the files, confirm only when the ZIP
   came directly from the person who supplied this project.
5. In VS Code, select **Terminal → New Terminal**.
6. A terminal panel opens at the bottom of VS Code. Its prompt should end with the
   extracted project-folder name.

The terminal should use **PowerShell**. If it does not, click the small arrow beside the
**+** button in the terminal panel, select **PowerShell**, and close the other terminal.
All commands in this guide must be entered in this VS Code terminal.

## Part 3 — One-time installation

Copy and run each command below in the VS Code terminal, one line at a time. Press
**Enter** after each command and wait for it to finish before running the next one.

### Install the backend

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install --upgrade pip
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\backend\.venv\Scripts\python.exe -m pip install -e backend --no-deps
```

The downloads can take several minutes. Warnings about a newer version of `pip` can be
ignored. Do not close VS Code or its terminal while an installation is running.

### Install the frontend

```powershell
Set-Location frontend
npm install
Set-Location ..
```

### Check the installation

```powershell
python start_local.py --check
```

The final line should say:

```text
Local startup prerequisites are available.
```

The one-time installation is now complete.

## Part 4 — Start the application

In the same VS Code terminal, run:

```powershell
python start_local.py
```

Leave VS Code and its terminal open while using the application. Wait until both local
addresses appear, then open this address in Chrome, Edge, or Firefox:

<http://localhost:3000>

The first start creates the local database, example room inventory, and the first
administrator account. The VS Code terminal displays credentials similar to:

```text
Email: admin@example.com
Password: a-generated-password
```

Write down the generated password privately. It is displayed only when the administrator
is first created.

## Part 5 — First administrator login

1. Open <http://localhost:3000/login>.
2. Enter `admin@example.com`.
3. Enter the generated password shown in the VS Code terminal.
4. After login, open **Admin → Security**.
5. Change the generated password to a strong private password.

Normal visitors do not need pre-created credentials. They can use **Sign in**, then
**Create account**, to register a visitor account. Visitor registration cannot create an
administrator.

## Everyday use

Each time the computer is restarted:

1. Open VS Code.
2. Select **File → Open Folder** and open the extracted project folder.
3. Select **Terminal → New Terminal**.
4. Run:

   ```powershell
   python start_local.py
   ```

5. Leave VS Code and its terminal open.
6. Open <http://localhost:3000>.

To stop the application, click inside the VS Code terminal and press **Ctrl+C** once.
Wait for it to finish before closing VS Code or shutting down the computer.

## If the administrator password is lost

This keeps all rooms, users, bookings, enquiries, and images. It only changes the built-in
administrator password and signs out existing sessions.

1. Stop the application with **Ctrl+C**.
2. In the VS Code terminal, from the project folder, run:

   ```powershell
   Set-Location backend
   .\.venv\Scripts\python.exe scripts\reset_admin_password.py --yes
   Set-Location ..
   ```

3. Write down the new password displayed in the VS Code terminal.
4. Start the application again with `python start_local.py`.
5. Sign in as `admin@example.com` and change the password under **Admin → Security**.

If the command says the backend is still running, click inside the terminal that is
running the application, press **Ctrl+C**, wait a few seconds, and try again.

## Back up the hotel data

The application stores its database and uploaded room images inside `backend\data`.

1. Stop the application with **Ctrl+C**.
2. Open the `backend` folder in File Explorer.
3. Copy the complete `data` folder to a safe external drive or backup folder.
4. Name the copy with the date, for example `hotel-backup-2026-10-16`.

Do not email or publicly share this backup. It can contain guest contact information,
password hashes, bookings, and private application data.

To restore a backup, stop the application and replace the complete `backend\data` folder
with the matching backed-up `data` folder. Keep the database and uploads from the same
backup together.

## Common problems

### `python` is not recognized

Python was not added to Windows PATH. Re-run the Python installer, choose **Modify**, and
enable **Add Python to environment variables**. Restart the computer and try again.

### `npm` is not recognized

Node.js is not installed correctly or Windows has not refreshed PATH. Reinstall the Node.js
LTS version, restart the computer, and try again.

### The browser says the site cannot be reached

- Confirm the VS Code terminal running `python start_local.py` is still open.
- Wait 10–20 seconds and refresh the browser.
- Check the backend directly at <http://localhost:8000/api/v1/health>.
- If another copy is already running, stop the older terminal with **Ctrl+C**.
- If unsure, restart the computer and follow **Everyday use** again.

### The page opens but rooms or login do not work

The frontend may have started while the backend failed. Read the last red error in the
VS Code terminal. First try stopping with **Ctrl+C**, restarting the computer, and
running `python start_local.py` again.

### Windows Firewall asks for access

This is a local application. If Windows asks about Node.js or Python, allow access on
**Private networks** only. Public-network access is not required.

### A command shows a red error during installation

Check the internet connection, confirm that the command was copied as one complete line,
and run that same command again. If it still fails, save a screenshot of the complete
VS Code terminal error for the person supporting the application.

## Important operating rules

- Do not delete or edit files inside `backend\data` while the application is running.
- Do not share administrator passwords or backup files.
- Do not run database reset commands unless a complete backup exists.
- No Supabase, Vercel, Render, Docker, `.env` file, or external database setup is needed.
- The application is intended to run on this computer at `localhost`; it is not a public
  internet deployment.

## Quick reference

| Task | Action |
| --- | --- |
| Start | Run `python start_local.py` from the project folder |
| Open website | <http://localhost:3000> |
| Administrator email | `admin@example.com` |
| Stop | Press **Ctrl+C** in the running VS Code terminal |
| Backup | Stop the app and copy the complete `backend\data` folder |
| Lost admin password | Stop the app and follow **If the administrator password is lost** |

