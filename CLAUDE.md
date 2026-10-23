# Books

Personal reading log, mobile-first PWA replacing `book tracker.xlsx`. Spec: `book-tracker-spec.md`. Purely for tracking: never add recommendations, discovery, covers, external book lookups, ratings, tags, reflection prompts (afterglow was built and removed on 2026-10-22 at the owner's request), notifications or social features.

## Stack
- React 19 + Vite + TypeScript, plain CSS (`src/styles.css`), `vite-plugin-pwa`. Same architecture as `../bebe`.
- Firebase project `book-tracker-9q4lo4` (Spark, no billing): Firestore (`nam5`) + Hosting only. No Cloud Functions, no Firebase Auth. Live: https://book-tracker-9q4lo4.web.app

## Identity
No accounts. The library id in the URL path (`/l/<24+ char token>`) is the secret, cached in localStorage (`books.lid`, `src/library.ts`). `scripts/postbuild.mjs` strips `start_url` from the manifest so iOS Add to Home Screen keeps the path. `firestore.rules` only allows `libraries/{lid}/**` for well-formed ids.

## Data
- One collection, `libraries/{lid}/books/{id}`: title (Title Case), author, `reads[]` (status reading|finished|dnf, started/ended as `YYYY-MM-DD` or `YYYY`, one note), `rank` (fractional position in the one queue, null when not queued; Up Next is just `queue(books).slice(0, UP_NEXT)`, so dragging on Home or the Queue tab edits the same order; `normalizeBook` maps older `pile_rank`/`shelf` documents into it), `highlights[]`, soft delete via `deleted_at`. Types in `src/types.ts`.
- Dates are plain calendar strings; no timezone logic anywhere (`src/lib/dates.ts`).
- The whole library is one listener; the Firestore persistent cache makes every screen and write work offline. Writes are fire-and-forget (not awaited). `hasPendingWrites` drives the sync mark (`src/components/SyncMark.tsx`): Synced / Syncing… / Not synced / Offline, kept short so it fits beside the ledger line; the date side trims with an ellipsis before it can ever overlap.
- Pure logic lives in `src/lib/` and is tested in `src/lib/__tests__/` (title case, dates, derived lists, year stats, spreadsheet + clippings import, merge idempotency, export).

## Commands
- `npm run dev` / `npm run build` / `npm test`
- `npm run deploy` = build + `firebase deploy --only hosting,firestore`
- `node scripts/icons.mjs` (after `npm i --no-save playwright-core`) rasterizes `public/icon.svg`.

## Screens
Home + drawers: the main screen (ledger line + sync state, Reading rows with swipe actions, Up Next = top 5 of the queue) has no tab bar, just a bottom row opening Queue (the whole ordered queue, adding happens only here, new books at the bottom; a collapsed Didn't finish section below to re-queue set-aside books), Stats (year dropdown, search icon, year numbers + that year's books) and Settings; each has "‹ Now" to return. On a phone they end in a fixed `.bottom-band` (a paper margin the height of the drawers row, no rule, no buttons, with a soft fade that appears only while content is scrolled under it); the main screen's row has no rule either that content scrolls behind. The main screen must fit an iPhone 17 Pro (402×874) with 2 reading + 5 up next without scrolling: test at 402×778 in the browser (no safe-area insets there). The main screen is `position: fixed` and scrolls itself (only if it ever overflows), so the page never scrolls the ledger line under the status bar. No `viewport-fit=cover` in index.html: with it, iOS 26 let the ledger line slide under the status bar.

## Conventions
- UI consistency: every screen but the main one uses `ScreenHeader` (back on the left, named for where it goes via `TAB_NAMES`; one action on the right; title row). One spacing scale (`--gutter` 20px, `--section` 32px, 12px row padding, 44px controls). Queue rows look the same on the main screen and the Queue screen. Removals and queue moves get an Undo toast rather than a confirm dialog; buttons that start slow work say what's happening ("Reading file…", "Deleting…").
- Wide screens (≥700px, the Mac): the main screen flows normally so the drawers row sits right under the content; sheets become centred dialogs; mouse/trackpad users get hover states, focus rings, and the Reading row's swipe actions on hover.
- Look: paper `#F5F0E6`, ink `#2B2520`, library green `#3F5B4A` (dark theme follows the system). Literata (self-hosted in `public/fonts`) for titles, notes and highlights; system sans for UI; small-caps letter-spaced section labels; hairline rules, no cards or shadows, no emoji, no textures.
- Update prompt: `applyUpdate()` in `src/sw.ts` posts SKIP_WAITING to the waiting worker itself and reloads on `controllerchange` (with a timeout fallback). The plugin's `updateSW(true)` doesn't reload for builds workbox labels "external", which is how they often arrive in iOS home-screen apps.
- Personal data (`*.xlsx`, `My Clippings*.txt`) is gitignored and must never be bundled into `dist/` or `public/`.
