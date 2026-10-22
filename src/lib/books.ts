import type { Book, Checkpoint, Read } from '../types';
import { addDays, asFullDate, daysBetween, isFullDate, today, yearOf } from './dates';

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

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

/** Up Next, in rank order. A book being read is never in the pile. */
export function pile(books: Book[]): Book[] {
  return books.filter((b) => b.pile_rank != null && !currentRead(b)).sort((a, b) => a.pile_rank! - b.pile_rank!);
}

/** Every finished or abandoned read, newest first. Year-only dates sort after dated reads of the same year. */
export function history(books: Book[]): HistoryItem[] {
  const out: HistoryItem[] = [];
  for (const book of books) for (const read of book.reads) if (read.status !== 'reading') out.push({ book, read });
  return out.sort((a, b) => (b.read.ended ?? '').localeCompare(a.read.ended ?? '') || b.book.created_at - a.book.created_at);
}

/** Rank that puts an item at `index` of `list` (which excludes the moving item). */
export function rankAt(list: Book[], index: number): number {
  const before = list[index - 1]?.pile_rank;
  const after = list[index]?.pile_rank;
  if (before == null && after == null) return 1;
  if (before == null) return after! - 1;
  if (after == null) return before + 1;
  return (before + after) / 2;
}

export const bottomRank = (books: Book[]) => Math.max(0, ...books.map((b) => b.pile_rank ?? 0)) + 1;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const bookKey = (title: string, author: string) => `${norm(title)}|${norm(author)}`;
export const searchText = (s: string) => norm(s);

export function matchesSearch(item: HistoryItem, q: string): boolean {
  const n = norm(q);
  if (!n) return true;
  return norm(`${item.book.title} ${item.book.author} ${item.read.note}`).includes(n);
}

export const daysIn = (read: Read, now = today()) => (isFullDate(read.started) ? daysBetween(read.started, now) : null);

// --- Afterglow -------------------------------------------------------------

const CHECKPOINT_DAYS: Record<Checkpoint, number> = { '3m': 90, '12m': 365 };

export interface AfterglowDue { book: Book; read: Read; checkpoint: Checkpoint }

/** The latest checkpoint that has passed for a finished read and hasn't been answered yet. */
export function dueCheckpoint(read: Read, now = today()): Checkpoint | null {
  if (read.status !== 'finished' || !read.ended) return null;
  const ended = asFullDate(read.ended);
  const passed = (['12m', '3m'] as Checkpoint[]).find((c) => addDays(ended, CHECKPOINT_DAYS[c]) <= now);
  if (!passed) return null;
  if (read.afterglow.some((a) => a.checkpoint === passed)) return null;
  // A 12-month answer supersedes the 3-month question.
  if (passed === '3m' && read.afterglow.some((a) => a.checkpoint === '12m')) return null;
  return passed;
}

/** One question at a time: the read finished longest ago goes first. */
export function nextAfterglow(books: Book[], now = today(), skip: Set<string> = new Set()): AfterglowDue | null {
  let best: AfterglowDue | null = null;
  for (const book of books) for (const read of book.reads) {
    if (skip.has(read.id)) continue;
    const checkpoint = dueCheckpoint(read, now);
    if (!checkpoint) continue;
    if (!best || asFullDate(read.ended!) < asFullDate(best.read.ended!)) best = { book, read, checkpoint };
  }
  return best;
}

export const latestAfterglow = (read: Read) => [...read.afterglow].sort((a, b) => a.at.localeCompare(b.at)).pop();

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
  topAuthors: { author: string; count: number }[];
  lasted: HistoryItem[];
  lingered: HistoryItem[];
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
  const counts = new Map<string, number>();
  for (const i of finished) counts.set(i.book.author, (counts.get(i.book.author) ?? 0) + 1);
  const topAuthors = [...counts].filter(([a, c]) => a && c > 1).map(([author, count]) => ({ author, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  const lasted = finished.filter((i) => latestAfterglow(i.read)?.answer === 'yes');
  const lingered = finished.filter((i) => latestAfterglow(i.read)?.answer === 'a_little');
  return {
    year, finished, dnf, perMonth, undatedFinished, medianDays,
    quickest: spans[0] ?? null, longest: spans.length > 1 ? spans[spans.length - 1] : null,
    topAuthors, lasted, lingered,
  };
}
