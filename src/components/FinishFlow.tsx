import { useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { queue, upNext } from '../lib/books';
import { today } from '../lib/dates';
import { DateField, Field, Grow, Seg, Sheet } from './common';

/** Finish → done or DNF → note → "What's next?" from Up Next, with the queue a tap away. */
export function FinishFlow({ bookId, readId }: { bookId: string; readId: string }) {
  const { byId, books, endRead, startReading } = useStore();
  const { setFinishing, toast } = useUI();
  const book = byId.get(bookId);
  const read = book?.reads.find((r) => r.id === readId);
  const [status, setStatus] = useState<'finished' | 'dnf'>('finished');
  const [ended, setEnded] = useState<string>(today());
  const [note, setNote] = useState(read?.note ?? '');
  const [step, setStep] = useState<'end' | 'next'>('end');
  const [all, setAll] = useState(false);
  const close = () => setFinishing(null);
  if (!book || !read) return null;

  const up = upNext(books);
  const queued = queue(books);
  const save = () => {
    endRead(book.id, read.id, { status, ended: ended || today(), note: note.trim() });
    if (up.length || queued.length) setStep('next');
    else { close(); toast(status === 'finished' ? `Finished ${book.title}` : `Set ${book.title} aside`); }
  };
  const start = (id: string) => {
    startReading(id);
    close();
    toast(`Started ${byId.get(id)?.title ?? ''}`);
  };

  if (step === 'next') {
    const list = all ? [...up, ...queued] : up.length ? up : queued.slice(0, 5);
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
        {!all && queued.length > 0 && up.length > 0 && <button className="btn link" onClick={() => setAll(true)}>Show the queue too ({queued.length})</button>}
        {!all && !up.length && queued.length > 5 && <button className="btn link" onClick={() => setAll(true)}>See all {queued.length}</button>}
        <button className="btn block" onClick={close}>Not now</button>
      </Sheet>
    );
  }

  return (
    <Sheet title={book.title} onClose={close}>
      <Seg options={[{ value: 'finished', label: 'Finished' }, { value: 'dnf', label: "Didn't finish" }]} value={status} onChange={setStatus} />
      <DateField label={status === 'finished' ? 'Finished on' : 'Stopped on'} value={ended} onChange={(v) => setEnded(v ?? today())} />
      <Field label="Note">
        <Grow value={note} onChange={setNote} autoFocus placeholder={status === 'finished' ? 'What did you think?' : 'Why did you stop?'} />
      </Field>
      <button className="btn primary block" onClick={save}>Save</button>
    </Sheet>
  );
}
