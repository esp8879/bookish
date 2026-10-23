import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { queue, searchText, UP_NEXT } from '../lib/books';
import { QueueList } from '../components/QueueList';

/** Every book you want to read, in order. The top five are Up Next on the Books tab. */
export function Queue() {
  const { books } = useStore();
  const { setAdding } = useUI();
  const [q, setQ] = useState('');
  const list = useMemo(() => queue(books), [books]);
  const shown = useMemo(() => {
    const n = searchText(q);
    return n ? list.filter((b) => searchText(`${b.title} ${b.author}`).includes(n)) : list;
  }, [list, q]);
  const searching = !!q.trim();

  return (
    <main className="screen">
      <header className="masthead">
        <h1 className="wordmark">Queue</h1>
        <button className="btn link" onClick={() => setAdding(true)}>Add</button>
      </header>
      {list.length > 8 && <input type="search" className="search" placeholder="Search the queue" value={q} onChange={(e) => setQ(e.target.value)} />}
      {list.length ? (
        <section>
          {!searching && <p className="muted small queue-note">Drag to reorder. The top {UP_NEXT} are Up Next.</p>}
          {/* Reordering or numbering a filtered list would mislead, so both are off while searching. */}
          <QueueList books={shown} queue={list} sortable={!searching} numbered={!searching} />
          {searching && !shown.length && <p className="muted small pad">Nothing matches “{q}”.</p>}
        </section>
      ) : (
        <section className="empty">
          <p>The queue is empty.</p>
          <p className="muted">Everything you want to read goes here. The top {UP_NEXT} show up on the Books tab as Up Next.</p>
          <button className="btn primary" onClick={() => setAdding(true)}>Add a book</button>
        </section>
      )}
    </main>
  );
}
