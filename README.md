# Taxi Qaid ERP

Version 1.1 — documented, folder-based refactor of the existing HTML/CSS/JavaScript application.

## Quick start

1. Extract the archive, keeping all files and folders together.
2. Open a terminal in this folder and run `python3 -m http.server 8000`.
3. Visit `http://localhost:8000` in a browser.
4. Sign in with an existing authorized Supabase account.

The application is static and does not require a paid GitHub plan, npm, or a build step. It uses external Supabase, Google Apps Script, SheetJS and html2pdf JavaScript services, so those systems and internet access are needed for full functionality.

**Do not treat GitHub Pages or a hidden login screen as backend security.** Review [docs/SECURITY.md](docs/SECURITY.md) before publishing this app or storing sensitive data.

## Documentation

- [Project guide](docs/PROJECT_GUIDE.md) — folder structure, key functions, safe editing workflow.
- [Security notes](docs/SECURITY.md) — public hosting and API authorization requirements.
- [Release notes](docs/CHANGELOG.md) — what changed and what did not.

## Current modules

Dashboard, Fleet Management, Drivers Management, Trip Check, Accident Tracker, Breakdowns Tracker (placeholder), and Maintenance Tracker (placeholder).

## Known configuration gap

The Trip Check Google Apps Script URL in `js/config.js` is still a placeholder copied from the original project and needs a deployed endpoint.
