import { useState } from 'react';
import { useStore } from '../data/store';
import { useUI, type Finishing } from '../ui';
import { queue, UP_NEXT } from '../lib/books';
import { today } from '../lib/dates';
import { DateField, Field, Grow, Seg, Sheet } from './common';

/** Finish → done or DNF (optionally back to the queue) → note → "What's next?" from Up Next, with the queue a tap away. */
export function FinishFlow({ bookId, readId, status: initial = 'finished' }: Finishing) {
  const { byId, books, endRead, startReading, enqueue } = useStore();
  const { setFinishing, toast } = useUI();
  const book = byId.get(bookId);
  const read = book?.reads.find((r) => r.id === readId);
  const [status, setStatus] = useState<'finished' | 'dnf'>(initial);
  const [ended, setEnded] = useState<string>(today());
  const [note, setNote] = useState(read?.note ?? '');
  const [step, setStep] = useState<'end' | 'next'>('end');
  const [all, setAll] = useState(false);
  const [requeue, setRequeue] = useState(false);
  const close = () => setFinishing(null);
  if (!book || !read) return null;

  const q = queue(books).filter((b) => b.id !== bookId);
  const save = () => {
    endRead(book.id, read.id, { status, ended: ended || today(), note: note.trim() });
    if (status === 'dnf' && requeue) enqueue(book.id);
    if (q.length) setStep('next');
    else { close(); toast(status === 'finished' ? `Finished ${book.title}` : `Set ${book.title} aside`); }
  };
  const start = (id: string) => {
    startReading(id);
    close();
    toast(`Started ${byId.get(id)?.title ?? ''}`);
  };

  if (step === 'next') {
    const list = all ? q : q.slice(0, UP_NEXT);
    return (
      <Sheet title="What's next?" onClose={close}>
        <ul className="list next-list">
          {list.map((b) => (
            <li key={b.id}>
              <div className="row-main static"><span className="title">{b.title}</span>{b.author && <span className="author">{b.author}</span>}</div>
              <button className="btn" onClick={() => start(b.id)}>Start</button>
            </li>
          ))}
        </ul>
        {!all && q.length > UP_NEXT && <button className="btn link" onClick={() => setAll(true)}>See the whole queue ({q.length})</button>}
        <button className="btn block" onClick={close}>Not now</button>
      </Sheet>
    );
  }

  return (
    <Sheet title={book.title} onClose={close} action={<button className="btn primary small" onClick={save}>Save</button>}>
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
