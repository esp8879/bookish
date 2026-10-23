import { useMemo } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { daysIn, queue, readingNow, upNext, UP_NEXT_MAX } from '../lib/books';
import { Label } from '../components/common';
import { ShelfList } from '../components/ShelfList';
import { SyncMark } from '../components/SyncMark';

export function Home() {
  const { books, loaded } = useStore();
  const { openBook, setAdding, setFinishing, setTab } = useUI();
  const reading = useMemo(() => readingNow(books), [books]);
  const up = useMemo(() => upNext(books), [books]);
  const queued = useMemo(() => queue(books).length, [books]);

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
          <p className="muted">Add the book you're reading, or bring in your spreadsheet from Settings.</p>
          <button className="btn primary" onClick={() => setAdding('queue')}>Add a book</button>
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
          <Label right={<button className="btn link small" onClick={() => setAdding('next')}>Add</button>}>Up Next</Label>
          {up.length ? <ShelfList books={up} /> : <p className="muted small pad">Nothing lined up. Pick a few from your queue.</p>}
          {queued > 0 && (
            <button className="queue-link" onClick={() => setTab('queue')}>
              <span>{up.length < UP_NEXT_MAX ? `${UP_NEXT_MAX - up.length} open ${UP_NEXT_MAX - up.length === 1 ? 'spot' : 'spots'} · ` : ''}{queued} in your queue</span><span aria-hidden>›</span>
            </button>
          )}
        </section>
      )}
    </main>
  );
}
