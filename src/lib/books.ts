import type { Book, Read, Shelf } from '../types';
import { daysBetween, isFullDate, today, yearOf } from './dates';

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

/** Fill defaults for documents written by older builds (Up Next used to be `pile_rank`). */
export function normalizeBook(raw: Partial<Book> & { id: string; pile_rank?: number | null }): Book {
  const { pile_rank, ...b } = raw;
  return {
    title: '', author: '', created_at: 0, updated_at: 0, deleted_at: null, ...b,
    reads: b.reads ?? [], highlights: b.highlights ?? [],
    shelf: b.shelf ?? (pile_rank != null ? 'next' : null), rank: b.rank ?? pile_rank ?? null,
  };
}

export const currentRead = (b: Book): Read | undefined => b.reads.find((r) => r.status === 'reading');
export const lastRead = (b: Book): Read | undefined => b.reads[b.reads.length - 1];

export interface ReadingItem { book: Book; read: Read }
export interface HistoryItem { book: Book; read: Read }

/** Books in progress, the one started most recently first. */
export function readingNow(books: Book[]): ReadingItem[] {
  const out: ReadingItem[] = [];
  for (const book of books) for (const read of book.reads) if (read.status === 'reading') out.push({ book, read });
  return out.sort((a, b) => (b.read.started ?? '').localeCompare(a.read.started ?? '') || b.book.created_at - a.book.created_at);
}

export const UP_NEXT_MAX = 5;

/** A shelf in rank order. A book being read is never on a shelf. */
export function onShelf(books: Book[], shelf: Shelf): Book[] {
  return books.filter((b) => b.shelf === shelf && !currentRead(b)).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}
export const upNext = (books: Book[]) => onShelf(books, 'next');
export const queue = (books: Book[]) => onShelf(books, 'queue');

/** Every finished or abandoned read, newest first. Year-only dates sort after dated reads of the same year. */
export function history(books: Book[]): HistoryItem[] {
  const out: HistoryItem[] = [];
  for (const book of books) for (const read of book.reads) if (read.status !== 'reading') out.push({ book, read });
  return out.sort((a, b) => (b.read.ended ?? '').localeCompare(a.read.ended ?? '') || b.book.created_at - a.book.created_at);
}

/** Rank that puts an item at `index` of `list` (which excludes the moving item). */
export function rankAt(list: Book[], index: number): number {
  const before = list[index - 1]?.rank;
  const after = list[index]?.rank;
  if (before == null && after == null) return 1;
  if (before == null) return after! - 1;
  if (after == null) return before + 1;
  return (before + after) / 2;
}

export const bottomRank = (list: Book[]) => (list.length ? Math.max(...list.map((b) => b.rank ?? 0)) + 1 : 1);
export const topRank = (list: Book[]) => (list.length ? Math.min(...list.map((b) => b.rank ?? 0)) - 1 : 1);

export interface ShelfMove { id: string; shelf: Shelf | null; rank: number | null }

/**
 * Put a book on a shelf, at its top or bottom. Up Next holds UP_NEXT_MAX books: when it's full,
 * its last book goes back to the top of the queue to make room.
 */
export function planShelve(books: Book[], id: string, shelf: Shelf, at: 'top' | 'bottom'): ShelfMove[] {
  const list = onShelf(books, shelf).filter((b) => b.id !== id);
  const moves: ShelfMove[] = [{ id, shelf, rank: at === 'top' ? topRank(list) : bottomRank(list) }];
  if (shelf === 'next' && list.length >= UP_NEXT_MAX) {
    const bumped = list[list.length - 1];
    moves.push({ id: bumped.id, shelf: 'queue', rank: topRank(queue(books).filter((b) => b.id !== id)) });
  }
  return moves;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const bookKey = (title: string, author: string) => `${norm(title)}|${norm(author)}`;
export const searchText = (s: string) => norm(s);

export function matchesSearch(item: HistoryItem, q: string): boolean {
  const n = norm(q);
  if (!n) return true;
  return norm(`${item.book.title} ${item.book.author} ${item.read.note}`).includes(n);
}

export const daysIn = (read: Read, now = today()) => (isFullDate(read.started) ? daysBetween(read.started, now) : null);

// --- Year stats ------------------------------------------------------------

export interface YearStats {
  year: number;
  finished: HistoryItem[];
  dnf: HistoryItem[];
  /** Finished reads per month (dated only), Jan..Dec. */
  perMonth: number[];
  undatedFinished: number;
  medianDays: number | null;
  quickest: { item: HistoryItem; days: number } | null;
  longest: { item: HistoryItem; days: number } | null;
}

export function years(books: Book[]): number[] {
  const ys = new Set<number>();
  for (const b of books) for (const r of b.reads) { const y = yearOf(r.ended ?? r.started); if (y) ys.add(y); }
  ys.add(yearOf(today())!);
  return [...ys].sort((a, b) => b - a);
}

export function yearStats(books: Book[], year: number): YearStats {
  const all = history(books).filter((i) => yearOf(i.read.ended) === year);
  const finished = all.filter((i) => i.read.status === 'finished');
  const dnf = all.filter((i) => i.read.status === 'dnf');
  const perMonth = Array<number>(12).fill(0);
  let undatedFinished = 0;
  const spans: { item: HistoryItem; days: number }[] = [];
  for (const i of finished) {
    if (isFullDate(i.read.ended)) perMonth[+i.read.ended.slice(5, 7) - 1]++;
    else undatedFinished++;
    if (isFullDate(i.read.started) && isFullDate(i.read.ended)) spans.push({ item: i, days: Math.max(1, daysBetween(i.read.started, i.read.ended)) });
  }
  spans.sort((a, b) => a.days - b.days);
  const medianDays = spans.length ? spans[Math.floor((spans.length - 1) / 2)].days : null;
  return {
    year, finished, dnf, perMonth, undatedFinished, medianDays,
    quickest: spans[0] ?? null, longest: spans.length > 1 ? spans[spans.length - 1] : null,
  };
}
