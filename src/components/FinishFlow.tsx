import { useState } from 'react';
import { useStore } from '../data/store';
import { useUI, type Finishing } from '../ui';
import { finishFact, queue, UP_NEXT } from '../lib/books';
import { MONTH_NAMES, today } from '../lib/dates';
import type { Read } from '../types';
import { DateField, Field, Grow, Seg, Sheet } from './common';

interface Before { reads: Read[]; rank: number | null }

/** "24 Oct 2026", set in small caps on the stamp; a year-only date stays a year. */
const stampDate = (d: string) => (d.length === 10 ? `${+d.slice(8, 10)} ${MONTH_NAMES[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : d);

/** The finish moment: a library date stamp pressed on the sheet, and the one line that's true of this finish. */
function Stamp({ ended, fact }: { ended: string; fact: string }) {
  return (
    <div className="finish-moment">
      <div className="stamp" aria-label={`Finished ${stampDate(ended)}`}><span>Finished</span><span className="stamp-date">{stampDate(ended)}</span></div>
      {fact && <p className="finish-fact">{fact}</p>}
    </div>
  );
}

/** Finish → done or DNF (optionally back to the queue) → note → "What's next?" from Up Next, with the queue a tap away. */
export function FinishFlow({ bookId, readId, status: initial = 'finished' }: Finishing) {
  const { byId, books, endRead, startReading, enqueue, update } = useStore();
  const { setFinishing, toast, setLedgerTick } = useUI();
  const book = byId.get(bookId);
  const read = book?.reads.find((r) => r.id === readId);
  const [status, setStatus] = useState<'finished' | 'dnf'>(initial);
  const [ended, setEnded] = useState<string>(today());
  const [note, setNote] = useState(read?.note ?? '');
  const [step, setStep] = useState<'end' | 'next'>('end');
  const [all, setAll] = useState(false);
  const [requeue, setRequeue] = useState(false);
  const [fact, setFact] = useState('');
  /** The book as it was before saving, so closing afterwards can offer Undo. */
  const [before, setBefore] = useState<Before | null>(null);
  const close = () => setFinishing(null);
  if (!book || !read) return null;

  const q = queue(books).filter((b) => b.id !== bookId);
  const done = status === 'finished' ? `Finished ${book.title}` : `Marked ${book.title} as didn't finish`;
  const undo = (prev: Before) => () => { update(book.id, prev); setLedgerTick(false); };

  const save = () => {
    const end = { status, ended: ended || today(), note: note.trim() };
    const prev = { reads: book.reads, rank: book.rank };
    endRead(book.id, read.id, end);
    if (status === 'dnf' && requeue) enqueue(book.id);
    if (status === 'finished') {
      // Worked out from the library as it is once this read ends; the store's snapshot arrives a moment later.
      const after = books.map((b) => (b.id === book.id ? { ...b, reads: b.reads.map((r) => (r.id === read.id ? { ...r, ...end } : r)) } : b));
      setFact(finishFact(after, book.id, read.id));
      setLedgerTick(true);
    }
    // A finish always gets its moment; a book set aside goes straight to what's next, or closes if nothing is queued.
    if (q.length || status === 'finished') { setBefore(prev); setStep('next'); }
    else { close(); toast(done, undo(prev)); }
  };
  /** Leaving without starting anything: say what was saved, with Undo. */
  const dismiss = () => { close(); if (before) toast(done, undo(before)); };
  const start = (id: string) => {
    const next = byId.get(id);
    const prev = next && { reads: next.reads, rank: next.rank };
    startReading(id);
    close();
    toast(`Started ${next?.title ?? ''}`, prev && (() => update(id, prev)));
  };

  if (step === 'next') {
    const list = all ? q : q.slice(0, UP_NEXT);
    const stamp = status === 'finished' ? <Stamp ended={ended || today()} fact={fact} /> : undefined;
    return (
      <Sheet title={q.length ? "What's next?" : done} onClose={dismiss} closeButton={false} lead={stamp} showTitle={q.length > 0}>
        {q.length > 0 && <ul className="list next-list">
          {list.map((b, i) => (
            <li key={b.id}>
              <div className="row-main static"><span className="title">{b.title}</span>{b.author && <span className="author">{b.author}</span>}</div>
              {/* The top of your own queue is the likely pick, so its Start is the filled one. */}
              <button className={`btn${i === 0 ? ' primary' : ''}`} onClick={() => start(b.id)}>Start</button>
            </li>
          ))}
        </ul>}
        {!all && q.length > UP_NEXT && <button className="btn link" onClick={() => setAll(true)}>See the whole queue ({q.length})</button>}
        <button className="btn block" onClick={dismiss}>{q.length ? 'Not now' : 'Done'}</button>
      </Sheet>
    );
  }

  return (
    <Sheet title={book.title} onClose={close} action={<button className="btn primary small" onClick={save}>{status === 'finished' ? 'Mark finished' : 'Stop reading'}</button>}>
      <Seg options={[{ value: 'finished', label: 'Finished' }, { value: 'dnf', label: "Didn't finish" }]} value={status} onChange={setStatus} />
      <DateField label={status === 'finished' ? 'Finished on' : 'Stopped on'} value={ended} onChange={(v) => setEnded(v ?? today())} />
      {status === 'dnf' && (
        <label className="check">
          <input type="checkbox" checked={requeue} onChange={(e) => setRequeue(e.target.checked)} />
          <span>Back to the bottom of the queue, to try again someday</span>
        </label>
      )}
      <Field label="Note">
        <Grow value={note} onChange={setNote} placeholder={status === 'finished' ? 'What did you think?' : 'Why did you stop?'} />
      </Field>
    </Sheet>
  );
}
