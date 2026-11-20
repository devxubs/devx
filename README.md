# DevX POS

A single-store point-of-sale and business management system for Bangladeshi retail shops. It covers the full counter-to-ledger flow: products and variants with barcode support, stock, orders with courier assignment, customers, purchases and purchase returns, supplier payments, expenses, assets, billing payouts, reports, staff roles/permissions, an audit log, a recycle bin, and staff chat.

Money is in BDT (৳). Order payments support Cash, bKash, Nagad and Rocket (with transaction-ID duplicate checks for mobile payments). Entities carry sequential prefixed IDs (e.g. `ORD_12`, `CUS_10`, `PROD_…`) generated server-side.

## Stack

Versions as resolved in `package-lock.json`:

| Layer | Technology |
|---|---|
| Framework | Next.js 15.4.2 (App Router), React 19.1.0 |
| Language | TypeScript 5.8.3 |
| UI | MUI (Material UI) 7.3.9, `@mui/x-data-grid` 8.26.0, Emotion, Iconify icons |
| Database | MySQL via Prisma 6.19.3 (`prisma/schema.prisma`) |
| Auth | JWT (HS256, `jsonwebtoken`) in an httpOnly-style cookie + per-request DB-backed role/permission checks |
| Tests | Vitest |
| Exports | ExcelJS (`xlsx`), `docx` (Word), CSV — loaded lazily, only when an export runs |

## Branch convention — read this first

**All work happens on the `muse` branch. Never commit to, push to, or merge into `main` unless the project owner explicitly instructs it.**

## Local setup

Prerequisites: Node.js, npm, and a MySQL server.

```bash
npm install
cp .env.example .env   # then fill in real values — never commit .env
npx prisma generate
npx prisma db push     # applies the schema to the database in DATABASE_URL
npm run dev
```

### Environment variables (names only)

See `.env.example` for the annotated list. The important ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string used by Prisma. |
| `JWT_SECRET` | Session JWT signing secret. **Required in production** — without it the API refuses to sign/verify tokens (fails closed). Changing it invalidates all sessions. |
| `SEED_ADMIN_PASSWORD`, `SEED_CASHIER_PASSWORD` | Passwords for the main seed (`prisma/seed.js`). The seed refuses to run without them; there are no default seeded passwords. |
| `UPLOAD_DIR` | Optional. Directory for uploaded images (default `<project>/public/uploads`, served at `/uploads/…`). Local disk is not persistent on serverless/ephemeral hosts. |
| `STEADFAST_API_KEY`, `STEADFAST_SECRET_KEY`, `STEADFAST_BASE_URL` | Optional courier credentials (server-side only, never exposed to the browser). |
| `PATHAO_CLIENT_ID`, `PATHAO_CLIENT_SECRET`, `PATHAO_USERNAME`, `PATHAO_PASSWORD`, `PATHAO_STORE_ID`, `PATHAO_BASE_URL` | Optional courier credentials (server-side only). |
| `ALLOW_DEMO_DATA`, `DEMO_SEED_PASSWORD`, `ALLOW_NON_TEST_DB` | Demo-seed guard switches — see below. |
| `TEST_DATABASE_URL` | Optional, tests only — see Testing. |

### Seeding

Main seed (roles, base data, admin/cashier accounts):

```bash
npm run seed   # node prisma/seed.js — requires SEED_ADMIN_PASSWORD / SEED_CASHIER_PASSWORD
```

Demo seed (a realistic interconnected demo dataset; additive and idempotent — it never deletes or overwrites existing records and never changes existing users/passwords):

```bash
ALLOW_DEMO_DATA=true npm run db:seed:demo
```

Demo-seed guardrails — the seeder **refuses to run** unless all of these hold:

- `ALLOW_DEMO_DATA=true` is set explicitly;
- `NODE_ENV` is not `production`;
- the target database name contains `test`, `demo` or `dev` (override only deliberately, with `ALLOW_NON_TEST_DB=true`).

**Never run the demo seed against a production database.**

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server (after build) |
| `npm run lint` | ESLint (`next lint`) |
| `npm test` | Vitest unit suite (hermetic — no database needed) |
| `npm run seed` | Main database seed |
| `npm run db:seed:demo` | Demo dataset seed (guarded, see above) |

Maintenance/evidence scripts live in `scripts/` (barcode duplicate scan, missing-ID repair, orphan-upload sweep, and similar). Each is guarded and dry-run-first; read its header before running it, and only ever run one when the owner asks.

## Testing

```bash
npm test
```

The Vitest suite (`tests/`) is unit-level over the business-logic libraries in `src/lib` (stock engine, purchase-return settlement, payments, finance, courier, audit diffing, rate limiting, uploads safety, and more), using Prisma-shaped fakes. It is hermetic: no database, no network.

There is also a **DB-gated integration suite** (`tests/integration/database.test.ts`) for transaction-sensitive behaviour. It is skipped unless `TEST_DATABASE_URL` is set, and it refuses to run unless the database **name contains `test`, `demo` or `dev`** (e.g. `devx_pos_local_test`). Never point `TEST_DATABASE_URL` at production or at the normal `DATABASE_URL` database:

```bash
TEST_DATABASE_URL="mysql://user:password@localhost:3306/devx_pos_local_test" npx vitest run tests/integration/database.test.ts
```

Automated tests prove the libraries, not the workflows — a manual runtime pass over the running demo is still required before any production rollout.

## Backups — the honest version

The in-app **Settings → System export is NOT a full backup**: it exports only a subset of tables (it omits, among others, users, purchases, supplier payments, purchase returns, stock movements, product variants and audit logs) and **there is no restore/import path anywhere in the app**.

The only real backup is a database dump taken outside the app, e.g.:

```bash
mysqldump -u <user> -p <database> > backup.sql
```

Take one before any production schema push (`npx prisma db push`) or other risky operation.

## Project structure

```
src/
  app/
    admin/        Thin route wrappers (one per admin page) — they render the matching page component
    api/          API route handlers (orders, products, purchases, reports, …)
    auth/         Sign-in page
  Pages/admin/    Page components, one folder per module (Order, Product, Customers, Reports, …)
  components/     Shared UI: CustomTable (components/Table), CustomModal, CustomAutocomplete,
                  EntityDetailModals, ExportButton, TablePrintDocument, …
  lib/            Shared server/business logic: auth & permissions, stock engine, finance,
                  purchase returns, payments, audit logging, pagination, barcode uniqueness,
                  courier clients, storage abstraction, export engine
  Layout/         App shell (sidebar, header, notifications)
  theme/          MUI theme
prisma/
  schema.prisma   Data model (single source of truth for the database shape)
  seed.js         Main seed        ·        seed-demo.js   Demo seed (guarded)
tests/            Vitest suites (+ tests/integration for the DB-gated suite)
scripts/          Guarded maintenance/evidence scripts
```

Layering convention: `src/app/admin` wrappers → `src/Pages/admin` page components → `src/app/api` routes → `src/lib` shared logic → Prisma. Money and stock figures are always recomputed server-side; client totals are never trusted.

## Notes for contributors

- Work only on the `muse` branch (see above).
- No database operation (seed, `db push`, repair scripts) runs against anything but a test/demo/dev database without the owner's explicit approval.
- Uploaded images are validated server-side (type by magic bytes, 5 MB cap) and stored via `src/lib/storage.ts`; product `images[]` entries are validated on write (image data-URLs ≤ 5 MB, `/uploads/…` paths, or http(s) URLs).
- Courier live booking is not wired up: the clients/config exist, but booking stays disabled until merchant credentials exist and the provider contracts are verified.
