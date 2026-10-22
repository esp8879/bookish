import type { Book, Highlight } from '../types';
import { isoDay } from './dates';
import { searchText } from './books';

export interface Clipping {
  /** Title line as the Kindle wrote it, author removed. */
  title: string;
  author: string;
  location?: string;
  /** Location range start, for collapsing edited highlights. */
  start?: number;
  end?: number;
  added: string;
  text: string;
}

/** Stable id for a highlight, from its normalized text. */
export function highlightId(text: string): string {
  const s = searchText(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return 'h' + (h >>> 0).toString(36) + s.length.toString(36);
}

/** "Last, First" → "First Last"; anything else unchanged. */
function flipAuthor(a: string) {
  const m = /^([^,;]+),\s*([^,;]+)$/.exec(a.trim());
  return m ? `${m[2]} ${m[1]}` : a.trim();
}

/**
 * Parse a Kindle "My Clippings.txt". Only highlights are kept (notes and bookmarks are dropped).
 * When a highlight was extended or shortened on the device, the file keeps every version:
 * overlapping highlights in the same book collapse to the most recent one.
 */
export function parseClippings(raw: string): Clipping[] {
  const blocks = raw.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split(/\n?==========\n?/);
  const all: Clipping[] = [];
  for (const block of blocks) {
    const lines = block.replace(/^﻿/, '').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    if (lines.length < 3) continue;
    const head = lines[0].trim();
    const meta = lines[1].trim();
    if (!/highlight|surlignement|markierung|subrayado|evidenziazione/i.test(meta)) continue;
    const text = lines.slice(2).join('\n').trim();
    if (!text) continue;
    const am = /^(.*)\(([^()]*)\)\s*$/.exec(head);
    const title = (am ? am[1] : head).trim();
    const author = am ? flipAuthor(am[2]) : '';
    const loc = /(?:location|loc\.?|position)\s+([\d-]+)/i.exec(meta) ?? /page\s+([\d-]+)/i.exec(meta);
    const [start, end] = (loc?.[1] ?? '').split('-').map(Number);
    const addedRaw = /added on\s+(?:\w+,\s*)?(.+)$/i.exec(meta)?.[1];
    const t = addedRaw ? Date.parse(addedRaw) : NaN;
    all.push({
      title, author, text,
      location: loc ? `${/page/i.test(loc[0]) ? 'p.' : 'loc.'} ${loc[1]}` : undefined,
      start: Number.isFinite(start) ? start : undefined,
      end: Number.isFinite(end) ? end : Number.isFinite(start) ? start : undefined,
      added: isNaN(t) ? isoDay(new Date()) : isoDay(new Date(t)),
    });
  }
  // Later entries win over earlier overlapping ones in the same book.
  const kept: Clipping[] = [];
  for (let i = all.length - 1; i >= 0; i--) {
    const c = all[i];
    const dup = kept.some((k) => k.title === c.title && (
      (c.start != null && k.start != null && c.start <= k.end! && k.start <= c.end!) ||
      searchText(k.text).includes(searchText(c.text))
    ));
    if (!dup) kept.push(c);
  }
  return kept.reverse();
}

const mainTitle = (t: string) => searchText(t.replace(/\([^)]*\)/g, '').split(/[:;]/)[0]);
const lastName = (a: string) => searchText(a).split(' ').pop() ?? '';

/** Best library match for a Kindle title, or null. Kindle titles often carry series and subtitle noise. */
export function matchBook(books: Book[], title: string, author: string): Book | null {
  const t = searchText(title), mt = mainTitle(title), ln = lastName(author);
  let best: { b: Book; score: number } | null = null;
  for (const b of books) {
    const bt = searchText(b.title), bmt = mainTitle(b.title);
    let score = 0;
    if (bt === t) score = 100;
    else if (bmt && bmt === mt) score = 80;
    else if (t.includes(bmt) && bmt.length >= 6) score = 60;
    else if (bt.includes(mt) && mt.length >= 6) score = 60;
    else continue;
    if (ln && lastName(b.author) === ln) score += 20;
    else if (ln && b.author) score -= 30;
    if (score >= 50 && (!best || score > best.score)) best = { b, score };
  }
  return best?.b ?? null;
}

export interface ClippingGroup { title: string; author: string; clippings: Clipping[]; match: Book | null }

export function groupClippings(books: Book[], clips: Clipping[]): ClippingGroup[] {
  const groups = new Map<string, ClippingGroup>();
  for (const c of clips) {
    const key = `${c.title}|${c.author}`;
    let g = groups.get(key);
    if (!g) { g = { title: c.title, author: c.author, clippings: [], match: matchBook(books, c.title, c.author) }; groups.set(key, g); }
    g.clippings.push(c);
  }
  return [...groups.values()];
}

/** Highlights from these clippings that the book doesn't already have. */
export function newHighlights(book: Book, clips: Clipping[]): Highlight[] {
  const have = new Set(book.highlights.map((h) => h.id));
  const out: Highlight[] = [];
  for (const c of clips) {
    const id = highlightId(c.text);
    if (have.has(id)) continue;
    have.add(id);
    out.push({ id, text: c.text, location: c.location, added: c.added, source: 'clippings' });
  }
  return out;
}
