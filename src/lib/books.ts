import type { Book, Read } from '../types';
import { daysBetween, isFullDate, today, yearOf } from './dates';

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

/** Fill defaults for documents written by older builds. */
export function normalizeBook(raw: Partial<Book> & { id: string; pile_rank?: number | null; shelf?: string | null }): Book {
  const { pile_rank, shelf, ...b } = raw;
  let rank = b.rank ?? pile_rank ?? null;
  // One build kept Up Next and the queue as separate shelves with overlapping ranks: put the old queue after Up Next.
  if (rank != null && shelf === 'queue') rank += 1000;
  return {
    title: '', author: '', created_at: 0, updated_at: 0, deleted_at: null, ...b,
    reads: b.reads ?? [], highlights: b.highlights ?? [], rank,
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

/** Up Next is simply the top of the queue. */
export const UP_NEXT = 5;

/** The queue in order. A book being read is never queued. */
export function queue(books: Book[]): Book[] {
  return books.filter((b) => b.rank != null && !currentRead(b)).sort((a, b) => a.rank! - b.rank!);
}
export const upNext = (books: Book[]) => queue(books).slice(0, UP_NEXT);

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

// --- Finishing ---------------------------------------------------------------

const ORDINAL_WORDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
/** "third" up to ten, then "11th". */
const ordinalWord = (n: number) => ORDINAL_WORDS[n - 1] ?? ordinal(n);
export const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * The one line under the stamp when a book is finished: the most unusual thing that is true of this finish,
 * from the library alone (no prompts, no judgement). `books` already include the finished read.
 */
export function finishFact(books: Book[], bookId: string, readId: string, now = today()): string {
  const book = books.find((b) => b.id === bookId);
  const i = book?.reads.findIndex((r) => r.id === readId) ?? -1;
  const read = book?.reads[i];
  const year = yearOf(read?.ended);
  if (!book || !read || !year) return '';
  const span = year === yearOf(now) ? 'this year' : `of ${year}`;

  const earlier = book.reads.slice(0, i);
  const finishedBefore = earlier.filter((r) => r.status === 'finished').length;
  if (finishedBefore) return `${cap(ordinalWord(finishedBefore + 1))} time through`;
  const setAside = earlier.filter((r) => r.status === 'dnf').length;
  if (setAside) return `Finished on the ${ordinalWord(setAside + 1)} try`;

  const { finished } = yearStats(books, year);
  const count = finished.length;
  if (count === 1) return `First book of ${year}`;
  if (count % 10 === 0) return `Your ${ordinal(count)} book ${span}`;

  // Quickest or longest, once there are enough dated reads for it to mean something, and only when it's the only one.
  const days = (r: Read) => (isFullDate(r.started) && isFullDate(r.ended) ? Math.max(1, daysBetween(r.started, r.ended)) : null);
  const mine = days(read);
  const others = finished.filter((f) => f.read.id !== readId).map((f) => days(f.read)).filter((d): d is number => d != null);
  if (mine != null && others.length >= 2) {
    const n = `${mine} ${mine === 1 ? 'day' : 'days'}`;
    if (others.every((d) => mine < d)) return `Your quickest read ${span}: ${n}`;
    if (others.every((d) => mine > d)) return `Your longest read ${span}: ${n}`;
  }

  const author = norm(book.author);
  if (author) {
    const byAuthor = books.filter((b) => !b.deleted_at && norm(b.author) === author && b.reads.some((r) => r.status === 'finished')).length;
    if (byAuthor > 1) return `Your ${ordinalWord(byAuthor)} by ${book.author}`;
  }

  return `Your ${ordinal(count)} book ${span}`;
}
