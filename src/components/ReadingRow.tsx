import { useRef, useState, type PointerEvent } from 'react';
import type { Book, Read } from '../types';
import { daysIn } from '../lib/books';
import { useUI } from '../ui';

const ACTIONS_W = 246;

/**
 * A book in progress. Swipe left for Finished, Didn't finish and Edit; tap to open the book.
 * `open` is lifted so only one row is swiped open at a time.
 */
export function ReadingRow({ book, read, open, setOpen }: { book: Book; read: Read; open: boolean; setOpen: (v: boolean) => void }) {
  const { openBook, setFinishing } = useUI();
  const [dx, setDx] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; base: number; axis: 'h' | 'v' | null } | null>(null);
  const moved = useRef(false);
  const d = daysIn(read);
  const x = dx ?? (open ? -ACTIONS_W : 0);

  const down = (e: PointerEvent) => { start.current = { x: e.clientX, y: e.clientY, base: open ? -ACTIONS_W : 0, axis: null }; moved.current = false; };
  const move = (e: PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x, my = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my)) { s.axis = 'h'; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
      else if (Math.abs(my) > 8) s.axis = 'v';
    }
    if (s.axis === 'h') { moved.current = true; setDx(Math.max(-ACTIONS_W - 24, Math.min(0, s.base + mx))); }
  };
  const up = () => {
    if (start.current?.axis === 'h' && dx != null) setOpen(dx < -ACTIONS_W / 3);
    start.current = null;
    setDx(null);
  };
  const act = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <li className="reading-row swipe">
      {/* Only rendered while revealed, so nothing peeks out around the row at rest. */}
      {x < 0 && <div className="swipe-actions">
        <button className="sw-finish" onClick={() => act(() => setFinishing({ bookId: book.id, readId: read.id, status: 'finished' }))}>Finished</button>
        <button className="sw-dnf" onClick={() => act(() => setFinishing({ bookId: book.id, readId: read.id, status: 'dnf' }))}>Didn't finish</button>
        <button className="sw-edit" onClick={() => act(() => openBook(book.id, { edit: true }))}>Edit</button>
      </div>}
      <button className={`row-main swipe-front${dx != null ? ' dragging' : ''}`} style={{ transform: `translateX(${x}px)` }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClick={() => { if (moved.current) return; if (open) setOpen(false); else openBook(book.id); }}>
        <span className="title big">{book.title}</span>
        <span className="author">{book.author}{d != null && <span className="meta"> · {d === 0 ? 'started today' : `day ${d + 1}`}</span>}</span>
      </button>
    </li>
  );
}
