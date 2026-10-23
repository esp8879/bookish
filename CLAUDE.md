# Books

Personal reading log, mobile-first PWA replacing `book tracker.xlsx`. Spec: `book-tracker-spec.md`. Purely for tracking: never add recommendations, discovery, covers, external book lookups, ratings, tags, reflection prompts (afterglow was built and removed on 2026-10-22 at the owner's request), notifications or social features.

## Stack
- React 19 + Vite + TypeScript, plain CSS (`src/styles.css`), `vite-plugin-pwa`. Same architecture as `../bebe`.
- Firebase project `book-tracker-9q4lo4` (Spark, no billing): Firestore (`nam5`) + Hosting only. No Cloud Functions, no Firebase Auth. Live: https://book-tracker-9q4lo4.web.app

## Identity
No accounts. The library id in the URL path (`/l/<24+ char token>`) is the secret, cached in localStorage (`books.lid`, `src/library.ts`). `scripts/postbuild.mjs` strips `start_url` from the manifest so iOS Add to Home Screen keeps the path. `firestore.rules` only allows `libraries/{lid}/**` for well-formed ids.

## Data
- One collection, `libraries/{lid}/books/{id}`: title (Title Case), author, `reads[]` (status reading|finished|dnf, started/ended as `YYYY-MM-DD` or `YYYY`, one note), `shelf` (`next` = Up Next, max 5, on Home; `queue` = the long someday list) + `rank` (fractional order within the shelf; `planShelve` in `src/lib/books.ts` handles the cap by bumping Up Next's last book to the top of the queue; `normalizeBook` maps the old `pile_rank` field to Up Next), `highlights[]`, soft delete via `deleted_at`. Types in `src/types.ts`.
- Dates are plain calendar strings; no timezone logic anywhere (`src/lib/dates.ts`).
- The whole library is one listener; the Firestore persistent cache makes every screen and write work offline. Writes are fire-and-forget (not awaited). `hasPendingWrites` drives the "Not synced yet" mark.
- Pure logic lives in `src/lib/` and is tested in `src/lib/__tests__/` (title case, dates, derived lists, year stats, spreadsheet + clippings import, merge idempotency, export).

## Commands
- `npm run dev` / `npm run build` / `npm test`
- `npm run deploy` = build + `firebase deploy --only hosting,firestore`
- `node scripts/icons.mjs` (after `npm i --no-save playwright-core`) rasterizes `public/icon.svg`.

## Conventions
- Look: paper `#F5F0E6`, ink `#2B2520`, library green `#3F5B4A` (dark theme follows the system). Literata (self-hosted in `public/fonts`) for titles, notes and highlights; system sans for UI; small-caps letter-spaced section labels; hairline rules, no cards or shadows, no emoji, no textures.
- Personal data (`*.xlsx`, `My Clippings*.txt`) is gitignored and must never be bundled into `dist/` or `public/`.
