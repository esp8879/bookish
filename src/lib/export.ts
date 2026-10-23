import type { Book } from '../types';
import { history, normalizeBook, queue, readingNow, UP_NEXT } from './books';
import { fmtRange, yearOf } from './dates';

export const EXPORT_FORMAT = 'books-export';

export function toJSON(books: Book[]): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, exported_at: new Date().toISOString(), books }, null, 2);
}

/** Books from one of our JSON exports, or null if the file isn't one. */
export function fromJSON(raw: string): Book[] | null {
  try {
    const data = JSON.parse(raw);
    if (data?.format !== EXPORT_FORMAT || !Array.isArray(data.books)) return null;
    return (data.books as Book[]).filter((b) => b && typeof b.id === 'string' && typeof b.title === 'string' && Array.isArray(b.reads))
      .map(normalizeBook);
  } catch { return null; }
}

const csvCell = (v: string | number | null | undefined) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per read, plus one row per queued book (the first five marked up next). Opens in any spreadsheet. */
export function toCSV(books: Book[]): string {
  const rows: (string | number | null)[][] = [['title', 'author', 'status', 'started', 'ended', 'note', 'highlights']];
  const live = books.filter((b) => !b.deleted_at);
  for (const b of live) for (const r of b.reads) {
    rows.push([b.title, b.author, r.status, r.started, r.ended, r.note, b.highlights.length || '']);
  }
  queue(live).forEach((b, i) => rows.push([b.title, b.author, i < UP_NEXT ? 'up next' : 'queue', null, null, '', b.highlights.length || '']));
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

/** A readable archive: Reading, Up Next, Queue, then every year newest first, with notes and highlights. */
export function toMarkdown(books: Book[]): string {
  const live = books.filter((b) => !b.deleted_at);
  const out: string[] = ['# book·ish', ''];
  const reading = readingNow(live);
  if (reading.length) {
    out.push('## Reading', '');
    for (const { book, read } of reading) out.push(`- **${book.title}** — ${book.author} (${fmtRange(read.started, null)})`);
    out.push('');
  }
  const q = queue(live);
  for (const [name, list] of [['Up Next', q.slice(0, UP_NEXT)], ['Queue', q.slice(UP_NEXT)]] as const) {
    if (!list.length) continue;
    out.push(`## ${name}`, '');
    for (const b of list) out.push(`- **${b.title}** — ${b.author}`);
    out.push('');
  }
  const items = history(live);
  // Highlights go under each book's most recent finished or abandoned read.
  const lastOf = new Map<string, string>();
  for (const { book, read } of items) if (!lastOf.has(book.id)) lastOf.set(book.id, read.id);
  let year: number | null = null;
  for (const { book, read } of items) {
    const y = yearOf(read.ended);
    if (y !== year) { year = y; out.push(`## ${y ?? 'Undated'}`, ''); }
    out.push(`### ${book.title}`, '', `${book.author}${book.author ? ' · ' : ''}${fmtRange(read.started, read.ended)}${read.status === 'dnf' ? ' · Did not finish' : ''}`, '');
    if (read.note) out.push(read.note, '');
    if (lastOf.get(book.id) === read.id) for (const h of book.highlights) out.push(`> ${h.text.replace(/\n/g, '\n> ')}`, '');
  }
  return out.join('\n');
}
