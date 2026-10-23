import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { queue, searchText, upNext, UP_NEXT_MAX } from '../lib/books';
import { ShelfList } from '../components/ShelfList';

/** Everything you might read someday. Promote a few into Up Next. */
export function Queue() {
  const { books, shelve } = useStore();
  const { setAdding, toast } = useUI();
  const [q, setQ] = useState('');
  const list = useMemo(() => queue(books), [books]);
  const full = useMemo(() => upNext(books).length >= UP_NEXT_MAX, [books]);
  const shown = useMemo(() => {
    const n = searchText(q);
    return n ? list.filter((b) => searchText(`${b.title} ${b.author}`).includes(n)) : list;
  }, [list, q]);

  const promote = (id: string, title: string) => {
    const bumped = shelve(id, 'next');
    toast(bumped ? `${title} is up next. ${bumped.title} went back to the queue.` : `${title} is up next`);
  };

  return (
    <main className="screen">
      <header className="masthead">
        <h1 className="wordmark">Queue</h1>
        <button className="btn link" onClick={() => setAdding('queue')}>Add</button>
      </header>
      {list.length > 6 && <input type="search" className="search" placeholder="Search the queue" value={q} onChange={(e) => setQ(e.target.value)} />}
      {list.length ? (
        <section>
          {full && <p className="muted small queue-note">Up Next is full. Moving a book up sends the last one back to the top of the queue.</p>}
          {/* Reordering a filtered list is ambiguous, so handles hide while searching. */}
          <ShelfList books={shown} sortable={!q.trim()} action={(b) => <button className="btn small" onClick={() => promote(b.id, b.title)}>Up Next</button>} />
          {q && !shown.length && <p className="muted small pad">Nothing matches “{q}”.</p>}
        </section>
      ) : (
        <section className="empty">
          <p>The queue is empty.</p>
          <p className="muted">Everything you might want to read someday goes here. Move a few up to Up Next when you're ready.</p>
          <button className="btn primary" onClick={() => setAdding('queue')}>Add a book</button>
        </section>
      )}
    </main>
  );
}
