import { useEffect, useState } from 'react';
import { applyUpdate, updateReady } from './sw';
import { StoreProvider } from './data/store';
import { createLibrary, openLibrary, resolveLid } from './library';
import { UIProvider, useUI, type Tab } from './ui';
import { Home } from './screens/Home';
import { Stats } from './screens/Stats';
import { Queue } from './screens/Queue';
import { Settings } from './screens/Settings';
import { BookPage } from './components/BookPage';
import { AddBook } from './components/AddBook';
import { FinishFlow } from './components/FinishFlow';

const TABS: { id: Tab; label: string }[] = [{ id: 'queue', label: 'Queue' }, { id: 'stats', label: 'Stats' }, { id: 'settings', label: 'Settings' }];

/** The app's book-spines mark: the main screen's tab, set apart from the text tabs. */
function HomeMark({ on }: { on: boolean }) {
  return (
    <svg width="34" height="34" viewBox="0 0 512 512" aria-hidden>
      <rect width="512" height="512" rx="120" className={on ? 'hm-bg on' : 'hm-bg'} />
      <g className="hm-fg"><rect x="140" y="150" width="56" height="226" rx="8" /><rect x="212" y="118" width="64" height="258" rx="8" /><rect x="300" y="148" width="54" height="236" rx="8" transform="rotate(14 327 376)" /></g>
    </svg>
  );
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
        <p className="muted">Update to get the latest version of Books.</p>
        <button className="btn primary block" disabled={updating} onClick={() => { setUpdating(true); void applyUpdate(); }}>{updating ? 'Updating…' : 'Update now'}</button>
      </div>
    </div>
  );
}

function Shell() {
  const { tab, setTab, bookId, adding, finishing } = useUI();
  return (
    <div className="app">
      {tab === 'now' && <Home />}
      {tab === 'queue' && <Queue />}
      {tab === 'stats' && <Stats />}
      {tab === 'settings' && <Settings />}
      {bookId && <BookPage key={bookId} id={bookId} />}
      <nav className="tabbar"><div>
        <button className={`home-tab${tab === 'now' && !bookId ? ' on' : ''}`} aria-label="Now" onClick={() => setTab('now')}><HomeMark on={tab === 'now' && !bookId} /></button>
        {TABS.map((t) => <button key={t.id} className={tab === t.id && !bookId ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div></nav>
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
      <h1 className="wordmark big">Books</h1>
      <p className="lede">A reading log that belongs to you. What you read, what you thought, what's next.</p>
      <p className="muted small">No account. Your library lives at a private link; keep it safe and it opens on any device.</p>
      <div className="stack">
        <button className="btn primary block" onClick={onCreate}>Start a library</button>
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
