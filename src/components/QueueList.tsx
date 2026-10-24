import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Book } from '../types';
import { lastRead, rankAt, UP_NEXT } from '../lib/books';
import { daysBetween, fmtDate, isFullDate } from '../lib/dates';
import { useStore } from '../data/store';
import { useUI } from '../ui';

/** How far the list's scroll container has scrolled: the main screen scrolls itself (if it ever overflows), other screens scroll the page. */
const scrollTop = (el: HTMLElement) => (el.closest('.screen.home') as HTMLElement | null)?.scrollTop ?? window.scrollY;

interface Drag { id: string; from: number; to: number; startY: number; scrollY: number; dy: number; tops: number[]; heights: number[] }

/** "Didn't finish · Aug 20 · 3 days in" for a queued book that was set aside before. */
export function SetAside({ book }: { book: Book }) {
  const r = lastRead(book);
  if (r?.status !== 'dnf') return null;
  const days = isFullDate(r.started) && isFullDate(r.ended) ? daysBetween(r.started, r.ended) : null;
  return (
    <>
      <span className="set-aside">Didn't finish{r.ended && ` · ${fmtDate(r.ended)}`}{days != null && days > 0 && ` · ${days} ${days === 1 ? 'day' : 'days'} in`}</span>
      {r.note && <span className="note clamp one">{r.note}</span>}
    </>
  );
}

/**
 * The queue, or its first rows (Up Next on Home), reordered by dragging the handle.
 * `queue` is the whole queue in order, so a move on Home lands in the right place in the full list.
 * `numbered` marks the Up Next rows with a small numeral.
 */
export function QueueList({ books, queue, sortable = true, numbered = false }: { books: Book[]; queue: Book[]; sortable?: boolean; numbered?: boolean }) {
  const { update } = useStore();
  const { openBook } = useUI();
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);

  const down = (e: PointerEvent, i: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rects = rows.current.slice(0, books.length).map((r) => r!.getBoundingClientRect());
    setDrag({ id: books[i].id, from: i, to: i, startY: e.clientY, scrollY: scrollTop(e.currentTarget as HTMLElement), dy: 0, tops: rects.map((r) => r.top), heights: rects.map((r) => r.height) });
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    // Row positions were measured in page terms at the start; if the page scrolls mid-drag, follow it.
    const dy = e.clientY - drag.startY + (scrollTop(e.currentTarget as HTMLElement) - drag.scrollY);
    const center = drag.tops[drag.from] + dy + drag.heights[drag.from] / 2;
    let to = 0;
    for (let i = 0; i < drag.tops.length; i++) if (center > drag.tops[i] + drag.heights[i] / 2) to = i;
    if (center < drag.tops[0] + drag.heights[0] / 2) to = 0;
    setDrag({ ...drag, dy, to });
  };
  const up = () => {
    if (!drag) return;
    if (drag.to !== drag.from) update(drag.id, { rank: rankAt(queue.filter((b) => b.id !== drag.id), drag.to) });
    setDrag(null);
  };

  /** Keyboard reordering: arrow keys on a focused handle move the book one place in the whole queue. */
  const key = (e: KeyboardEvent, b: Book) => {
    const step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    const from = queue.findIndex((x) => x.id === b.id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= queue.length) return;
    update(b.id, { rank: rankAt(queue.filter((x) => x.id !== b.id), to) });
  };

  const shift = (i: number) => {
    if (!drag || i === drag.from) return 0;
    const h = drag.heights[drag.from];
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -h;
    if (drag.from > drag.to && i < drag.from && i >= drag.to) return h;
    return 0;
  };
  /** Where a row will sit once the drag drops, so the Up Next numerals follow along. */
  const position = (i: number) => {
    if (!drag) return i;
    if (i === drag.from) return drag.to;
    const s = shift(i);
    return s < 0 ? i - 1 : s > 0 ? i + 1 : i;
  };

  return (
    <ol className={`list shelf${drag ? ' dragging' : ''}${numbered ? ' numbered' : ''}`}>
      {books.map((b, i) => {
        const pos = position(i);
        return (
          <li key={b.id} ref={(el) => { rows.current[i] = el; }}
            className={drag?.id === b.id ? 'lifted' : ''}
            style={{ transform: `translateY(${drag?.id === b.id ? drag.dy : shift(i)}px)` }}>
            {numbered && <span className={`pos${pos < UP_NEXT ? ' on' : ''}`} aria-hidden>{pos < UP_NEXT ? pos + 1 : ''}</span>}
            <button className="row-main" onClick={() => openBook(b.id)}>
              <span className="title">{b.title}</span>
              {b.author && <span className="author">{b.author}</span>}
              <SetAside book={b} />
            </button>
            {sortable && <button type="button" className="handle" aria-label={`Reorder ${b.title}`} title="Drag, or use the arrow keys, to reorder"
              onPointerDown={(e) => down(e, i)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={(e) => key(e, b)}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden><path d="M3 6h12M3 9h12M3 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>}
          </li>
        );
      })}
    </ol>
  );
}
