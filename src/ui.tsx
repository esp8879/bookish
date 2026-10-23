import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type Tab = 'now' | 'queue' | 'stats' | 'settings';
/** Names used for back buttons, so "‹ Queue" says where it goes. */
export const TAB_NAMES: Record<Tab, string> = { now: 'Now', queue: 'Queue', stats: 'Stats', settings: 'Settings' };
export interface Finishing { bookId: string; readId: string; status?: 'finished' | 'dnf' }

interface UI {
  tab: Tab;
  setTab: (t: Tab) => void;
  /** Book page overlay. */
  bookId: string | null;
  /** Opens the book page; `edit` starts it with the title and author editor open. */
  openBook: (id: string | null, opts?: { edit?: boolean }) => void;
  editOnOpen: boolean;
  /** Add sheet (only reachable from the Queue tab). */
  adding: boolean;
  setAdding: (v: boolean) => void;
  /** Finish flow for one read. */
  finishing: Finishing | null;
  setFinishing: (f: Finishing | null) => void;
  toast: (msg: string, undo?: () => void) => void;
}

const Ctx = createContext<UI | null>(null);
export const useUI = () => {
  const u = useContext(Ctx);
  if (!u) throw new Error('UIProvider missing');
  return u;
};

interface ToastState { msg: string; undo?: () => void; key: number }

export function UIProvider({ children }: { children: ReactNode }) {
  const [tab, setTabState] = useState<Tab>('now');
  const [bookId, setBookId] = useState<string | null>(null);
  const [editOnOpen, setEditOnOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState<Finishing | null>(null);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const timer = useRef<number | null>(null);

  const toast = useCallback((msg: string, undo?: () => void) => {
    if (timer.current) window.clearTimeout(timer.current);
    setToastState({ msg, undo, key: Date.now() });
    timer.current = window.setTimeout(() => setToastState(null), undo ? 8000 : 3500);
  }, []);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const setTab = useCallback((t: Tab) => { setTabState(t); setBookId(null); window.scrollTo(0, 0); }, []);
  const openBook = useCallback((id: string | null, opts?: { edit?: boolean }) => { setEditOnOpen(!!opts?.edit); setBookId(id); }, []);

  return (
    <Ctx.Provider value={{ tab, setTab, bookId, openBook, editOnOpen, adding, setAdding, finishing, setFinishing, toast }}>
      {children}
      {toastState && (
        <div className="toast" key={toastState.key} role="status">
          <span className="grow">{toastState.msg}</span>
          {toastState.undo && <button onClick={() => { toastState.undo?.(); setToastState(null); }}>Undo</button>}
        </div>
      )}
    </Ctx.Provider>
  );
}
