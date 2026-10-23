# Book tracker — spec

A personal reading log as a mobile-first PWA, replacing `book tracker.xlsx`. Purely for tracking: it is for one reader, and the data belongs to that reader.

**Never:** recommendations, discovery, covers, external book lookups (Google Books, Open Library, etc.), ratings, tags, afterglow or other reflection prompts, notifications, social features.

## Architecture (same principles as bébé tracker)

- React + Vite + TypeScript, plain CSS, `vite-plugin-pwa`.
- Its own Firebase project on the Spark plan (no billing): Firestore + Hosting only. No Cloud Functions, no Firebase Auth. Starts on the default `*.web.app` URL.
  - Project `book-tracker-9q4lo4` (created 2026-10-22), Firestore `(default)` in `nam5`, web app id `1:957304127050:web:565703fa3eac02b5b8b0b3`. Web config: `firebase apps:sdkconfig web 1:957304127050:web:565703fa3eac02b5b8b0b3 --project book-tracker-9q4lo4`. Live URL will be https://book-tracker-9q4lo4.web.app
- **Identity:** no accounts. The library id in the URL path (`/l/<24+ char random token>`) is the secret. It is cached in localStorage on each device. The manifest has no `start_url` (stripped in a postbuild script) so iOS Add to Home Screen keeps the path. `firestore.rules` only allows `libraries/{lid}/**` for well-formed ids.
- **Updates:** `registerType: 'prompt'`. Check for a new service worker hourly and on `visibilitychange` → visible, then show an "Update now" prompt.
- `sw.js` and `manifest.webmanifest` are served `no-cache`. A public release-notes page is updated after every user-visible change.

## Offline (top requirement)

Used almost entirely on a phone, often on the subway.

- The full app shell is precached, so it opens with no signal.
- The Firestore persistent cache (IndexedDB) holds the whole library. The library is small, so there are no windowed queries and the app listens to everything.
- Every action works offline and is queued: add, start, finish, DNF, reorder, notes.
- A quiet "not synced yet" marker comes from `hasPendingWrites`.
- Installing to the Home Screen is the intended use, because iOS keeps storage for installed web apps much more reliably than for a Safari tab.
- Acceptance test: in airplane mode, add a book, finish one, reorder Up Next, and write a note. Reconnect and everything syncs.

## Data

Dates are calendar strings (`YYYY-MM-DD`, with `YYYY` allowed for imported 2025 rows). There are no timestamps for reading events, so no timezone logic. Soft delete via `deleted_at`.

- `libraries/{lid}/books/{id}`
  - `title` (stored in Title Case), `author`
  - `reads[]`: `{ id, status: 'reading' | 'finished' | 'dnf', started, ended, note }`
  - `rank`: position in the queue (fractional), null when not queued. There is one queue; **Up Next is simply its top 5**. A book being read is never queued.
  - `highlights[]`: `{ id, text, location?, added, source: 'clippings' | 'manual' }`. `id` is a hash of the normalized text, so re-imports are no-ops.

## Screens

Navigation: **home + drawers**. The main screen is home and has no tab bar, only a quiet small-caps row at the bottom: **Queue · Stats · Settings**. Each opens as a drawer screen with **‹ Now** at the top to go back.

**Fit:** the main screen fits an iPhone 17 Pro (402×874pt) without scrolling with up to **2 books reading and 5 up next** (1 reading is the usual case). Up Next titles and authors are one line each; with two books reading, their titles are one line too.

**Main screen** (no title):
- **Ledger line:** small caps, "Thu, Oct 22 · 25 books this year" (finished only, not DNFs), with the sync state always shown on the right: Synced / Syncing… / Waiting to sync.
1. **Reading:** every book with a read in progress, all equal (switching between two books is normal). Shows days in. Swipe left for **Finished · Didn't finish · Edit**; no visible Finish button.
2. **Up Next:** the top 5 of the queue. Dragging here reorders the queue itself. No adding, no queue link (the tab bar does that).
3. **2026 so far:** twelve month columns of week squares (days 1–7, 8–14, 15–21, 22–28, 29–end). Light green = a book in progress that week, full green = finished a book; weeks still to come are faint outlines. The legend sits in the section label, and tapping a week shows what it was in the same spot.

**Queue:** every book you want to read, in order, drag to reorder. The top 5 carry a small green numeral (they're Up Next); dragging a book into or out of the top 5 is the only way to promote or demote. Books are added only here: title and author (the author field suggests names already in the library), always at the bottom. A queued book that was set aside before shows "Didn't finish · date · N days in" and its note. Searchable once it's long.

**Stats:** a year at a time (year picker). The year's numbers on top (books finished, set aside, books per month, pace), then that year's books, newest first, with notes. Search covers every year: titles, authors and notes.

**Finish flow** (the main moment of use), from a Reading book:
done or DNF (the swipe action picks which; with an option to put a DNF back at the bottom of the queue) → write the note → "What's next?" showing Up Next, with the whole queue a tap away → start one in a single tap.

Sheets (Finish, Add) keep Cancel and Save pinned at the top and ride above the iOS keyboard (they follow `visualViewport`), so nothing is hidden while typing.

**Book page:** every read with its dates and note, plus that book's highlights (highlights are shown here only and are not searched). Buttons: **Read again** for finished books, **Try again** for DNF books. Both start a new read and keep the old ones. Queued books show their position; buttons add a book to the bottom of the queue or remove it.

**Settings:** library link (copy), export (JSON complete, CSV, Markdown by year), import, delete library.

## Import

- **Spreadsheet** (`book tracker.xlsx`):
  - Sheet `2025` has title and author only. Import as finished with `ended: '2025'`. Identical rows collapse.
  - Sheet `2026` has start, end and notes. A start with no end is in progress. Notes beginning "probably DNF" become `dnf`. Rows with no dates go to the queue, in row order.
  - Drop the manual `#` column. Convert titles to Title Case.
- **Kindle `My Clippings.txt`:**
  - Parsed in the browser and matched to books by title and author; anything unmatched is shown for manual mapping.
  - The file only grows, so skip highlights already imported. When a highlight was extended or shortened on the device, overlapping versions collapse to the latest. Highlights deleted on the Kindle can't be detected from the file.
  - Bookmarks and notes are ignored; only highlights are imported.
  - The file is in the Kindle's `documents/` folder. Newer MTP Kindles need OpenMTP on macOS.
- **Manual quotes:** for print books, type or paste them on the book page.

## Look and feel

Paper-like, warm, library-esque in type and structure, not in textures. No wood, grain or leather. No emoji.

- **Light theme:**
  - Paper `#F5F0E6`, ink `#2B2520`, muted `#7A6F63`.
  - Accent is **library green** `#3F5B4A`.
- **Dark theme** (follows the system setting): warm dark `#1D1915` with cream text.
- **Type:**
  - A bookish serif (Literata or Newsreader, self-hosted for offline) for titles and notes.
  - A quiet sans for UI.
  - Small-caps, letter-spaced section labels, like card-catalog drawers.
  - Tabular numerals for dates.
- Hairline rules between rows instead of cards and shadows, generous margins. It should feel like reading, not a dashboard.
