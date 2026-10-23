import type { PartialDate } from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Calendar dates are plain strings in the reader's local day; there is no timezone logic anywhere. */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => isoDay(new Date());

export const isFullDate = (d: PartialDate | null | undefined): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
export const yearOf = (d: PartialDate | null | undefined) => (d ? Number(d.slice(0, 4)) : null);

const toUTC = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const daysBetween = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86_400_000);

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

const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Day of week, 0 = Sunday, for a 'YYYY-MM-DD'. */
export const weekday = (d: string) => new Date(toUTC(d)).getUTCDay();

/** "Thursday, October 22" */
export const fmtLongDay = (d: string) => `${WEEKDAYS[weekday(d)]}, ${LONG_MONTHS[+d.slice(5, 7) - 1]} ${+d.slice(8, 10)}`;
/** "Thu, Oct 22" */
export const fmtShortDay = (d: string) => `${WEEKDAYS[weekday(d)].slice(0, 3)}, ${MONTHS[+d.slice(5, 7) - 1]} ${+d.slice(8, 10)}`;

/** Every day from a to b inclusive. */
export function eachDay(a: string, b: string): string[] {
  const out: string[] = [];
  for (let t = toUTC(a), end = toUTC(b); t <= end; t += 86_400_000) {
    const x = new Date(t);
    out.push(`${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`);
  }
  return out;
}
