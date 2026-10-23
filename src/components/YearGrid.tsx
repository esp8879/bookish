import { useMemo, useState } from 'react';
import type { Book } from '../types';
import { weekColumns, yearActivity, type ActivityDay } from '../lib/activity';
import { fmtDate, MONTH_NAMES, today } from '../lib/dates';

const level = (d: ActivityDay) => (d.finished.length ? 2 : d.reading.length ? 1 : 0);

function describe(d: ActivityDay) {
  if (d.finished.length) return `Finished ${d.finished.join(', ')}`;
  if (d.reading.length) return `Reading ${d.reading.join(', ')}`;
  return 'No book in progress';
}

/**
 * The year so far, a square per day, weeks as columns (GitHub style). One hue in two steps:
 * a light wash on days with a book in progress, full green on days a book was finished.
 */
export function YearGrid({ books }: { books: Book[] }) {
  const now = today();
  const year = +now.slice(0, 4);
  const cols = useMemo(() => weekColumns(yearActivity(books, year, now)), [books, year, now]);
  const [picked, setPicked] = useState<ActivityDay | null>(null);
  // Month labels sit over the first column that contains the 1st of that month.
  const months = useMemo(() => cols.map((c) => c.find((d) => d?.day.endsWith('-01'))).map((d) => (d ? MONTH_NAMES[+d.day.slice(5, 7) - 1] : '')), [cols]);

  return (
    <figure className="year-grid" aria-label={`Reading activity in ${year} so far`}>
      <div className="yg-months" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 12px))` }} aria-hidden>
        {months.map((m, i) => <span key={i}>{m}</span>)}
      </div>
      <div className="yg-cells" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 12px))` }} onPointerLeave={() => setPicked(null)}>
        {cols.map((col, i) => (
          <div key={i} className="yg-col">
            {col.map((d, j) => d
              ? <button key={j} className={`yg l${level(d)}${d.day === now ? ' today' : ''}${picked?.day === d.day ? ' on' : ''}`} aria-label={`${fmtDate(d.day)}: ${describe(d)}`}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPicked(d); }} onClick={() => setPicked(picked?.day === d.day ? null : d)} />
              : <span key={j} className="yg blank" />)}
          </div>
        ))}
      </div>
      <figcaption className="yg-caption">
        {picked ? <><span className="meta">{fmtDate(picked.day)}</span> · {describe(picked)}</> : (
          <span className="yg-legend"><i className="yg l1" />Reading<i className="yg l2" />Finished</span>
        )}
      </figcaption>
    </figure>
  );
}
