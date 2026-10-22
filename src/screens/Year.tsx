import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { years, yearStats, type HistoryItem } from '../lib/books';
import { MONTH_NAMES } from '../lib/dates';
import { Label } from '../components/common';

/** Finished books per month: one series, so no legend; the busiest month is labeled, the rest on tap. */
function MonthBars({ counts }: { counts: number[] }) {
  const [tip, setTip] = useState<number | null>(null);
  const max = Math.max(1, ...counts);
  const peak = counts.indexOf(Math.max(...counts));
  return (
    <figure className="bars" aria-label="Books finished per month">
      <div className="bars-plot" onPointerLeave={() => setTip(null)}>
        {counts.map((c, i) => (
          <button key={i} className={`bar-slot${tip === i ? ' on' : ''}`} aria-label={`${MONTH_NAMES[i]}: ${c} ${c === 1 ? 'book' : 'books'}`}
            onPointerEnter={() => setTip(i)} onClick={() => setTip(tip === i ? null : i)}>
            {(tip === i || (tip == null && i === peak && c > 0)) && <span className="bar-value">{c}</span>}
            {c > 0 && <span className="bar" style={{ height: `${(c / max) * 100}%` }} />}
          </button>
        ))}
      </div>
      <div className="bars-axis" aria-hidden>{MONTH_NAMES.map((m) => <span key={m}>{m[0]}</span>)}</div>
    </figure>
  );
}

function BookLine({ item }: { item: HistoryItem }) {
  const { openBook } = useUI();
  return (
    <li><button className="row-main" onClick={() => openBook(item.book.id)}><span className="title">{item.book.title}</span><span className="author">{item.book.author}</span></button></li>
  );
}

export function Year() {
  const { books } = useStore();
  const ys = useMemo(() => years(books), [books]);
  const [year, setYear] = useState(ys[0]);
  const s = useMemo(() => yearStats(books, year), [books, year]);
  const dated = s.perMonth.some((c) => c > 0);

  return (
    <main className="screen">
      <header className="masthead">
        <h1 className="wordmark">{year}</h1>
        {ys.length > 1 && (
          <div className="year-pick">
            {ys.map((y) => <button key={y} className={y === year ? 'on' : ''} onClick={() => setYear(y)}>{y}</button>)}
          </div>
        )}
      </header>

      <section className="tally">
        <div><span className="tally-n">{s.finished.length}</span><span className="tally-l">{s.finished.length === 1 ? 'book finished' : 'books finished'}</span></div>
        {s.dnf.length > 0 && <div><span className="tally-n small">{s.dnf.length}</span><span className="tally-l">set aside</span></div>}
      </section>

      {dated && (
        <section>
          <Label>By month</Label>
          <MonthBars counts={s.perMonth} />
          {s.undatedFinished > 0 && <p className="muted small">{s.undatedFinished} more without a finish date.</p>}
        </section>
      )}

      {s.medianDays != null && (
        <section>
          <Label>Pace</Label>
          <dl className="facts">
            <div><dt>Typical book</dt><dd>{s.medianDays} {s.medianDays === 1 ? 'day' : 'days'}</dd></div>
            {s.quickest && <div><dt>Quickest</dt><dd><em>{s.quickest.item.book.title}</em>, {s.quickest.days} {s.quickest.days === 1 ? 'day' : 'days'}</dd></div>}
            {s.longest && <div><dt>Longest</dt><dd><em>{s.longest.item.book.title}</em>, {s.longest.days} days</dd></div>}
          </dl>
        </section>
      )}

      {s.topAuthors.length > 0 && (
        <section>
          <Label>Most read</Label>
          <dl className="facts">
            {s.topAuthors.map((a) => <div key={a.author}><dt>{a.author}</dt><dd>{a.count} books</dd></div>)}
          </dl>
        </section>
      )}

      {(s.lasted.length > 0 || s.lingered.length > 0) && (
        <section>
          <Label>Still with you</Label>
          <ul className="list">{s.lasted.map((i) => <BookLine key={i.read.id} item={i} />)}</ul>
          {s.lingered.length > 0 && <>
            <h3 className="sub-head">A little</h3>
            <ul className="list">{s.lingered.map((i) => <BookLine key={i.read.id} item={i} />)}</ul>
          </>}
        </section>
      )}

      {!s.finished.length && !s.dnf.length && <p className="muted pad">Nothing finished in {year} yet.</p>}
    </main>
  );
}
