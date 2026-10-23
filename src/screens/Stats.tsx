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
  const [searching, setSearching] = useState(false);
  const all = useMemo(() => history(books), [books]);
  const found = useMemo(() => (q.trim() ? all.filter((i) => matchesSearch(i, q)) : []), [all, q]);
  const s = useMemo(() => yearStats(books, year), [books, year]);
  const yearItems = useMemo(() => all.filter((i) => yearOf(i.read.ended) === year), [all, year]);
  const dated = s.perMonth.some((c) => c > 0);

  return (
    <main className="screen drawer">
      <BackToNow onBack={() => setTab('now')} />
      <header className="masthead">
        {searching ? (
          <div className="search-row">
            <input type="search" className="search" placeholder="Titles, authors, notes" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            <button className="btn link" onClick={() => { setSearching(false); setQ(''); }}>Cancel</button>
          </div>
        ) : <>
          {/* The year is the heading; a native select so a long list of years stays one tap. */}
          <label className="year-select">
            <span className="wordmark">{year}</span>
            {ys.length > 1 && <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            {ys.length > 1 && <select aria-label="Year" value={year} onChange={(e) => setYear(+e.target.value)}>{ys.map((y) => <option key={y} value={y}>{y}</option>)}</select>}
          </label>
          {all.length > 0 && <button className="icon-btn" aria-label="Search every year" onClick={() => setSearching(true)}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M12.6 12.6L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>}
        </>}
      </header>

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
          {/* Days first and large, the book beneath, so each figure fits its column. */}
          <dl className="pace">
            <div><dt>Typical</dt><dd><span className="pace-n">{s.medianDays} {s.medianDays === 1 ? 'day' : 'days'}</span><span className="pace-t">per book</span></dd></div>
            {s.quickest && <div><dt>Quickest</dt><dd><span className="pace-n">{s.quickest.days} {s.quickest.days === 1 ? 'day' : 'days'}</span><em className="pace-t">{s.quickest.item.book.title}</em></dd></div>}
            {s.longest && <div><dt>Longest</dt><dd><span className="pace-n">{s.longest.days} days</span><em className="pace-t">{s.longest.item.book.title}</em></dd></div>}
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
