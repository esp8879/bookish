import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { searchText } from '../lib/books';
import { today } from '../lib/dates';
import { DateField, Field, Grow, Seg, Sheet } from './common';
import type { Shelf } from '../types';

type Where = Shelf | 'reading' | 'read';
const DONE: Record<Where, string> = { queue: 'Added to the queue', next: 'Added to Up Next', reading: 'Started', read: 'Added' };

export function AddBook({ shelf }: { shelf: Shelf }) {
  const { books, addBook, shelve } = useStore();
  const { setAdding, toast, openBook } = useUI();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [where, setWhere] = useState<Where>(shelf);
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
    // Up Next goes through shelve() so a full Up Next makes room the usual way.
    const id = addBook({ title, author, reads, shelf: where === 'queue' ? 'queue' : undefined });
    const bumped = where === 'next' ? shelve(id, 'next') : undefined;
    close();
    toast(bumped ? `${DONE.next}. ${bumped.title} went back to the queue.` : DONE[where]);
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
      <Seg options={[{ value: 'queue', label: 'Queue' }, { value: 'next', label: 'Up Next' }, { value: 'reading', label: 'Reading' }, { value: 'read', label: 'Read' }]} value={where} onChange={setWhere} />
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
