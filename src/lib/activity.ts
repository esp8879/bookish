import type { Book } from '../types';
import { eachDay, isFullDate, today } from './dates';

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


export interface WeekCell {
  /** First and last day of the bucket, clipped to today for the current week. */
  from: string;
  to: string;
  /** 0 nothing in progress, 1 reading, 2 finished a book. */
  level: 0 | 1 | 2;
  reading: string[];
  finished: string[];
  /** Hasn't started yet. */
  future: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The year at a coarser grain: each month split into week-sized buckets (1–7, 8–14, 15–21, 22–28, 29–end),
 * so twelve short columns of up to five squares.
 */
export function monthWeeks(books: Book[], year: number, now = today()): WeekCell[][] {
  const days = yearActivity(books, year, now);
  return Array.from({ length: 12 }, (_, m) => {
    const last = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    const cells: WeekCell[] = [];
    for (let start = 1; start <= last; start += 7) {
      const from = `${year}-${pad(m + 1)}-${pad(start)}`;
      const to = `${year}-${pad(m + 1)}-${pad(Math.min(start + 6, last))}`;
      const reading = new Set<string>(), finished = new Set<string>();
      let seen = false;
      for (let d = start; d <= Math.min(start + 6, last); d++) {
        const a = days.get(`${year}-${pad(m + 1)}-${pad(d)}`);
        if (!a) continue;
        seen = true;
        a.reading.forEach((t) => reading.add(t));
        a.finished.forEach((t) => finished.add(t));
      }
      cells.push({
        from, to: to > now ? now : to, future: !seen,
        level: finished.size ? 2 : reading.size ? 1 : 0,
        reading: [...reading], finished: [...finished],
      });
    }
    return cells;
  });
}
