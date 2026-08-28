For Windows, after PostgreSQL is installed and its `psql` command is on PATH, run `./powershell/start-api.ps1` to create a local `.env`, apply `sql/schema.sql`, and start the API automatically.
# KoraPoint

A browser-based point-of-sale app with a multi-tenant API foundation. Each company gets an isolated tenant, and each tenant can have multiple staff accounts.

## Backend foundation

The API uses Node.js, Express, PostgreSQL, bcrypt password hashing, JWT access tokens, and tenant-scoped queries. The schema is in `sql/schema.sql`.

1. Create a PostgreSQL database and enable `pgcrypto` (for UUIDs) and `citext`.
2. Run `sql/schema.sql` against that database.
3. Copy `.env.example` to `.env`, set a random `JWT_SECRET` of at least 32 characters, and set a private `BUSINESS_APPROVAL_CODE`.
4. Install dependencies with `npm install`.
5. Start the API with `npm start`.

For Windows, after PostgreSQL is installed and its `psql` command is on PATH, run `./powershell/start-api.ps1` to create a local `.env`, apply `sql/schema.sql`, and start the API automatically.

The API provides company onboarding and sessions (`POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me`), tenant bootstrap (`GET /api/bootstrap`), products and stock, atomic sales/refunds/purchases, suppliers, expenses, customers, staff accounts, and register operations. Refresh tokens are stored hashed and rotated on use.

The POS screens now authenticate against the API and route products, stock, checkout, refunds, purchases, register actions, suppliers, expenses, and staff management through tenant-scoped endpoints. localStorage remains only as a temporary UI cache and backup mechanism.

## Run the frontend locally

Open `html/index.html` in a browser, or run a local server from this folder:

```powershell
python -m http.server 8000
```

Then open http://localhost:8000.

The frontend expects the API to be running at `http://localhost:3000`. Create a company account from the sign-in screen; there is no shared default account.

## New-user tour

On first use, the app opens a short guided tour covering the dashboard, products, checkout, reports, register, backups, and settings. Users can skip it and restart it later from **Settings > Guided Tour > Start Tour**.

## Deploy with Vercel

Vercel hosts both the frontend and the Node.js API. The API entry point is `api/index.js`, and `vercel.json` routes `/api/*` requests to it. Vercel does not provide the PostgreSQL database, so create one with a provider such as Neon, Supabase, or another managed PostgreSQL service.

1. Push this repository to GitHub.
2. Import the repository into Vercel and keep the project root at the repository root.
3. In Supabase, create a project and copy its Node/Postgres connection string from **Project Settings > Database > Connect**. Prefer the pooler connection string for serverless workloads. Add it to Vercel as `DATABASE_URL`, along with `JWT_SECRET` (at least 32 characters), `BUSINESS_APPROVAL_CODE`, and `ALLOW_SIGNUP=false` for the Production environment.
4. Optionally add `RESEND_API_KEY` and `REPORT_FROM_EMAIL` for emailed reports.
5. Open the Supabase **SQL Editor**, paste and run `sql/schema.sql` once. Do not expose the Supabase service-role key in frontend code; this app connects through the server-side `DATABASE_URL` only.
6. Deploy. The frontend uses the deployed Vercel URL as its API URL automatically; local development continues to use `http://localhost:3000`.

Never commit `.env`, database passwords, or JWT secrets.

Authentication is handled by the server API with bcrypt password hashes, short-lived signed access tokens, rotated refresh tokens, rate-limited login attempts, tenant-scoped queries, and password-change session revocation. Supabase stores the PostgreSQL data; the Supabase service-role key is not used in the browser. Keep `ALLOW_SIGNUP=false` after the initial owner account is created.

## Updating the app

Edit the files locally, test with the local server, then commit and push:

```powershell
git add .
git commit -m "Update POS"
git push origin main
```

Vercel will redeploy automatically when changes are pushed to the connected GitHub branch.

## Data migration status

Authentication, company onboarding, tenant bootstrap, inventory, checkout, refunds, purchases, suppliers, expenses, staff, registers, and audit records use the backend API. localStorage remains only as a temporary cache and backup mechanism. Before charging clients, configure database backups, a paid production database plan, HTTPS, monitoring, and email/password-reset workflows.

## Hardware POS upgrade applied
This version adds a scalable foundation for configurable product groups, quick-sell grids, internal product codes, optional barcodes, wholesale pricing, and group-aware products. Run the schema through the existing database setup command to apply additive migrations.
