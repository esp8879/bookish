import type { Book, Read, Shelf } from '../types';
import { bookKey, newId, onShelf, UP_NEXT_MAX } from './books';

/** A book as described by an import source, before it is merged into the library. */
export interface Incoming {
  title: string;
  author: string;
  reads: Omit<Read, 'id'>[];
  /** Goes to the bottom of that shelf, in the order given. Up Next overflows into the queue. */
  shelf?: Shelf;
}

export interface MergePlan {
  creates: Book[];
  updates: { id: string; reads: Read[]; shelf: Shelf | null; rank: number | null }[];
  skipped: number;
}

const sameRead = (a: Omit<Read, 'id'>, b: Omit<Read, 'id'>) => a.status === b.status && a.started === b.started && a.ended === b.ended;

/**
 * Merge incoming books into the library by title + author. Reads already present (same status and dates)
 * are skipped, so importing the same file twice changes nothing.
 */
export function planMerge(existing: Book[], incoming: Incoming[], now = Date.now()): MergePlan {
  const byKey = new Map<string, Book>();
  for (const b of existing) byKey.set(bookKey(b.title, b.author), b);
  const working = new Map<string, Book>();
  const touched = new Set<string>();
  const created = new Set<string>();
  const next = onShelf(existing, 'next'), queued = onShelf(existing, 'queue');
  let nextCount = next.length;
  const rank = { next: Math.max(0, ...next.map((b) => b.rank ?? 0)) + 1, queue: Math.max(0, ...queued.map((b) => b.rank ?? 0)) + 1 };
  let skipped = 0;
  incoming.forEach((inc, i) => {
    const key = bookKey(inc.title, inc.author);
    let book = working.get(key) ?? (byKey.has(key) ? structuredClone(byKey.get(key)!) : undefined);
    if (!book) {
      book = { id: newId(), title: inc.title, author: inc.author, reads: [], shelf: null, rank: null, highlights: [], created_at: now + i, updated_at: now, deleted_at: null };
      created.add(key);
    }
    working.set(key, book);
    let changed = false;
    for (const r of inc.reads) {
      if (book.reads.some((x) => sameRead(x, r))) { skipped++; continue; }
      book.reads.push({ ...r, id: newId() });
      changed = true;
    }
    if (inc.shelf && book.shelf == null && !book.reads.some((r) => r.status === 'reading')) {
      const s: Shelf = inc.shelf === 'next' && nextCount < UP_NEXT_MAX ? 'next' : 'queue';
      if (s === 'next') nextCount++;
      book.shelf = s;
      book.rank = rank[s]++;
      changed = true;
    } else if (inc.shelf) skipped++;
    if (changed) touched.add(key);
  });
  const plan: MergePlan = { creates: [], updates: [], skipped };
  for (const key of touched) {
    const b = working.get(key)!;
    // Keep reads in chronological order so the book page reads top to bottom.
    b.reads.sort((x, y) => (x.started ?? x.ended ?? '').localeCompare(y.started ?? y.ended ?? ''));
    if (created.has(key)) plan.creates.push(b);
    else plan.updates.push({ id: b.id, reads: b.reads, shelf: b.shelf, rank: b.rank });
  }
  return plan;
}
