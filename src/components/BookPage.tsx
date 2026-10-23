import { useEffect, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import type { Book, Read, ReadStatus } from '../types';
import { currentRead, daysIn, queue, UP_NEXT } from '../lib/books';
import { fmtRange, today } from '../lib/dates';
import { highlightId } from '../lib/clippings';
import { titleCase, nameCase } from '../lib/titlecase';
import { DateField, Field, Grow, Label, Seg, useBodyLock } from './common';

const STATUS_LABEL: Record<ReadStatus, string> = { reading: 'Reading', finished: 'Finished', dnf: "Didn't finish" };

function ReadEditor({ book, read, onDone }: { book: Book; read: Read; onDone: () => void }) {
  const { update } = useStore();
  const [r, setR] = useState(read);
  const save = () => {
    const fixed = { ...r, note: r.note.trim(), ended: r.status === 'reading' ? null : r.ended ?? today() };
    update(book.id, { reads: book.reads.map((x) => (x.id === r.id ? fixed : x)) });
    onDone();
  };
  const remove = () => {
    if (!confirm('Delete this read? Its dates and note go with it.')) return;
    update(book.id, { reads: book.reads.filter((x) => x.id !== r.id) });
    onDone();
  };
  return (
    <div className="editor">
      <Seg options={[{ value: 'reading', label: 'Reading' }, { value: 'finished', label: 'Finished' }, { value: 'dnf', label: "Didn't finish" }]} value={r.status} onChange={(status) => setR({ ...r, status })} />
      <DateField label="Started" value={r.started} onChange={(started) => setR({ ...r, started })} optional />
      {r.status !== 'reading' && <DateField label={r.status === 'dnf' ? 'Stopped' : 'Finished'} value={r.ended} onChange={(ended) => setR({ ...r, ended })} />}
      <Field label="Note"><Grow value={r.note} onChange={(note) => setR({ ...r, note })} /></Field>
      <div className="actions">
        <button className="btn danger" onClick={remove}>Delete read</button>
        <span className="grow" />
        <button className="btn" onClick={onDone}>Cancel</button>
        <button className="btn primary" onClick={save}>Save</button>
      </div>
    </div>
  );
}

export function BookPage({ id }: { id: string }) {
  const store = useStore();
  const { openBook, setFinishing, toast, editOnOpen } = useUI();
  const book = store.byId.get(id);
  const [editingRead, setEditingRead] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState(editOnOpen);
  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') openBook(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openBook]);
  useBodyLock();

  if (!book || book.deleted_at) return null;
  const now = currentRead(book);
  const last = book.reads[book.reads.length - 1];
  const pos = now ? -1 : queue(store.books).findIndex((b) => b.id === book.id);
  const queued = pos >= 0;

  const del = () => {
    store.remove(book.id);
    openBook(null);
    toast(`Deleted ${book.title}`, () => store.restore(book.id));
  };
  const saveBook = () => {
    if (!title.trim()) return;
    store.update(book.id, { title: titleCase(title), author: nameCase(author) });
    setEditingBook(false);
  };
  const addQuote = () => {
    const text = quote?.trim();
    if (text) store.addHighlights(book.id, [{ id: highlightId(text), text, added: today(), source: 'manual' }]);
    setQuote(null);
  };
  const removeHighlight = (hid: string) => {
    const before = book.highlights;
    store.update(book.id, { highlights: before.filter((h) => h.id !== hid) });
    toast('Highlight removed', () => store.update(book.id, { highlights: before }));
  };

  return (
    <div className="page" role="dialog" aria-label={book.title}>
      <div className="page-bar">
        <button className="btn link" onClick={() => openBook(null)}>‹ Back</button>
        {!editingBook && <button className="btn link" onClick={() => { setTitle(book.title); setAuthor(book.author); setEditingBook(true); }}>Edit</button>}
      </div>

      {editingBook ? (
        <div className="editor">
          <Field label="Title"><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Author"><input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
          <div className="actions">
            <button className="btn danger" onClick={del}>Delete book</button>
            <span className="grow" />
            <button className="btn" onClick={() => setEditingBook(false)}>Cancel</button>
            <button className="btn primary" onClick={saveBook}>Save</button>
          </div>
        </div>
      ) : (
        <header className="book-head">
          <h1 className="book-title">{book.title}</h1>
          {book.author && <div className="book-author">{book.author}</div>}
          {queued && <div className="book-pos">{pos < UP_NEXT ? `Up Next · #${pos + 1}` : `#${pos + 1} in the queue`}</div>}
        </header>
      )}

      <div className="book-actions">
        {now && <button className="btn primary" onClick={() => setFinishing({ bookId: book.id, readId: now.id })}>Finish</button>}
        {!now && <button className={`btn${queued ? ' primary' : ''}`} onClick={() => { store.startReading(book.id); toast(`Started ${book.title}`); }}>
          {queued || !last ? 'Start reading' : last.status === 'dnf' ? 'Try again now' : 'Read again'}
        </button>}
        {!now && !queued && <button className="btn" onClick={() => { store.enqueue(book.id); toast('Added to the bottom of the queue'); }}>{last?.status === 'dnf' ? 'Back to the queue' : 'Add to the queue'}</button>}
        {queued && <button className="btn" onClick={() => { store.dequeue(book.id); toast('Removed from the queue'); }}>Remove from queue</button>}
      </div>

      {book.reads.length > 0 && (
        <section>
          <Label>{book.reads.length > 1 ? 'Reads' : 'Read'}</Label>
          <ol className="reads">
            {[...book.reads].reverse().map((r) => (
              <li key={r.id}>
                {editingRead === r.id ? <ReadEditor book={book} read={r} onDone={() => setEditingRead(null)} /> : (
                  <button className="read-entry" onClick={() => setEditingRead(r.id)}>
                    <span className="read-meta">
                      <span className={r.status === 'dnf' ? 'dnf' : ''}>{STATUS_LABEL[r.status]}</span>
                      <span>{r.status === 'reading' ? `${fmtRange(r.started, null)}${daysIn(r) != null ? ` · day ${daysIn(r)! + 1}` : ''}` : fmtRange(r.started, r.ended)}</span>
                    </span>
                    {r.note ? <span className="note">{r.note}</span> : <span className="muted small">No note. Tap to add one.</span>}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <Label right={quote == null && <button className="btn link small" onClick={() => setQuote('')}>Add</button>}>Highlights</Label>
        {quote != null && (
          <div className="editor">
            <Grow value={quote} onChange={setQuote} autoFocus placeholder="Type or paste a passage" />
            <div className="actions"><span className="grow" /><button className="btn" onClick={() => setQuote(null)}>Cancel</button><button className="btn primary" onClick={addQuote}>Save</button></div>
          </div>
        )}
        {book.highlights.length ? (
          <ul className="highlights">
            {book.highlights.map((h) => (
              <li key={h.id}>
                <blockquote>{h.text}</blockquote>
                <div className="hl-meta">
                  {h.location && <span>{h.location}</span>}
                  <button className="btn link small" onClick={() => removeHighlight(h.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        ) : quote == null && <p className="muted small pad">None yet. Import Kindle highlights in Settings, or add a passage by hand.</p>}
      </section>
    </div>
  );
}
