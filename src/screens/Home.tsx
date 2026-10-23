import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { daysIn, history, matchesSearch, pile, readingNow, type HistoryItem } from '../lib/books';
import { fmtRange, yearOf } from '../lib/dates';
import { Label } from '../components/common';
import { PileList } from '../components/PileList';
import { SyncMark } from '../components/SyncMark';

export function Home() {
  const { books, loaded } = useStore();
  const { openBook, setAdding, setFinishing } = useUI();
  const [q, setQ] = useState('');
  const reading = useMemo(() => readingNow(books), [books]);
  const up = useMemo(() => pile(books), [books]);
  const read = useMemo(() => history(books), [books]);
  const shown = useMemo(() => read.filter((i) => matchesSearch(i, q)), [read, q]);
  const byYear = useMemo(() => {
    const groups: { year: number | null; items: HistoryItem[] }[] = [];
    for (const i of shown) {
      const y = yearOf(i.read.ended);
      if (groups[groups.length - 1]?.year !== y) groups.push({ year: y, items: [] });
      groups[groups.length - 1].items.push(i);
    }
    return groups;
  }, [shown]);

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
          <button className="btn primary" onClick={() => setAdding(true)}>Add a book</button>
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
          <Label right={<button className="btn link small" onClick={() => setAdding(true)}>Add</button>}>Up Next</Label>
          {up.length ? <PileList books={up} /> : <p className="muted small pad">The pile is empty.</p>}
        </section>
      )}

      {read.length > 0 && (
        <section>
          <Label>Read</Label>
          <input type="search" className="search" placeholder="Search titles, authors, notes" value={q} onChange={(e) => setQ(e.target.value)} />
          {byYear.map((g) => (
            <div key={g.year ?? 'none'} className="year-group">
              <h3 className="year-head">{g.year ?? 'Undated'}<span>{g.items.length}</span></h3>
              <ul className="list">
                {g.items.map(({ book, read: r }) => (
                  <li key={r.id}>
                    <button className="row-main" onClick={() => openBook(book.id)}>
                      <span className="title">{book.title}</span>
                      <span className="author">{book.author}<span className="meta"> · {fmtRange(r.started, r.ended)}</span>{r.status === 'dnf' && <span className="dnf"> · Didn't finish</span>}</span>
                      {r.note && <span className="note clamp">{r.note}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {q && !shown.length && <p className="muted small pad">Nothing matches “{q}”.</p>}
        </section>
      )}
    </main>
  );
}
