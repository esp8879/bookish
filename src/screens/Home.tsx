import { useMemo } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { daysIn, queue, readingNow, UP_NEXT } from '../lib/books';
import { Label } from '../components/common';
import { QueueList } from '../components/QueueList';
import { SyncMark } from '../components/SyncMark';

export function Home() {
  const { books, loaded } = useStore();
  const { openBook, setFinishing, setTab } = useUI();
  const reading = useMemo(() => readingNow(books), [books]);
  const q = useMemo(() => queue(books), [books]);
  const up = q.slice(0, UP_NEXT);
  const more = q.length - up.length;

  const empty = loaded && books.length === 0;

  return (
    <main className="screen">
      <header className="masthead">
        <h1 className="wordmark">Books</h1>
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
            {reading.map(({ book, read: r }) => {
              const d = daysIn(r);
              return (
                <li key={r.id} className="reading-row">
                  <button className="row-main" onClick={() => openBook(book.id)}>
                    <span className="title big">{book.title}</span>
                    <span className="author">{book.author}{d != null && <span className="meta"> · {d === 0 ? 'started today' : `day ${d + 1}`}</span>}</span>
                  </button>
                  <button className="btn" onClick={() => setFinishing({ bookId: book.id, readId: r.id })}>Finish</button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {loaded && !empty && (
        <section>
          <Label>Up Next</Label>
          {up.length ? <QueueList books={up} queue={q} /> : <p className="muted small pad">The queue is empty. Add books on the Queue tab.</p>}
          {up.length > 0 && (
            <button className="queue-link" onClick={() => setTab('queue')}>
              <span>{more > 0 ? `${more} more in the queue` : 'Open the queue'}</span><span aria-hidden>›</span>
            </button>
          )}
        </section>
      )}
    </main>
  );
}
