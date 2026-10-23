import { useMemo, useState } from 'react';
import type { Book } from '../types';
import { monthWeeks, type WeekCell } from '../lib/activity';
import { fmtDate, MONTH_NAMES, today } from '../lib/dates';
import { Label } from './common';

function describe(c: WeekCell) {
  if (c.finished.length) return `Finished ${c.finished.join(', ')}`;
  if (c.reading.length) return `Reading ${c.reading.join(', ')}`;
  return 'No book in progress';
}
const range = (c: WeekCell) => (c.from === c.to ? fmtDate(c.from) : `${fmtDate(c.from)} – ${+c.to.slice(8, 10)}`);

/**
 * The year so far at the grain of weeks: twelve month columns of up to five squares.
 * One hue in two steps: a wash for weeks with a book in progress, full green for weeks a book was finished.
 */
export function YearGrid({ books }: { books: Book[] }) {
  const now = today();
  const year = +now.slice(0, 4);
  const months = useMemo(() => monthWeeks(books, year, now), [books, year, now]);
  const [picked, setPicked] = useState<WeekCell | null>(null);

  return (
    <section>
    {/* The label's right side carries the legend, or the tapped week, so the grid needs no caption row. */}
    <Label right={<span className="yg-caption">{picked ? <><span className="meta">{range(picked)}</span> · {describe(picked)}</> : (
      <span className="yg-legend"><i className="yg l1" />Reading<i className="yg l2" />Finished</span>
    )}</span>}>{year} so far</Label>
    <figure className="year-grid" aria-label={`Reading by week in ${year} so far`}>
      <div className="yg-months" onPointerLeave={() => setPicked(null)}>
        {months.map((cells, m) => (
          <div key={m} className="yg-month">
            {cells.map((c) => c.future
              ? <span key={c.from} className="yg future" />
              : <button key={c.from} className={`yg l${c.level}${picked?.from === c.from ? ' on' : ''}`} aria-label={`${range(c)}: ${describe(c)}`}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPicked(c); }} onClick={() => setPicked(picked?.from === c.from ? null : c)} />)}
            <span className="yg-m" aria-hidden>{MONTH_NAMES[m][0]}</span>
          </div>
        ))}
      </div>
    </figure>
    </section>
  );
}
