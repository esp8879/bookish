import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { searchText } from '../lib/books';
import { today } from '../lib/dates';
import { DateField, Field, Grow, Seg, Sheet } from './common';

type Where = 'queue' | 'reading' | 'read';
const DONE: Record<Where, string> = { queue: 'Added to the bottom of the queue', reading: 'Started', read: 'Added to Stats' };

export function AddBook() {
  const { books, addBook } = useStore();
  const { setAdding, toast, openBook } = useUI();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [where, setWhere] = useState<Where>('queue');
  const [started, setStarted] = useState<string | null>(today());
  const [ended, setEnded] = useState<string | null>(today());
  const [note, setNote] = useState('');
  const close = () => setAdding(false);

  // Suggest only names already in the library.
  const authors = useMemo(() => [...new Set(books.map((b) => b.author).filter(Boolean))].sort(), [books]);
  const existing = useMemo(() => {
    const t = searchText(title);
    return t ? books.find((b) => searchText(b.title) === t) ?? null : null;
  }, [books, title]);

  const save = () => {
    if (!title.trim()) return;
    const reads = where === 'reading' ? [{ status: 'reading' as const, started: started ?? today(), ended: null, note: '' }]
      : where === 'read' ? [{ status: 'finished' as const, started, ended: ended ?? today(), note: note.trim() }] : [];
    addBook({ title, author, reads, queue: where === 'queue' });
    close();
    toast(DONE[where]);
  };

  return (
    <Sheet title="Add a book" onClose={close}>
      <Field label="Title"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus autoCapitalize="words" enterKeyHint="next" /></Field>
      <Field label="Author">
        <input type="text" list="authors" value={author} onChange={(e) => setAuthor(e.target.value)} autoCapitalize="words" enterKeyHint="done" />
        <datalist id="authors">{authors.map((a) => <option key={a} value={a} />)}</datalist>
      </Field>
      {existing && (
        <div className="hint-box">Already in your library. <button className="btn link small" onClick={() => { close(); openBook(existing.id); }}>Open it</button></div>
      )}
      <Seg options={[{ value: 'queue', label: 'Queue' }, { value: 'reading', label: 'Reading now' }, { value: 'read', label: 'Already read' }]} value={where} onChange={setWhere} />
      {where === 'reading' && <DateField label="Started" value={started} onChange={setStarted} />}
      {where === 'read' && (
        <>
          <DateField label="Started" value={started} onChange={setStarted} optional />
          <DateField label="Finished" value={ended} onChange={setEnded} />
          <Field label="Note"><Grow value={note} onChange={setNote} placeholder="What did you think?" /></Field>
        </>
      )}
      <button className="btn primary block" disabled={!title.trim()} onClick={save}>Add</button>
    </Sheet>
  );
}
