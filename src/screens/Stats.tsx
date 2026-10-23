import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { history, matchesSearch, years, yearStats, type HistoryItem } from '../lib/books';
import { fmtRange, MONTH_NAMES, yearOf } from '../lib/dates';
import { BackToNow, Label } from '../components/common';

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

function ReadList({ items }: { items: HistoryItem[] }) {
  const { openBook } = useUI();
  return (
    <ul className="list">
      {items.map(({ book, read: r }) => (
        <li key={r.id}>
          <button className="row-main" onClick={() => openBook(book.id)}>
            <span className="title">{book.title}</span>
            <span className="author">{book.author}<span className="meta"> · {fmtRange(r.started, r.ended)}</span>{r.status === 'dnf' && <span className="dnf"> · Didn't finish</span>}</span>
            {r.note && <span className="note clamp">{r.note}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Search spans every year, grouped by year. */
function SearchResults({ items, q }: { items: HistoryItem[]; q: string }) {
  const groups = useMemo(() => {
    const out: { year: number | null; items: HistoryItem[] }[] = [];
    for (const i of items) {
      const y = yearOf(i.read.ended);
      if (out[out.length - 1]?.year !== y) out.push({ year: y, items: [] });
      out[out.length - 1].items.push(i);
    }
    return out;
  }, [items]);
  if (!items.length) return <p className="muted small pad">Nothing matches “{q}”.</p>;
  return (
    <section>
      {groups.map((g) => (
        <div key={g.year ?? 'none'} className="year-group">
          <h3 className="year-head">{g.year ?? 'Undated'}<span>{g.items.length}</span></h3>
          <ReadList items={g.items} />
        </div>
      ))}
    </section>
  );
}

/** Everything finished or set aside: a year at a time, with that year's numbers on top. */
export function Stats() {
  const { books } = useStore();
  const { setTab } = useUI();
  const ys = useMemo(() => years(books), [books]);
  const [year, setYear] = useState(ys[0]);
  const [q, setQ] = useState('');
  const all = useMemo(() => history(books), [books]);
  const found = useMemo(() => (q.trim() ? all.filter((i) => matchesSearch(i, q)) : []), [all, q]);
  const s = useMemo(() => yearStats(books, year), [books, year]);
  const yearItems = useMemo(() => all.filter((i) => yearOf(i.read.ended) === year), [all, year]);
  const dated = s.perMonth.some((c) => c > 0);

  return (
    <main className="screen drawer">
      <BackToNow onBack={() => setTab('now')} />
      <header className="masthead">
        <h1 className="wordmark">{q.trim() ? 'Search' : year}</h1>
        {ys.length > 1 && !q.trim() && (
          <div className="year-pick">
            {ys.map((y) => <button key={y} className={y === year ? 'on' : ''} onClick={() => setYear(y)}>{y}</button>)}
          </div>
        )}
      </header>

      {all.length > 0 && <input type="search" className="search" placeholder="Search every year: titles, authors, notes" value={q} onChange={(e) => setQ(e.target.value)} />}

      {q.trim() ? <SearchResults items={found} q={q} /> : <>

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

      {yearItems.length > 0 && (
        <section>
          <Label>Books</Label>
          <ReadList items={yearItems} />
        </section>
      )}

      {!yearItems.length && <p className="muted pad">Nothing finished in {year} yet.</p>}
      </>}
    </main>
  );
}
