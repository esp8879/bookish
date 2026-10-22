import { useState } from 'react';
import { useStore } from '../data/store';
import { nextAfterglow } from '../lib/books';
import { fmtDate, isFullDate, today } from '../lib/dates';
import { AFTERGLOW_LABELS, type AfterglowAnswer } from '../types';
import { useVisit } from '../hooks';

/** One question per visit about a book finished a while ago. */
export function AfterglowCard() {
  const { books, recordAfterglow } = useStore();
  const visit = useVisit();
  const [answer, setAnswer] = useState<AfterglowAnswer | null>(null);
  const [line, setLine] = useState('');
  const due = visit.afterglowDone ? null : nextAfterglow(books, today(), visit.skipped);
  // Keep the card on screen while a line is being added, even though the answer is already saved.
  const [held, setHeld] = useState<typeof due>(null);
  const item = held ?? due;
  if (!item) return null;

  const pick = (a: AfterglowAnswer) => { setAnswer(a); setHeld(item); };
  const save = (withLine: boolean) => {
    recordAfterglow(item.book.id, item.read.id, { checkpoint: item.checkpoint, at: today(), answer: answer!, ...(withLine && line.trim() ? { line: line.trim() } : {}) });
    visit.finishAfterglow();
    setHeld(null);
  };

  return (
    <section className="afterglow" aria-label="Afterglow">
      <div className="afterglow-kicker">Finished {isFullDate(item.read.ended) ? fmtDate(item.read.ended) : `in ${item.read.ended}`}</div>
      <div className="afterglow-q">Still thinking about <em>{item.book.title}</em>?</div>
      {!answer ? (
        <>
          <div className="afterglow-answers">
            {(Object.keys(AFTERGLOW_LABELS) as AfterglowAnswer[]).map((a) => <button key={a} className="btn" onClick={() => pick(a)}>{AFTERGLOW_LABELS[a]}</button>)}
          </div>
          <button className="btn link small" onClick={() => visit.skip(item.read.id)}>Not now</button>
        </>
      ) : (
        <>
          <input type="text" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Anything to add? (optional)" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') save(true); }} />
          <div className="afterglow-answers">
            <button className="btn" onClick={() => save(false)}>Skip</button>
            <button className="btn primary" onClick={() => save(true)}>Save</button>
          </div>
        </>
      )}
    </section>
  );
}
