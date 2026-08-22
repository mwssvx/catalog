# Catalog — clothing shop window

Sellers at Dordoi Bazaar keep photos, notes, Instagram, and WhatsApp in a mess. This site turns that into a stacked catalog customers can browse.

This is a **catalog**, not a marketplace. There is no cart, checkout, payment, delivery, or customer account. Shoppers look at what is in stock and message the seller on **WhatsApp**.

Languages: **Russian** (default) and **Kyrgyz**. Prices are in **сом (KGS)**.

This is the website. Later iPhone and Android apps should reuse the same `/api/v1` routes so catalog data is not rebuilt.

## Safe setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` from the checklist below. Never commit `.env.local`, the service role key, or passwords.

Then:

```bash
npm run dev
```

This starts the **Hono API** on port `3001` and the **Vite** React app on port `5173` (Vite proxies `/api` to the API).

Open [http://localhost:5173](http://localhost:5173).

| Place | URL |
| --- | --- |
| Public catalog (Russian) | `/` |
| Public catalog (Kyrgyz) | `/ky` |
| Privacy / terms | `/privacy`, `/terms` |
| Seller studio | `/studio` (footer link; known URL) |
| Studio login | `/studio/login` |

Studio login is **email + password** for the owner Auth user. There is no public registration in the app.

Production (one Node process serves API + SPA):

```bash
npm run build
NODE_ENV=production npm start
```

Deploy target: **Railway** (see [LAUNCH.md](LAUNCH.md)). Docker image is in `Dockerfile`.

## Environment variables

Copy names from `.env.example`. Placeholders only in git; real values stay in `.env.local` or the host’s secret store.

| Name | Where | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Server | Supabase project URL (also accepts `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_ANON_KEY` | Server | Anon key; RLS still applies (also accepts `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Migration only | Bypasses RLS. Never ship to the client. |
| `PUBLIC_SHOP_SLUG` | Server | Which shop the public catalog shows (`dordoi`) |
| `SHOP_WHATSAPP` | Server | Fallback WhatsApp digits if the shop row is empty |
| `OWNER_EMAIL` | Migration script only | Existing Auth user to attach as owner |
| `API_PORT` | Server | Hono listen port in local/dev (default `3001`) |
| `PORT` | Server | Preferred in production (Railway). Overrides `API_PORT` when set |
| `WEB_ORIGIN` | Server | Public HTTPS origin for CORS + cookies |

The SPA always calls same-origin `/api` in production. Do not put service-role keys in the client.

## Supabase dashboard checklist

Do this once. Do not invent keys in the repo.

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → API**: copy Project URL and `anon` `public` key into `.env.local` as `SUPABASE_URL` / `SUPABASE_ANON_KEY`. Keep `service_role` for migration only.
3. **SQL Editor**: paste and run **all five** migrations in order:
   - `supabase/migrations/20260818120000_catalog_foundation.sql`
   - `supabase/migrations/20260820000000_media_pipeline.sql`
   - `supabase/migrations/20260820120000_shop_branding.sql`
   - `supabase/migrations/20260820140000_board_versioning.sql`
   - `supabase/migrations/20260820160000_ai_jobs_queue.sql`
4. **Authentication → Providers → Email**: enable email/password.
5. Turn **off** public sign-up. The app has no register route.
6. **Authentication → Users → Add user**: create the **one owner** with email + password.
7. Set Auth **Site URL** to the production origin (and allow that origin in redirect URLs).
8. Optional one-time JSON import (does **not** delete `data/catalog.json`):

```bash
OWNER_EMAIL=you@example.com npm run migrate:catalog
```

9. Confirm RLS is enabled on catalog tables. Photos use public HTTPS URLs for now (no object storage).

## Photos (no AWS)

Paste public `https://` image/video links in Studio. Phone file upload / S3 can be added later if needed.

## Deploy (Railway)

See the full go-live checklist in [LAUNCH.md](LAUNCH.md).

```bash
npm run build
NODE_ENV=production WEB_ORIGIN=https://your-domain npm start
```

Or build/run the `Dockerfile`. Health check: `GET /api/health`.

## Commands

```bash
npm run dev              # Vite :5173 + Hono API :3001
npm run lint
npm run typecheck
npm run test
npm run build            # Vite → dist/
npm run start            # production: API + static SPA
npm run check            # lint + typecheck + test + build
npm run migrate:catalog  # import data/catalog.json into Supabase
```

## Architecture

```
src/pages/            Public catalog, item, legal, studio
src/components/       UI for catalog and studio
server/               Hono API on /api/v1 (+ static SPA in production)
src/lib/catalog/      Types, Supabase repository, parser, formatting
src/lib/media/        URL helpers and (optional future) upload pipeline
src/lib/supabase/     Cookie session client + service-role admin client
src/lib/auth.ts       Verified getUser + owner profile
src/i18n/             i18next (ru / ky)
supabase/migrations/  Postgres tables + Row Level Security
data/catalog.json     Legacy snapshot; import with migrate:catalog
```

**Data:** PostgreSQL via Supabase. Public pages use the anon client and RLS (published products only). Studio uses a verified Auth user whose `profiles.role` is `owner`.

**Auth:** `@supabase/ssr` session cookies via the Hono API; the Vite SPA calls `/api` with `credentials: "include"`.

**Contact:** WhatsApp `wa.me` with product code and title. No payments.

**Media:** Public HTTPS URLs on product fields. Object storage (S3 / Supabase Storage) can be added later.

## Recover data

| What | Where | How |
| --- | --- | --- |
| Source + SQL | Git | This repo |
| Legacy JSON | `data/catalog.json` | Still in git; import with `npm run migrate:catalog` |
| Live catalog | Supabase | Table backup / SQL dump from the dashboard |
| Product photos | HTTPS URLs on items | Hosted wherever you paste from |

## API (keep stable for future apps)

- `GET /api/v1/shop` — public shop fields (including logo and cover)
- `PATCH /api/v1/shop` — owner; name, description/tagline, location, WhatsApp, currency, logo, cover
- `GET /api/v1/items` — published products; owner session can see drafts
- `POST /api/v1/items` — owner; create draft or published product
- `GET /api/v1/items/:id` — 404 for unpublished unless owner
- `PATCH` / `DELETE` `/api/v1/items/:id` — owner
- `POST /api/v1/items/bulk` — owner; publish, unpublish, or status
- `POST /api/v1/parse` — owner
- `POST /api/v1/auth/login` — owner email/password
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- Upload intent / complete / abort / parts / cleanup / resume — owner
- Board + AI routes — owner
- `GET /api/health` — liveness
