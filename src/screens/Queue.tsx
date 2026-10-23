import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { currentRead, lastRead, queue, searchText, UP_NEXT } from '../lib/books';
import { QueueList, SetAside } from '../components/QueueList';
import { ScreenHeader } from '../components/common';

/** Every book you want to read, in order. The top five are Up Next on the main screen. */
export function Queue() {
  const { books, enqueue, dequeue } = useStore();
  const { setAdding, setTab, openBook, toast } = useUI();
  const [showDnf, setShowDnf] = useState(false);
  // Set-aside books that aren't queued: candidates to try again.
  const dnf = useMemo(() => books.filter((b) => b.rank == null && !currentRead(b) && lastRead(b)?.status === 'dnf')
    .sort((a, b) => (lastRead(b)!.ended ?? '').localeCompare(lastRead(a)!.ended ?? '')), [books]);
  const [q, setQ] = useState('');
  const list = useMemo(() => queue(books), [books]);
  const shown = useMemo(() => {
    const n = searchText(q);
    return n ? list.filter((b) => searchText(`${b.title} ${b.author}`).includes(n)) : list;
  }, [list, q]);
  const searching = !!q.trim();

  return (
    <main className="screen drawer">
      <ScreenHeader back={{ label: 'Now', onClick: () => setTab('now') }} action={<button className="btn link" onClick={() => setAdding(true)}>Add book</button>}>
        <h1 className="wordmark">Queue</h1>
        {list.length > 0 && <span className="screen-sub">{list.length} {list.length === 1 ? 'book' : 'books'}</span>}
      </ScreenHeader>
      {list.length > 8 && <input type="search" className="search" placeholder="Search the queue" value={q} onChange={(e) => setQ(e.target.value)} />}
      {list.length ? (
        <section>
          {/* Reordering or numbering a filtered list would mislead, so both are off while searching. */}
          <QueueList books={shown} queue={list} sortable={!searching} numbered={!searching} />
          {searching && !shown.length && <p className="muted small pad">Nothing matches “{q}”.</p>}
        </section>
      ) : (
        <section className="empty">
          <p>The queue is empty.</p>
          <p className="muted">Everything you want to read goes here. The top {UP_NEXT} show up on the main screen as Up Next.</p>
          <button className="btn primary" onClick={() => setAdding(true)}>Add a book</button>
        </section>
      )}

      {dnf.length > 0 && !searching && (
        <section>
          <button className={`dnf-toggle${showDnf ? ' open' : ''}`} aria-expanded={showDnf} onClick={() => setShowDnf(!showDnf)}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M4 2.5L7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>Didn't finish · {dnf.length}</span><i />
          </button>
          {showDnf && (
            <ul className="list dnf-list">
              {dnf.map((b) => (
                <li key={b.id}>
                  <button className="row-main" onClick={() => openBook(b.id)}>
                    <span className="title">{b.title}</span>
                    {b.author && <span className="author">{b.author}</span>}
                    <SetAside book={b} />
                  </button>
                  <button className="btn small" onClick={() => { enqueue(b.id); toast(`${b.title} is back in the queue, at the bottom`, () => dequeue(b.id)); }}>Queue</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
