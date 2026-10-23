import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { queue, readingNow, UP_NEXT, yearStats } from '../lib/books';
import { fmtShortDay, today } from '../lib/dates';
import { Label } from '../components/common';
import { QueueList } from '../components/QueueList';
import { ReadingRow } from '../components/ReadingRow';
import { SyncMark } from '../components/SyncMark';
import { YearGrid } from '../components/YearGrid';

export function Home() {
  const { books, loaded } = useStore();
  const { setTab } = useUI();
  const [swiped, setSwiped] = useState<string | null>(null);
  const reading = useMemo(() => readingNow(books), [books]);
  const q = useMemo(() => queue(books), [books]);
  const day = today();
  const finished = useMemo(() => yearStats(books, +day.slice(0, 4)).finished.length, [books, day]);
  const empty = loaded && books.length === 0;

  return (
    <main className="screen">
      <header className="ledger">
        <span>{fmtShortDay(day)} · {finished} {finished === 1 ? 'book' : 'books'} this year</span>
        <SyncMark />
      </header>

      {empty && (
        <section className="empty">
          <p>Nothing here yet.</p>
          <p className="muted">Add books on the Queue tab, or bring in your spreadsheet from Settings.</p>
          <button className="btn primary" onClick={() => setTab('queue')}>Go to the queue</button>
        </section>
      )}

      {reading.length > 0 && (
        <section>
          <Label>Reading</Label>
          <ul className="list">
            {reading.map(({ book, read }) => (
              <ReadingRow key={read.id} book={book} read={read} open={swiped === read.id} setOpen={(v) => setSwiped(v ? read.id : null)} />
            ))}
          </ul>
        </section>
      )}

      {loaded && !empty && (
        <section>
          <Label>Up Next</Label>
          {q.length ? <QueueList books={q.slice(0, UP_NEXT)} queue={q} /> : <p className="muted small pad">The queue is empty. Add books on the Queue tab.</p>}
        </section>
      )}

      {loaded && !empty && (
        <section>
          <Label>The year so far</Label>
          <YearGrid books={books} />
        </section>
      )}
    </main>
  );
}
