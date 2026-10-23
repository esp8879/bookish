import type { Book } from '../types';
import { eachDay, isFullDate, today, weekday } from './dates';

export interface ActivityDay { day: string; reading: string[]; finished: string[] }

/**
 * What each day of the year so far looked like: the books in progress, and the ones finished.
 * A read counts from its start to its end (or today); DNF days count as reading, not as finishing.
 */
export function yearActivity(books: Book[], year: number, now = today()): Map<string, ActivityDay> {
  const first = `${year}-01-01`;
  const last = now.slice(0, 4) === String(year) ? now : `${year}-12-31`;
  const days = new Map<string, ActivityDay>(eachDay(first, last).map((day) => [day, { day, reading: [], finished: [] }]));
  for (const b of books) for (const r of b.reads) {
    const end = isFullDate(r.ended) ? r.ended : r.status === 'reading' ? last : null;
    if (isFullDate(r.started) && end) {
      const a = r.started < first ? first : r.started;
      const z = end > last ? last : end;
      if (a <= z) for (const d of eachDay(a, z)) days.get(d)?.reading.push(b.title);
    }
    if (r.status === 'finished' && isFullDate(r.ended)) days.get(r.ended)?.finished.push(b.title);
  }
  return days;
}

/** Weeks as columns (Sunday on top), GitHub style. Days outside the range are null. */
export function weekColumns(days: Map<string, ActivityDay>): (ActivityDay | null)[][] {
  const list = [...days.values()];
  if (!list.length) return [];
  const cols: (ActivityDay | null)[][] = [];
  let col: (ActivityDay | null)[] = Array(weekday(list[0].day)).fill(null);
  for (const d of list) {
    col.push(d);
    if (col.length === 7) { cols.push(col); col = []; }
  }
  if (col.length) cols.push([...col, ...Array(7 - col.length).fill(null)]);
  return cols;
}
