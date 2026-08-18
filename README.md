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

Edit `.env.local` with your own values. Never commit `.env.local`, API keys, or passwords.

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Place | URL |
| --- | --- |
| Public catalog (Russian) | `/` |
| Public catalog (Kyrgyz) | `/ky` |
| Seller studio | `/studio` |
| Open Board | `/studio/board` |
| Studio login | `/studio/login` |

If `STUDIO_PASSWORD` is unset, the code currently falls back to `studio`. Set a private password in `.env.local` before anyone else uses the machine.

## Environment variables

Copy names from `.env.example`. Use placeholders there; put real values only in `.env.local`.

| Name | Required | Purpose |
| --- | --- | --- |
| `STUDIO_PASSWORD` | Yes for a real stall | Cookie login for `/studio` |
| `SHOP_WHATSAPP` | Recommended | Seller WhatsApp digits (country code, no `+`) used if shop data has no number |
| `OPENAI_API_KEY` | No | If empty, the board stays manual. AI grouping is not faked. |
| `OPENAI_MODEL` | No | Model name when the OpenAI key is set. Default in code: `gpt-4o-mini` |

## Commands

```bash
npm run dev          # local site
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Vitest unit tests
npm run build        # production build
npm run check        # lint + typecheck + test + build
```

## Architecture

```
src/app/[locale]/     Public catalog, item page, studio, Open Board (ru / ky)
src/app/api/v1/       JSON API for shop, items, parse, uploads, board, auth, AI
src/components/       Catalog UI, studio forms, Open Board canvas
src/lib/catalog/      Types, JSON store, note parser, price/WhatsApp formatting
src/lib/board/        Board layout helpers
src/lib/ai/           Optional OpenAI tools; no-op without OPENAI_API_KEY
src/i18n/             next-intl routing (ru default, ky)
messages/             Russian and Kyrgyz copy
data/catalog.json     Local catalog + board snapshot (current prototype store)
public/uploads/       Private seller photos/videos written by the upload API
```

**Data today:** one JSON file at `data/catalog.json`. The studio writes it through `/api/v1` routes. Public pages only show items with `published: true`.

**Contact:** item pages build a WhatsApp link (`wa.me`) with the product code and title. No payments.

**Auth:** studio cookie `catalog_studio`, checked in `src/proxy.ts`.

## Recover the prototype

Git is the recoverable baseline for source and `data/catalog.json`.

| What | Where | How to recover |
| --- | --- | --- |
| Catalog + board JSON | `data/catalog.json` | `git checkout -- data/catalog.json` or copy from `backups/` |
| Uploaded photos/videos | `public/uploads/` | **Not in Git.** Copy the folder from a backup machine. Keep `.gitkeep`. |
| Environment names | `.env.example` | Recreate `.env.local` from that file. Real secrets are only on this computer. |
| Local file backup | `backups/catalog.json` | Ignored by Git. Copy it back to `data/catalog.json` if the live file is lost. |

After restoring JSON or uploads, restart `npm run dev`.

## API (keep stable for future apps)

- `GET /api/v1/shop`
- `GET /api/v1/items`
- `GET /api/v1/items/:id`
- `POST /api/v1/parse`
- `POST /api/v1/auth/login` (sellers)
- `POST /api/v1/uploads` (studio)
- `GET` / `PUT` `/api/v1/board`
- `POST /api/v1/board/command`
- `GET` / `POST` `/api/v1/ai/act`
