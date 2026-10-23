import { useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { DEMO_PATH, libraryUrl, openLibrary, startNewLibrary } from '../library';
import { toCSV, toJSON, toMarkdown } from '../lib/export';
import { pickFile, saveFile } from '../lib/files';
import { today } from '../lib/dates';
import { Label, ScreenHeader, Wordmark } from '../components/common';
import { ImportConfirm, readImport, type ImportKind, type ImportState } from '../components/Imports';

const ACCEPT: Record<ImportKind, string> = {
  spreadsheet: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  clippings: '.txt,text/plain',
  json: '.json,application/json',
};

export function Settings() {
  const store = useStore();
  const { toast, setTab } = useUI();
  const [importing, setImporting] = useState<ImportState | null>(null);
  /** Which import is reading its file, or that the library is being deleted: shown on the button itself. */
  const [busy, setBusy] = useState<ImportKind | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [switching, setSwitching] = useState<'new' | 'open' | null>(null);
  const [link, setLink] = useState('');
  const [badLink, setBadLink] = useState(false);
  const url = libraryUrl(store.lid);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copied'); }
    catch { toast('Copy failed. Select the link and copy it by hand.'); }
  };
  const runImport = async (kind: ImportKind) => {
    const file = await pickFile(ACCEPT[kind]);
    if (!file) return;
    setBusy(kind);
    try {
      const r = await readImport(kind, file, store.books);
      if (typeof r === 'string') toast(r); else setImporting(r);
    } catch (e) {
      console.error(e);
      toast("Couldn't read that file.");
    } finally { setBusy(null); }
  };
  const exp = async (fmt: 'json' | 'csv' | 'md') => {
    const name = `bookish-${today()}.${fmt}`;
    const content = fmt === 'json' ? toJSON(store.books) : fmt === 'csv' ? toCSV(store.books) : toMarkdown(store.books);
    const type = fmt === 'json' ? 'application/json' : fmt === 'csv' ? 'text/csv' : 'text/markdown';
    const r = await saveFile(name, content, type);
    if (r === 'downloaded') toast(`Saved ${name}`);
  };

  return (
    <main className="screen drawer settings">
      <ScreenHeader back={{ label: 'Home', onClick: () => setTab('now') }}><h1 className="wordmark">Settings</h1></ScreenHeader>

      {store.demo ? (
        <section>
          <Label>This is a demo</Label>
          <p className="small">Everything here is sample data, kept in this browser tab only. Nothing you change is saved, and it resets when you leave.</p>
          <button className="btn primary block" onClick={startNewLibrary}>Start your own library</button>
          <p className="muted small">It starts empty, with its own private link. No account needed.</p>
        </section>
      ) : <>
      <section>
        <Label>Your library link</Label>
        <p className="small">The link is the key: no account, no password, and anyone who has it can read and change your library. Keep a copy somewhere safe.</p>
        <div className="link-box"><code>{url}</code></div>
        <button className="btn block" onClick={() => void copy()}>Copy link</button>
        <p className="muted small">On iPhone: open it in Safari, then Share → Add to Home Screen. Installed, it works with no signal.</p>
      </section>

      <section>
        <Label>Export</Label>
        <p className="muted small">Your data, in files you keep. JSON has everything and can be restored here.</p>
        <div className="btn-row">
          <button className="btn" onClick={() => void exp('json')}>JSON</button>
          <button className="btn" onClick={() => void exp('csv')}>CSV</button>
          <button className="btn" onClick={() => void exp('md')}>Markdown</button>
        </div>
      </section>

      <section>
        <Label>Import</Label>
        <div className="stack">
          <button className="btn block" disabled={!!busy} onClick={() => void runImport('clippings')}>{busy === 'clippings' ? 'Reading file…' : 'Kindle highlights (My Clippings.txt)'}</button>
          <button className="btn block" disabled={!!busy} onClick={() => void runImport('spreadsheet')}>{busy === 'spreadsheet' ? 'Reading file…' : 'Spreadsheet (.xlsx)'}</button>
          <button className="btn block" disabled={!!busy} onClick={() => void runImport('json')}>{busy === 'json' ? 'Reading file…' : 'Restore from a JSON export'}</button>
        </div>
        <p className="muted small">Importing the same file twice changes nothing.</p>
      </section>

      {/* Leaving a library is safe: nothing is deleted, and its link opens it again. */}
      <section>
        <Label>Other libraries</Label>
        <p className="muted small">This device opens the library above. Switching doesn't delete anything: keep its link and you can come back.</p>
        {switching === 'new' ? (
          <div className="stack">
            <p className="small">Copied your link? A new library starts empty.</p>
            <div className="btn-row">
              <button className="btn" onClick={() => setSwitching(null)}>Cancel</button>
              <button className="btn primary" onClick={startNewLibrary}>Start new library</button>
            </div>
          </div>
        ) : switching === 'open' ? (
          <div className="stack">
            <input type="text" inputMode="url" placeholder="https://…/l/…" aria-label="Library link" value={link} onChange={(e) => { setLink(e.target.value); setBadLink(false); }} autoFocus />
            {badLink && <p className="red small">That doesn't look like a library link.</p>}
            <div className="btn-row">
              <button className="btn" onClick={() => { setSwitching(null); setLink(''); }}>Cancel</button>
              <button className="btn primary" disabled={!link.trim()} onClick={() => { if (!openLibrary(link)) setBadLink(true); }}>Open</button>
            </div>
          </div>
        ) : (
          <div className="btn-row">
            <button className="btn" onClick={() => setSwitching('open')}>Open another</button>
            <button className="btn" onClick={() => setSwitching('new')}>Start a new one</button>
          </div>
        )}
        <a className="btn link small demo-link" href={DEMO_PATH}>Look around the demo</a>
      </section>
      </>}

      <section>
        <Label>About</Label>
        <Wordmark size="small" />
        <p className="muted small">{store.books.length} books · {store.demo ? 'demo, not saved' : store.online ? (store.pending ? 'syncing' : 'synced') : 'offline'} · build {__BUILD__}</p>
      </section>

      {!store.demo && <section>
        <Label>Delete library</Label>
        <p className="muted small">Permanently deletes every book, note and highlight, on every device. Export first. Type <strong>delete</strong> to confirm.</p>
        <div className="btn-row">
          <input type="text" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder="delete" autoCapitalize="none" />
          <button className="btn danger" disabled={confirmDelete.trim().toLowerCase() !== 'delete' || !store.online || !!busy} onClick={() => { setBusy('delete'); void store.deleteLibrary(); }}>{busy === 'delete' ? 'Deleting…' : 'Delete'}</button>
        </div>
        {!store.online && <p className="muted small">Needs a connection.</p>}
      </section>}

      {importing && <ImportConfirm state={importing} onClose={() => setImporting(null)} />}
    </main>
  );
}
