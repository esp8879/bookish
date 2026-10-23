import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI, type Tab } from '../ui';
import { queue, readingNow, UP_NEXT, yearStats } from '../lib/books';
import { fmtShortDay, today } from '../lib/dates';
import { startNewLibrary } from '../library';
import { Label, Wordmark } from '../components/common';
import { QueueList } from '../components/QueueList';
import { ReadingRow } from '../components/ReadingRow';
import { SyncMark } from '../components/SyncMark';

const DRAWERS: { id: Exclude<Tab, 'now'>; label: string }[] = [{ id: 'queue', label: 'Queue' }, { id: 'stats', label: 'Stats' }, { id: 'settings', label: 'Settings' }];

export function Home() {
  const { books, loaded, demo } = useStore();
  const { setTab } = useUI();
  const [swiped, setSwiped] = useState<string | null>(null);
  const reading = useMemo(() => readingNow(books), [books]);
  const q = useMemo(() => queue(books), [books]);
  const day = today();
  const finished = useMemo(() => yearStats(books, +day.slice(0, 4)).finished.length, [books, day]);
  const empty = loaded && books.length === 0;

  return (
    <main className="screen home">
      <header className="home-head">
        <div className="home-top"><Wordmark size="mini" /><SyncMark /></div>
        <div className="ledger">{fmtShortDay(day)} · {finished} {finished === 1 ? 'book' : 'books'} this year</div>
      </header>

      {demo && (
        <div className="demo-note">
          <span>A demo with sample books. Try anything, nothing is saved.</span>
          <button className="btn link small" onClick={startNewLibrary}>Start your own →</button>
        </div>
      )}

      {empty && (
        <section className="empty">
          <p>Nothing here yet.</p>
          <p className="muted">Add books on the Queue screen, or bring in your spreadsheet from Settings.</p>
          <button className="btn primary" onClick={() => setTab('queue')}>Go to the queue</button>
        </section>
      )}

      {reading.length > 0 && (
        <section>
          <Label>Reading</Label>
          {/* With two books in progress each title gets one line, so the screen still fits without scrolling. */}
          <ul className={`list${reading.length > 1 ? ' two' : ''}`}>
            {reading.map(({ book, read }) => (
              <ReadingRow key={read.id} book={book} read={read} open={swiped === read.id} setOpen={(v) => setSwiped(v ? read.id : null)} />
            ))}
          </ul>
        </section>
      )}

      {loaded && !empty && (
        <section>
          <Label>Up Next</Label>
          {q.length ? <QueueList books={q.slice(0, UP_NEXT)} queue={q} /> : <p className="muted small pad">The queue is empty. Add books on the Queue screen.</p>}
        </section>
      )}

      {/* The main screen is home; the rest are drawers opened from this quiet row and closed with "‹ Home".
          Pinned to the bottom on a phone; on a wide screen it follows the content. */}
      <nav className="drawers" aria-label="More">
        {DRAWERS.map((d) => <button key={d.id} onClick={() => setTab(d.id)}>{d.label}</button>)}
      </nav>
    </main>
  );
}
