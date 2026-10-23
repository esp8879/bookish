import { useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import { libraryUrl } from '../library';
import { toCSV, toJSON, toMarkdown } from '../lib/export';
import { pickFile, saveFile } from '../lib/files';
import { today } from '../lib/dates';
import { BackToNow, Label } from '../components/common';
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
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const url = libraryUrl(store.lid);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast('Link copied'); }
    catch { toast('Copy failed. Select the link and copy it by hand.'); }
  };
  const runImport = async (kind: ImportKind) => {
    const file = await pickFile(ACCEPT[kind]);
    if (!file) return;
    setBusy(true);
    try {
      const r = await readImport(kind, file, store.books);
      if (typeof r === 'string') toast(r); else setImporting(r);
    } catch (e) {
      console.error(e);
      toast("Couldn't read that file.");
    } finally { setBusy(false); }
  };
  const exp = async (fmt: 'json' | 'csv' | 'md') => {
    const name = `books-${today()}.${fmt}`;
    const content = fmt === 'json' ? toJSON(store.books) : fmt === 'csv' ? toCSV(store.books) : toMarkdown(store.books);
    const type = fmt === 'json' ? 'application/json' : fmt === 'csv' ? 'text/csv' : 'text/markdown';
    const r = await saveFile(name, content, type);
    if (r === 'downloaded') toast(`Saved ${name}`);
  };

  return (
    <main className="screen drawer">
      <BackToNow onBack={() => setTab('now')} />
      <header className="masthead"><h1 className="wordmark">Settings</h1></header>

      <section>
        <Label>Your library link</Label>
        <p className="small">This link is the key to your library. There's no account and no password: anyone with the link can read and change it. Keep a copy somewhere safe, like your password manager.</p>
        <div className="link-box"><code>{url}</code></div>
        <button className="btn block" onClick={() => void copy()}>Copy link</button>
        <p className="muted small">On iPhone, open the link in Safari, then Share → Add to Home Screen. Installed, it opens and works with no signal.</p>
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
          <button className="btn block" disabled={busy} onClick={() => void runImport('clippings')}>Kindle highlights (My Clippings.txt)</button>
          <button className="btn block" disabled={busy} onClick={() => void runImport('spreadsheet')}>Spreadsheet (.xlsx)</button>
          <button className="btn block" disabled={busy} onClick={() => void runImport('json')}>Restore from a JSON export</button>
        </div>
        <p className="muted small">Importing the same file twice changes nothing.</p>
      </section>

      <section>
        <Label>About</Label>
        <p className="muted small">{store.books.length} books · {store.online ? (store.pending ? 'syncing' : 'synced') : 'offline'} · build {__BUILD__}</p>
      </section>

      <section>
        <Label>Delete library</Label>
        <p className="muted small">Permanently deletes every book, note and highlight, on every device. Export first. Type <strong>delete</strong> to confirm.</p>
        <div className="btn-row">
          <input type="text" value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} placeholder="delete" autoCapitalize="none" />
          <button className="btn danger" disabled={confirmDelete.trim().toLowerCase() !== 'delete' || !store.online} onClick={() => void store.deleteLibrary()}>Delete</button>
        </div>
        {!store.online && <p className="muted small">Needs a connection.</p>}
      </section>

      {importing && <ImportConfirm state={importing} onClose={() => setImporting(null)} />}
    </main>
  );
}
