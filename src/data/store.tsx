import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { collection, doc, onSnapshot, setDoc, updateDoc, writeBatch, getDocs, query, limit, disableNetwork, enableNetwork, deleteField, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase';
import { forgetLibrary } from '../library';
import type { Book, Read, Highlight } from '../types';
import { bottomRank, newId, normalizeBook, queue } from '../lib/books';
import type { MergePlan } from '../lib/importer';
import { today } from '../lib/dates';
import { titleCase, nameCase } from '../lib/titlecase';

export type BookPatch = Partial<Pick<Book, 'title' | 'author' | 'reads' | 'rank' | 'highlights' | 'deleted_at'>>;

export interface Store {
  lid: string;
  /** Live books (not deleted). */
  books: Book[];
  byId: Map<string, Book>;
  /** First snapshot arrived (from cache or server). */
  loaded: boolean;
  /** A local write has waited more than ~2 s for the server. */
  pending: boolean;
  online: boolean;
  addBook: (b: { title: string; author: string; reads?: Omit<Read, 'id'>[]; queue?: boolean }) => string;
  update: (id: string, patch: BookPatch) => void;
  startReading: (id: string, started?: string) => void;
  endRead: (id: string, readId: string, end: { status: 'finished' | 'dnf'; ended: string; note: string }) => void;
  /** Adds a book to the bottom of the queue. */
  enqueue: (id: string) => void;
  dequeue: (id: string) => void;
  addHighlights: (id: string, hs: Highlight[]) => void;
  remove: (id: string) => void;
  restore: (id: string) => void;
  applyMerge: (plan: MergePlan) => Promise<void>;
  /** Writes books exactly as given (restore from a JSON export). */
  putBooks: (books: Book[]) => Promise<void>;
  deleteLibrary: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
};

/** Firestore batches cap at 500 writes; stay well under. */
async function inBatches<T>(items: T[], write: (batch: ReturnType<typeof writeBatch>, item: T) => void) {
  for (let i = 0; i < items.length; i += 400) {
    const batch = writeBatch(db);
    items.slice(i, i + 400).forEach((it) => write(batch, it));
    // Not awaited: offline, the commit only resolves once the server acks, but the local cache applies now.
    void batch.commit();
  }
}

export function StoreProvider({ lid, children }: { lid: string; children: ReactNode }) {
  const [all, setAll] = useState<Book[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pendingRaw, setPendingRaw] = useState(false);
  const [pending, setPending] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const booksCol = useMemo(() => collection(db, 'libraries', lid, 'books'), [lid]);

  // Debounce the badge: ignore sub-2s round trips.
  useEffect(() => {
    if (!pendingRaw) { setPending(false); return; }
    const t = window.setTimeout(() => setPending(true), 2000);
    return () => window.clearTimeout(t);
  }, [pendingRaw]);

  // iOS freezes home-screen apps in the background and the Firestore stream goes stale.
  // On return after a long hide, bounce the network so it reconnects immediately.
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = async () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 10_000) {
        try { await disableNetwork(db); await enableNetwork(db); } catch { /* ignore */ }
      }
      hiddenAt = 0;
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // The whole library is small: listen to all of it, so every screen works from the local cache offline.
  useEffect(() => onSnapshot(booksCol, { includeMetadataChanges: true }, (snap) => {
    setAll(snap.docs.map((d) => normalizeBook({ id: d.id, ...(d.data() as DocumentData) })));
    setPendingRaw(snap.metadata.hasPendingWrites);
    setLoaded(true);
  }, (err) => console.error('books listener', err)), [booksCol]);

  const books = useMemo(() => all.filter((b) => !b.deleted_at), [all]);
  const byId = useMemo(() => new Map(all.map((b) => [b.id, b])), [all]);
  const ref = useRef(byId);
  ref.current = byId;
  const booksRef = useRef(books);
  booksRef.current = books;

  // Writes are fire-and-forget: the local cache applies instantly and syncs when there's signal.
  const update = useCallback((id: string, patch: BookPatch) => {
    // Writing a rank also drops the old two-shelf field, so normalizeBook stops offsetting it.
    void updateDoc(doc(booksCol, id), { ...patch, ...('rank' in patch ? { shelf: deleteField() } : {}), updated_at: Date.now() });
  }, [booksCol]);

  const addBook = useCallback<Store['addBook']>(({ title, author, reads = [], queue: queued }) => {
    const id = newId();
    const now = Date.now();
    const book: Omit<Book, 'id'> = {
      title: titleCase(title), author: nameCase(author),
      reads: reads.map((r) => ({ ...r, id: newId() })),
      rank: queued ? bottomRank(queue(booksRef.current)) : null,
      highlights: [], created_at: now, updated_at: now, deleted_at: null,
    };
    void setDoc(doc(booksCol, id), book);
    return id;
  }, [booksCol]);

  const startReading = useCallback((id: string, started = today()) => {
    const b = ref.current.get(id);
    if (!b) return;
    update(id, { reads: [...b.reads, { id: newId(), status: 'reading', started, ended: null, note: '' }], rank: null });
  }, [update]);

  const endRead = useCallback<Store['endRead']>((id, readId, end) => {
    const b = ref.current.get(id);
    if (!b) return;
    update(id, { reads: b.reads.map((r) => (r.id === readId ? { ...r, ...end } : r)) });
  }, [update]);

  const enqueue = useCallback((id: string) => update(id, { rank: bottomRank(queue(booksRef.current).filter((b) => b.id !== id)) }), [update]);
  const dequeue = useCallback((id: string) => update(id, { rank: null }), [update]);

  const addHighlights = useCallback((id: string, hs: Highlight[]) => {
    const b = ref.current.get(id);
    if (!b || !hs.length) return;
    update(id, { highlights: [...b.highlights, ...hs] });
  }, [update]);

  const remove = useCallback((id: string) => update(id, { deleted_at: Date.now() }), [update]);
  const restore = useCallback((id: string) => update(id, { deleted_at: null }), [update]);

  const applyMerge = useCallback(async (plan: MergePlan) => {
    const now = Date.now();
    await inBatches(plan.creates, (batch, b) => { const { id, ...rest } = b; batch.set(doc(booksCol, id), rest); });
    await inBatches(plan.updates, (batch, u) => batch.update(doc(booksCol, u.id), { reads: u.reads, rank: u.rank, shelf: deleteField(), updated_at: now }));
  }, [booksCol]);

  const putBooks = useCallback(async (list: Book[]) => {
    await inBatches(list, (batch, b) => { const { id, ...rest } = b; batch.set(doc(booksCol, id), rest); });
  }, [booksCol]);

  const deleteLibrary = useCallback(async () => {
    for (;;) {
      const snap = await getDocs(query(booksCol, limit(400)));
      if (snap.empty) break;
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    forgetLibrary();
    location.href = '/';
  }, [booksCol]);

  const value = useMemo<Store>(() => ({
    lid, books, byId, loaded, pending, online, addBook, update, startReading, endRead, enqueue, dequeue, addHighlights, remove, restore, applyMerge, putBooks, deleteLibrary,
  }), [lid, books, byId, loaded, pending, online, addBook, update, startReading, endRead, enqueue, dequeue, addHighlights, remove, restore, applyMerge, putBooks, deleteLibrary]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
