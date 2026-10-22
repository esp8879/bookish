import type { PartialDate } from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Calendar dates are plain strings in the reader's local day; there is no timezone logic anywhere. */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDay(new Date());

export const isFullDate = (d: PartialDate | null | undefined): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
export const yearOf = (d: PartialDate | null | undefined) => (d ? Number(d.slice(0, 4)) : null);

/** A year-only date counts as the last day of that year (for "how long ago"). */
export const asFullDate = (d: PartialDate) => (d.length === 10 ? d : `${d.slice(0, 4)}-12-31`);

const toUTC = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const daysBetween = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86_400_000);

export function addDays(d: string, n: number): string {
  const t = new Date(toUTC(d) + n * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** "Oct 22" this year, "Oct 22, 2025" otherwise, "2025" for year-only. */
export function fmtDate(d: PartialDate | null | undefined, now = today()): string {
  if (!d) return '';
  if (d.length !== 10) return d.slice(0, 4);
  const s = `${MONTHS[+d.slice(5, 7) - 1]} ${+d.slice(8, 10)}`;
  return d.slice(0, 4) === now.slice(0, 4) ? s : `${s}, ${d.slice(0, 4)}`;
}

export function fmtRange(started: PartialDate | null, ended: PartialDate | null, now = today()): string {
  if (started && ended && isFullDate(started) && isFullDate(ended)) {
    if (started === ended) return fmtDate(ended, now);
    const sameYear = started.slice(0, 4) === ended.slice(0, 4);
    return `${sameYear ? fmtDate(started, ended) : fmtDate(started, now)} – ${fmtDate(ended, now)}`;
  }
  if (ended) return fmtDate(ended, now);
  if (started) return `since ${fmtDate(started, now)}`;
  return '';
}

export const MONTH_NAMES = MONTHS;
