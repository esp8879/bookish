import { useEffect, useState } from 'react';
import { applyUpdate, updateReady } from './sw';
import { StoreProvider } from './data/store';
import { createLibrary, DEMO_PATH, openLibrary, resolveLid } from './library';
import { UIProvider, useUI } from './ui';
import { Home } from './screens/Home';
import { Stats } from './screens/Stats';
import { Queue } from './screens/Queue';
import { Settings } from './screens/Settings';
import { BookPage } from './components/BookPage';
import { AddBook } from './components/AddBook';
import { FinishFlow } from './components/FinishFlow';
import { Wordmark } from './components/common';

/** Paper band at the bottom of the drawer screens; its fade turns on only while content is scrolled under it. */
function BottomBand({ tab }: { tab: string }) {
  const [covering, setCovering] = useState(false);
  useEffect(() => {
    const check = () => setCovering(window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(document.body);
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { ro.disconnect(); window.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [tab]);
  return <div className={`bottom-band${covering ? ' covering' : ''}`} aria-hidden><div /></div>;
}

function UpdatePrompt() {
  const [ready, setReady] = useState(updateReady);
  const [updating, setUpdating] = useState(false);
  useEffect(() => { const on = () => setReady(true); window.addEventListener('books:update', on); return () => window.removeEventListener('books:update', on); }, []);
  if (!ready) return null;
  return (
    <div className="update-scrim" role="dialog" aria-label="Update available">
      <div className="update-card">
        <h2>A new version is ready</h2>
        <p className="muted">Update to get the latest version of book·ish.</p>
        <button className="btn primary block" disabled={updating} onClick={() => { setUpdating(true); void applyUpdate(); }}>{updating ? 'Updating…' : 'Update now'}</button>
      </div>
    </div>
  );
}

function Shell() {
  const { tab, bookId, adding, finishing } = useUI();
  return (
    <div className="app">
      {tab === 'now' && <Home />}
      {tab === 'queue' && <Queue />}
      {tab === 'stats' && <Stats />}
      {tab === 'settings' && <Settings />}
      {/* Drawer screens end in a paper band, the height of the main screen's bottom row, that content scrolls behind. */}
      {tab !== 'now' && <BottomBand tab={tab} />}
      {bookId && <BookPage key={bookId} id={bookId} />}
      {adding && <AddBook />}
      {finishing && <FinishFlow {...finishing} />}
      <UpdatePrompt />
    </div>
  );
}

function Welcome({ onCreate }: { onCreate: () => void }) {
  const [opening, setOpening] = useState(false);
  const [link, setLink] = useState('');
  const [bad, setBad] = useState(false);
  return (
    <main className="welcome">
      <h1><Wordmark size="big" /></h1>
      <p className="lede">A reading log that belongs to you. What you read, what you thought, what's next.</p>
      <p className="muted small">No account. Your library lives at a private link; keep it safe and it opens on any device.</p>
      <div className="stack">
        <button className="btn primary block" onClick={onCreate}>Start a library</button>
        <a className="btn block" href={DEMO_PATH}>Look around a demo first</a>
        {!opening ? (
          <button className="btn link" onClick={() => setOpening(true)}>I have my library link</button>
        ) : (
          <div className="stack">
            <input type="text" inputMode="url" placeholder="https://…/l/…" value={link} onChange={(e) => { setLink(e.target.value); setBad(false); }} autoFocus />
            {bad && <p className="red small">That doesn't look like a library link.</p>}
            <button className="btn block" disabled={!link.trim()} onClick={() => { if (!openLibrary(link)) setBad(true); }}>Open library</button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function App() {
  const [lid, setLid] = useState<string | null>(resolveLid);
  if (!lid) return <><Welcome onCreate={() => setLid(createLibrary())} /><UpdatePrompt /></>;
  return <StoreProvider lid={lid}><UIProvider><Shell /></UIProvider></StoreProvider>;
}
