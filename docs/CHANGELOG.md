# Taxi Qaid ERP — Release Notes

## Version 1.1 — 2026-11-04

### Changed
- Extracted the original inline CSS to `css/styles.css` without changing style rules.
- Extracted the original inline JavaScript into documented functional files with its original load order.
- Moved the company logo into `assets/` and updated its relative URL.
- Translated Spanish source comments into English.
- Added a client-side signed-in-user + role check before all five original Google Sheets write requests.
- Created project and security documentation in English.
- Preserved the original Google Apps Script request format and endpoint URLs.

### Not changed
- Existing UI design, text labels, module workflows, and data field names.
- Existing Supabase project and public credentials.
- Existing Google Apps Script deployments.
- The unavailable Trip Check Apps Script deployment; the placeholder remains.
- Breakdowns Tracker / Maintenance Tracker remain unimplemented placeholders.

### Verification
- All extracted JavaScript files passed syntax checks. Local asset references and the full ZIP archive were verified.
- A Chromium smoke test with mocked Supabase and Google Apps Script responses passed: login, data loading, navigation, driver update, form opening, logout, and a denied update without a session.
- Real Supabase sign-in, Apps Script authorization, read/write behavior, and remote data were not tested; they require company accounts and backend access.

### Security caveat
- The frontend write guard is not a backend security boundary. See `SECURITY.md`.
