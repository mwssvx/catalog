# Launch checklist

Ops steps that need your cloud logins. App polish is in the codebase; Supabase schema + WhatsApp + host still need you.

## Done in the app

- [x] Catalog empty state + WhatsApp CTA
- [x] Home uses shop name as hero; filters + search button
- [x] Studio list: one clear «Добавить»; bulk only when selected
- [x] Photo URL helper + examples; invalid link feedback
- [x] Mobile: sticky header, sticky WhatsApp on item, larger taps
- [x] Footer contact / privacy / terms; KY/RU copy pass
- [x] Placeholder WhatsApp `996700000000` blocked (must set real number in Settings)

## You must do (cannot invent)

### 1) SQL migrations (required)

Columns `logo_url`, board `version`, `ai_jobs.kind` are **still missing**.

**Fastest:** Supabase → **SQL Editor** → paste and run [`supabase/pending.sql`](supabase/pending.sql).

**Or:** add `DATABASE_URL` to `.env.local`, then:

```bash
npm run migrate:sql
npm run schema:check
```

### 2) Real WhatsApp

Open `/studio/settings`, paste your number like `996700123456`, save. Until then buyers see “WhatsApp not set”.

### 3) Real products

Catalog is empty (good). In Studio → **Добавить**: title, price, sizes, `https://` photo links → publish.

### 4) Publish host

**Vercel** (if you use `catalog-*.vercel.app`):

1. Push this repo (build generates `.vercel/output` with static + API).
2. In Vercel → Project → Settings → Environment Variables, add:
   - `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
   - `SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `PUBLIC_SHOP_SLUG=dordoi`
   - `SHOP_WHATSAPP=996700123456` (your real number)
   - `WEB_ORIGIN=https://YOUR-PROJECT.vercel.app` (exact URL, no trailing slash)
   - `NODE_ENV=production` (usually automatic)
3. Redeploy. Open `/api/health` — should return `{"ok":true}`.
4. Supabase Auth → Site URL = same `WEB_ORIGIN`.

**Railway / Docker** (alternative):

- Push git remote, set env from `.env.example`, `WEB_ORIGIN=https://your-domain`
- Uses `Dockerfile` + `npm start` (one Node process for API + SPA)

Then in Supabase Auth: **Site URL** = that HTTPS origin.

## Smoke after go-live

1. Catalog home loads shop name  
2. Open item → sticky WhatsApp works  
3. Studio list → add → edit → publish appears on home  
4. KY / RU language switch  
5. Privacy / terms / footer WhatsApp  
