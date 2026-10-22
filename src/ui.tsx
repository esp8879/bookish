import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type Tab = 'books' | 'year' | 'settings';

interface UI {
  tab: Tab;
  setTab: (t: Tab) => void;
  /** Book page overlay. */
  bookId: string | null;
  openBook: (id: string | null) => void;
  adding: boolean;
  setAdding: (v: boolean) => void;
  /** Finish flow for one read. */
  finishing: { bookId: string; readId: string } | null;
  setFinishing: (f: { bookId: string; readId: string } | null) => void;
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
  const [tab, setTabState] = useState<Tab>('books');
  const [bookId, setBookId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState<{ bookId: string; readId: string } | null>(null);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const timer = useRef<number | null>(null);

  const toast = useCallback((msg: string, undo?: () => void) => {
    if (timer.current) window.clearTimeout(timer.current);
    setToastState({ msg, undo, key: Date.now() });
    timer.current = window.setTimeout(() => setToastState(null), undo ? 8000 : 3500);
  }, []);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const setTab = useCallback((t: Tab) => { setTabState(t); setBookId(null); window.scrollTo(0, 0); }, []);
  const openBook = useCallback((id: string | null) => setBookId(id), []);

  return (
    <Ctx.Provider value={{ tab, setTab, bookId, openBook, adding, setAdding, finishing, setFinishing, toast }}>
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
