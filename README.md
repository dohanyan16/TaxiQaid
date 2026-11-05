# Taxi Qaid ERP

Version **1.2** — each screen has its own HTML, CSS, and JavaScript files.

## Start the application locally

1. Extract the ZIP file and keep the directory tree intact.
2. From the `TaxiQaidERP_v1.2` folder, run `python3 -m http.server 8000`.
3. Open `http://localhost:8000` in your browser.
4. Sign in with your existing authorized account.

**Important:** Do not double-click `index.html` to open it using `file://`. The app loads HTML fragments with `fetch()`, which requires HTTP(S). A regular local web server or GitHub Pages works.

## Folder structure

- `index.html`: very small boot page; no feature markup.
- `modules/login/`: login form and client-side authentication.
- `modules/dashboard/`: landing dashboard.
- `modules/fleet/`: vehicle lookup and editing.
- `modules/drivers/`: driver lookup and editing.
- `modules/tripcheck/`: inspections and 27-step form.
- `modules/accidents/`: accident reporting and management.
- `modules/breakdowns/`: future breakdown tracking (placeholder).
- `modules/maintenance/`: future maintenance tracking (placeholder).
- `shared/`: navigation, layout, common CSS, Supabase configuration, general utilities, and data helpers.
- `assets/`: images.
- `docs/`: project guide, security instructions, and change history.

Every `modules/<name>/` folder contains `<name>.html`, `<name>.css`, and `<name>.js`.

## Deployment on GitHub Pages (GitHub Free)

Upload the **contents** of this folder, including the `modules/`, `shared/`, and `assets/` directories. Keep `index.html` in the publish root. This is a static app with no npm, bundling, or paid GitHub features. URLs are relative and support a repository subpath.

GitHub Pages access is not private just because the application displays a login. Public visitors can download static HTML, CSS, and JS. Protect private data and **all writes** in Supabase and Google Apps Script as described in [docs/SECURITY.md](docs/SECURITY.md).

## Further reading

- [Project guide](docs/PROJECT_GUIDE.md)
- [Security notes](docs/SECURITY.md)
- [Change history](docs/CHANGELOG.md)

## Existing integration gap

The Trip Check Apps Script URL is still a placeholder in `shared/config.js`. The backend source files were not included in the original ZIP, so server-side permissions have not been verified.
