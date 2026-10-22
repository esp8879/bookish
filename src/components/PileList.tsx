import { useRef, useState, type PointerEvent } from 'react';
import type { Book } from '../types';
import { rankAt } from '../lib/books';
import { useStore } from '../data/store';
import { useUI } from '../ui';

interface Drag { id: string; from: number; to: number; startY: number; dy: number; tops: number[]; heights: number[] }

/** Up Next, reordered by dragging the handle. Tapping a row opens the book. */
export function PileList({ books }: { books: Book[] }) {
  const { update } = useStore();
  const { openBook } = useUI();
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);

  const down = (e: PointerEvent, i: number) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rects = rows.current.slice(0, books.length).map((r) => r!.getBoundingClientRect());
    setDrag({ id: books[i].id, from: i, to: i, startY: e.clientY, dy: 0, tops: rects.map((r) => r.top), heights: rects.map((r) => r.height) });
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    const center = drag.tops[drag.from] + dy + drag.heights[drag.from] / 2;
    let to = 0;
    for (let i = 0; i < drag.tops.length; i++) if (center > drag.tops[i] + drag.heights[i] / 2) to = i;
    if (center < drag.tops[0] + drag.heights[0] / 2) to = 0;
    setDrag({ ...drag, dy, to });
  };
  const up = () => {
    if (!drag) return;
    if (drag.to !== drag.from) {
      const rest = books.filter((b) => b.id !== drag.id);
      update(drag.id, { pile_rank: rankAt(rest, drag.to) });
    }
    setDrag(null);
  };

  const shift = (i: number) => {
    if (!drag || i === drag.from) return 0;
    const h = drag.heights[drag.from];
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return -h;
    if (drag.from > drag.to && i < drag.from && i >= drag.to) return h;
    return 0;
  };

  return (
    <ol className={`list pile${drag ? ' dragging' : ''}`}>
      {books.map((b, i) => (
        <li key={b.id} ref={(el) => { rows.current[i] = el; }}
          className={drag?.id === b.id ? 'lifted' : ''}
          style={{ transform: `translateY(${drag?.id === b.id ? drag.dy : shift(i)}px)` }}>
          <button className="row-main" onClick={() => openBook(b.id)}>
            <span className="title">{b.title}</span>
            {b.author && <span className="author">{b.author}</span>}
          </button>
          <span className="handle" aria-label={`Reorder ${b.title}`} onPointerDown={(e) => down(e, i)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden><path d="M3 6h12M3 9h12M3 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </span>
        </li>
      ))}
    </ol>
  );
}
