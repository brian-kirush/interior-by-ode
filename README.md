# Interior by ODE

Welcome to the Interior by ODE application. This README contains quick setup and troubleshooting steps for running the app locally and verifying core features (dashboard stats, client management, quotations and invoices).

## Local Development (Quickstart) ✅

Prerequisites:
- Node.js v18 or newer (recommended: v18 or v20). Older Node versions (e.g., v12) will cause syntax errors with modern dependencies.
- PostgreSQL database available and accessible via `DATABASE_URL` environment variable.

Environment variables (commonly set in `.env`):
- DATABASE_URL — full connection string for PostgreSQL (required for most features)
- SESSION_SECRET — a long secret for session encryption
- NODE_ENV — `development` or `production` (optional)

Typical local setup steps:

1. Install dependencies

```bash
cd server
npm install
```

2. Initialize or check your database schema (this project provides helper scripts):

```bash
npm run setup-db    # Creates tables (if configured) and seeds minimal data
npm run check-db    # Quick DB check
```

3. Start the server in development mode:

```bash
npm run dev
```

4. Open the app in your browser:

- Backend + frontend served together at http://localhost:5000 (default)
- Health check: http://localhost:5000/health

If you prefer running the frontend separately (e.g., during SPA development), update `API_BASE_URL` in `server/client_temp/app.js` or ensure CORS origin includes your frontend origin (default is `http://localhost:3000` in development).

## Common Issues & Troubleshooting ⚠️

- Server crashes immediately with a `SyntaxError` referencing package files (e.g., `connect-pg-simple`): this is almost always due to an unsupported Node version. Upgrade to Node 18+ (using `nvm` is recommended).
- Login succeeds but subsequent API calls still return `401 Authentication required`: if you see this on your deployed app, it likely means the session cookie is not being set by the server (common when the app is behind a reverse proxy). To fix this ensure `app.set('trust proxy', 1)` is set in `server/src/app.js` and that session options include `proxy: true` and an appropriate `sameSite` policy. There's a helper script `server/scripts/check-session-cookie.js` you can use to verify the login response includes `Set-Cookie`.
- Dashboard stats not appearing: ensure you are logged in (session-based auth). The frontend sends cookies (`credentials: 'include'`), so make sure the backend has a working session store and that `SESSION_SECRET` is set.
- Cannot save quotations or clients: check the server logs for DB errors (missing tables, constraints). Run `npm run setup-db` to create required tables.
- PDF downloads (quotations/invoices) not working: verify endpoints `/api/quotations/:id/download` and `/api/invoices/:id/download` exist and check server logs for PDF generation errors.

If you run into problems, check server logs (console output), and open an issue with a short reproduction and relevant logs.
