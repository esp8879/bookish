import type { PartialDate } from '../types';
import type { Incoming } from './importer';
import { titleCase, nameCase } from './titlecase';

export interface Sheet { name: string; rows: unknown[][] }

const pad = (n: number) => String(n).padStart(2, '0');

/** Spreadsheet cell → 'YYYY-MM-DD'. Excel dates arrive as Date (midnight UTC), serial numbers, or text. */
export function cellDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(+v)) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  if (typeof v === 'number' && v > 20000 && v < 80000) return cellDate(new Date(Date.UTC(1899, 11, 30) + v * 86_400_000));
  if (typeof v === 'string') {
    const s = v.trim();
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
    if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(+m[1])}-${pad(+m[2])}`;
  }
  return null;
}

const text = (v: unknown) => (v == null ? '' : String(v).trim());

/**
 * One sheet per year, header row first. Columns are found by name (title, author, start, end, notes).
 * - start + end: finished
 * - start only: reading, or DNF when the note says so (the give-up day is unknown, so it uses the start)
 * - end only: finished
 * - no dates on a sheet that has date columns: the queue, in row order
 * - a sheet with no date columns (2025): finished, dated by the sheet's year
 * Duplicate rows (same book, same dates) collapse.
 */
export function sheetsToIncoming(sheets: Sheet[]): Incoming[] {
  const out: Incoming[] = [];
  const seen = new Set<string>();
  // Oldest year first so books and the queue keep their spreadsheet order.
  const ordered = [...sheets].sort((a, b) => a.name.localeCompare(b.name));
  for (const sheet of ordered) {
    const [header, ...rows] = sheet.rows;
    if (!header) continue;
    const h = header.map((c) => text(c).toLowerCase());
    const col = (...names: string[]) => h.findIndex((c) => names.includes(c));
    const iTitle = col('title', 'book'), iAuthor = col('author'), iStart = col('start', 'started'), iEnd = col('end', 'ended', 'finished'), iNotes = col('notes', 'note');
    if (iTitle < 0) continue;
    const hasDates = iStart >= 0 || iEnd >= 0;
    const year = /^\d{4}$/.test(sheet.name.trim()) ? sheet.name.trim() : null;
    for (const row of rows) {
      const rawTitle = text(row[iTitle]);
      if (!rawTitle) continue;
      const title = titleCase(rawTitle);
      const author = iAuthor >= 0 ? nameCase(text(row[iAuthor])) : '';
      const started = iStart >= 0 ? cellDate(row[iStart]) : null;
      const ended = iEnd >= 0 ? cellDate(row[iEnd]) : null;
      const note = iNotes >= 0 ? text(row[iNotes]) : '';
      let inc: Incoming;
      if (started && ended) inc = { title, author, reads: [{ status: 'finished', started, ended, note }] };
      else if (started) inc = /\bdnf\b|did ?n.?t finish/i.test(note)
        ? { title, author, reads: [{ status: 'dnf', started, ended: started, note }] }
        : { title, author, reads: [{ status: 'reading', started, ended: null, note }] };
      else if (ended) inc = { title, author, reads: [{ status: 'finished', started: null, ended, note }] };
      else if (hasDates) inc = { title, author, reads: [], queue: true };
      else if (year) inc = { title, author, reads: [{ status: 'finished', started: null, ended: year as PartialDate, note }] };
      else continue;
      const r = inc.reads[0];
      const dedupe = `${title.toLowerCase()}|${author.toLowerCase()}|${r?.status ?? 'queue'}|${r?.started ?? ''}|${r?.ended ?? ''}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      out.push(inc);
    }
  }
  return out;
}
