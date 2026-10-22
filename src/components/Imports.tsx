import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { useUI } from '../ui';
import type { Book } from '../types';
import { planMerge, type MergePlan } from '../lib/importer';
import { groupClippings, newHighlights, parseClippings, type ClippingGroup } from '../lib/clippings';
import { sheetsToIncoming } from '../lib/spreadsheet';
import { fromJSON } from '../lib/export';
import { Sheet } from './common';

export type ImportKind = 'spreadsheet' | 'clippings' | 'json';

/** Parse a picked file into whatever the confirm sheet needs. */
export async function readImport(kind: ImportKind, file: File, books: Book[]): Promise<ImportState | string> {
  if (kind === 'spreadsheet') {
    const { default: readExcel } = await import('read-excel-file/browser');
    const sheets = await readExcel(file);
    const incoming = sheetsToIncoming(sheets.map((s) => ({ name: s.sheet, rows: s.data as unknown[][] })));
    if (!incoming.length) return 'No books found. The first row of each sheet should name the columns (title, author, start, end, notes).';
    return { kind, plan: planMerge(books, incoming) };
  }
  const text = await file.text();
  if (kind === 'clippings') {
    const clips = parseClippings(text);
    if (!clips.length) return "No highlights found. Is this the Kindle's My Clippings.txt?";
    return { kind, groups: groupClippings(books, clips) };
  }
  const restored = fromJSON(text);
  if (!restored) return "That isn't a Books export file.";
  return { kind, books: restored };
}

export type ImportState =
  | { kind: 'spreadsheet'; plan: MergePlan }
  | { kind: 'clippings'; groups: ClippingGroup[] }
  | { kind: 'json'; books: Book[] };

function SpreadsheetConfirm({ plan, onClose }: { plan: MergePlan; onClose: () => void }) {
  const { applyMerge } = useStore();
  const { toast } = useUI();
  const reading = plan.creates.filter((b) => b.reads.some((r) => r.status === 'reading')).length;
  const pile = plan.creates.filter((b) => b.pile_rank != null).length;
  const nothing = !plan.creates.length && !plan.updates.length;
  return (
    <Sheet title="Import spreadsheet" onClose={onClose}>
      {nothing ? <p>Everything in this file is already in your library.</p> : (
        <>
          <p><strong>{plan.creates.length}</strong> new {plan.creates.length === 1 ? 'book' : 'books'}{plan.updates.length > 0 && <>, <strong>{plan.updates.length}</strong> with new reads</>}.</p>
          <p className="muted small">{reading} reading now, {pile} to Up Next, the rest in your history. Titles are set in Title Case.{plan.skipped > 0 && ` ${plan.skipped} rows were already here and are skipped.`}</p>
          <ul className="list compact">
            {plan.creates.slice(0, 6).map((b) => <li key={b.id}><div className="row-main static"><span className="title">{b.title}</span><span className="author">{b.author}</span></div></li>)}
          </ul>
          {plan.creates.length > 6 && <p className="muted small">…and {plan.creates.length - 6} more.</p>}
          <button className="btn primary block" onClick={() => { void applyMerge(plan); onClose(); toast('Imported'); }}>Import</button>
        </>
      )}
    </Sheet>
  );
}

function ClippingsConfirm({ groups, onClose }: { groups: ClippingGroup[]; onClose: () => void }) {
  const { books, addHighlights } = useStore();
  const { toast } = useUI();
  const sorted = useMemo(() => [...books].sort((a, b) => a.title.localeCompare(b.title)), [books]);
  // Unmatched groups are left out unless a book is picked for them.
  const [picks, setPicks] = useState<Record<number, string>>(() => Object.fromEntries(groups.map((g, i) => [i, g.match?.id ?? ''])));
  const rows = groups.map((g, i) => {
    const target = books.find((b) => b.id === picks[i]);
    return { g, i, target, fresh: target ? newHighlights(target, g.clippings).length : 0 };
  });
  const total = rows.reduce((n, r) => n + r.fresh, 0);
  const save = () => {
    // Several Kindle titles can map to one book: collect per book first.
    const perBook = new Map<string, ClippingGroup['clippings']>();
    for (const r of rows) if (r.target) perBook.set(r.target.id, [...(perBook.get(r.target.id) ?? []), ...r.g.clippings]);
    for (const [id, clips] of perBook) addHighlights(id, newHighlights(books.find((b) => b.id === id)!, clips));
    onClose();
    toast(`Added ${total} ${total === 1 ? 'highlight' : 'highlights'}`);
  };
  return (
    <Sheet title="Kindle highlights" onClose={onClose}>
      <p className="muted small">Each Kindle title is matched to a book in your library. Pick one for anything unmatched, or leave it to skip.</p>
      <ul className="list clip-groups">
        {rows.map(({ g, i, fresh, target }) => (
          <li key={i}>
            <div className="row-main static">
              <span className="title">{g.title}</span>
              <span className="author">{g.clippings.length} {g.clippings.length === 1 ? 'highlight' : 'highlights'}{target && ` · ${fresh ? `${fresh} new` : 'already imported'}`}</span>
              <select value={picks[i]} onChange={(e) => setPicks({ ...picks, [i]: e.target.value })}>
                <option value="">Skip</option>
                {sorted.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
          </li>
        ))}
      </ul>
      <button className="btn primary block" disabled={!total} onClick={save}>{total ? `Add ${total} ${total === 1 ? 'highlight' : 'highlights'}` : 'Nothing new to add'}</button>
    </Sheet>
  );
}

function JSONConfirm({ list, onClose }: { list: Book[]; onClose: () => void }) {
  const { putBooks } = useStore();
  const { toast } = useUI();
  return (
    <Sheet title="Restore from export" onClose={onClose}>
      <p>Restore <strong>{list.length}</strong> books from this file?</p>
      <p className="muted small">Books from the file replace their matching copies here. Books that exist only here stay as they are.</p>
      <button className="btn primary block" onClick={() => { void putBooks(list); onClose(); toast('Restored'); }}>Restore</button>
    </Sheet>
  );
}

export function ImportConfirm({ state, onClose }: { state: ImportState; onClose: () => void }) {
  if (state.kind === 'spreadsheet') return <SpreadsheetConfirm plan={state.plan} onClose={onClose} />;
  if (state.kind === 'clippings') return <ClippingsConfirm groups={state.groups} onClose={onClose} />;
  return <JSONConfirm list={state.books} onClose={onClose} />;
}
