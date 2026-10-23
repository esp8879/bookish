import { describe, expect, it } from 'vitest';
import type { Book, Read } from '../../types';
import { titleCase, nameCase } from '../titlecase';
import { daysBetween, fmtDate, fmtLongDay, fmtRange } from '../dates';
import { monthWeeks, yearActivity } from '../activity';
import { history, normalizeBook, queue, rankAt, readingNow, upNext, yearStats } from '../books';
import { sheetsToIncoming, cellDate } from '../spreadsheet';
import { planMerge } from '../importer';
import { parseClippings, matchBook, newHighlights, groupClippings } from '../clippings';
import { fromJSON, toCSV, toJSON, toMarkdown } from '../export';

let n = 0;
const read = (p: Partial<Read>): Read => ({ id: `r${n++}`, status: 'finished', started: null, ended: null, note: '', ...p });
const book = (p: Partial<Book>): Book => ({ id: `b${n++}`, title: 'T', author: 'A', reads: [], rank: null, highlights: [], created_at: n, updated_at: 0, deleted_at: null, ...p });

describe('titleCase', () => {
  it.each([
    ["a children's bible", "A Children's Bible"],
    ['the world for sale', 'The World for Sale'],
    ["dungeon crawler carl 2: carl's doomsday scenario", "Dungeon Crawler Carl 2: Carl's Doomsday Scenario"],
    ['what would you do alone in a cage with nothing but cocaine?', 'What Would You Do Alone in a Cage with Nothing but Cocaine?'],
    ['i who have never known men', 'I Who Have Never Known Men'],
    ['Bobiverse 2: For We Are Many', 'Bobiverse 2: For We Are Many'],
    ['the restaurant at the end of the universe', 'The Restaurant at the End of the Universe'],
    ['We Are Legion (We Are Bob)', 'We Are Legion (We Are Bob)'],
    ['the great depression: a diary', 'The Great Depression: A Diary'],
  ])('%s', (input, out) => expect(titleCase(input)).toBe(out));
  it('names', () => {
    expect(nameCase('claire-louise bennett')).toBe('Claire-Louise Bennett');
    expect(nameCase('James SA Corey')).toBe('James SA Corey');
    expect(nameCase('iain m banks')).toBe('Iain M Banks');
  });
});

describe('dates', () => {
  it('formats', () => {
    expect(fmtDate('2026-01-05', '2026-10-22')).toBe('Jan 5');
    expect(fmtDate('2025-01-05', '2026-10-22')).toBe('Jan 5, 2025');
    expect(fmtDate('2025', '2026-10-22')).toBe('2025');
    expect(fmtRange('2026-01-02', '2026-01-05', '2026-10-22')).toBe('Jan 2 – Jan 5');
    expect(fmtRange('2026-02-22', null, '2026-10-22')).toBe('since Feb 22');
  });
  it('arithmetic across DST', () => {
    expect(daysBetween('2026-03-01', '2026-03-31')).toBe(30);
  });
});

describe('derived lists', () => {
  const reading = book({ title: 'Now', reads: [read({ status: 'reading', started: '2026-10-01' })], rank: 3 });
  const a = book({ title: 'A', rank: 2 });
  const b = book({ title: 'B', rank: 1 });
  const done = book({ title: 'Done', reads: [read({ ended: '2026-01-05' }), read({ status: 'dnf', ended: '2026-05-01' })] });
  const old = book({ title: 'Old', reads: [read({ ended: '2025' })] });
  const lib = [reading, a, b, done, old];
  it('the queue excludes books being read, sorted by rank', () => expect(queue(lib).map((x) => x.title)).toEqual(['B', 'A']));
  it('reading', () => expect(readingNow(lib).map((x) => x.book.title)).toEqual(['Now']));
  it('history newest first, each read separately', () => expect(history(lib).map((x) => x.read.ended)).toEqual(['2026-05-01', '2026-01-05', '2025']));
  it('rankAt', () => {
    const list = upNext(lib);
    expect(rankAt(list, 0)).toBe(0);
    expect(rankAt(list, 1)).toBe(1.5);
    expect(rankAt(list, 2)).toBe(3);
    expect(rankAt([], 0)).toBe(1);
  });
});

describe('year stats', () => {
  it('counts and median', () => {
    const lib = [
      book({ author: 'Egan', reads: [read({ started: '2026-01-08', ended: '2026-01-18' })] }),
      book({ author: 'Egan', reads: [read({ started: '2026-01-18', ended: '2026-01-20' })] }),
      book({ author: 'X', reads: [read({ started: '2026-02-22', ended: '2026-07-16' })] }),
      book({ author: 'Y', reads: [read({ status: 'dnf', started: '2026-08-20', ended: '2026-08-20' })] }),
      book({ author: 'Z', reads: [read({ ended: '2025' })] }),
    ];
    const s = yearStats(lib, 2026);
    expect(s.finished).toHaveLength(3);
    expect(s.dnf).toHaveLength(1);
    expect(s.perMonth[0]).toBe(2);
    expect(s.medianDays).toBe(10);
    expect(s.quickest?.days).toBe(2);
    expect(s.longest?.days).toBe(144);
    expect(yearStats(lib, 2025).undatedFinished).toBe(1);
  });
});

describe('queue', () => {
  const q = Array.from({ length: 8 }, (_, i) => book({ title: `Q${i}`, rank: i + 1 }));
  it('Up Next is the top five of the queue', () => expect(upNext(q).map((b) => b.title)).toEqual(['Q0', 'Q1', 'Q2', 'Q3', 'Q4']));
  it('dragging #7 to #2 puts it between #1 and #2', () => {
    const rest = queue(q).filter((b) => b.id !== q[6].id);
    expect(rankAt(rest, 1)).toBe(1.5);
  });
  it('documents from older builds keep their order', () => {
    expect(normalizeBook({ id: 'x', title: 'Old', pile_rank: 3 })).toMatchObject({ rank: 3 });
    // The two-shelf build: its queue goes after its Up Next.
    expect(normalizeBook({ id: 'y', shelf: 'next', rank: 2 }).rank).toBe(2);
    expect(normalizeBook({ id: 'z', shelf: 'queue', rank: 1 }).rank).toBe(1001);
    expect('shelf' in normalizeBook({ id: 'z', shelf: 'queue', rank: 1 })).toBe(false);
  });
});

describe('spreadsheet import', () => {
  const d = (s: string) => new Date(s + 'T00:00:00Z');
  const sheets = [
    { name: '2026', rows: [
      ['#', 'title', 'author', 'start', 'end', 'notes'],
      [1, "a children's bible", 'lydia millet', d('2026-01-02'), d('2026-01-05'), 'eerie'],
      [15, 'the great depression: a diary', 'benjamin roth', d('2026-05-25'), null, 'probably DNF, a bit repetitive'],
      [28, 'children of memory', 'adrian tchaikovsky', d('2026-10-22'), null, null],
      [29, 'demons of unrest', 'erik larson', null, null, null],
      [30, 'the houseguest and other stories', 'amparo davila', null, null, null],
      [33, null, null, null, null, null],
    ] },
    { name: '2025', rows: [['title', 'author'], ['Train Dreams', 'Denis Johnson'], ['All Fours', 'Miranda July'], ['Train Dreams', 'Denis Johnson']] },
  ];
  const inc = sheetsToIncoming(sheets);
  it('maps rows to statuses', () => {
    expect(inc.map((i) => [i.title, i.reads[0]?.status ?? 'queue'])).toEqual([
      ['Train Dreams', 'finished'], ['All Fours', 'finished'],
      ["A Children's Bible", 'finished'], ['The Great Depression: A Diary', 'dnf'], ['Children of Memory', 'reading'],
      ['Demons of Unrest', 'queue'], ['The Houseguest and Other Stories', 'queue'],
    ]);
    expect(inc[0].reads[0].ended).toBe('2025');
    expect(inc[3].reads[0]).toMatchObject({ started: '2026-05-25', ended: '2026-05-25' });
  });
  it('cell dates', () => {
    expect(cellDate(46024)).toBe('2026-01-02');
    expect(cellDate('1/5/2026')).toBe('2026-01-05');
    expect(cellDate('')).toBeNull();
  });
  it('merge is idempotent and keeps queue order', () => {
    const plan = planMerge([], inc, 1000);
    expect(plan.creates).toHaveLength(7);
    expect(plan.creates.filter((b) => b.rank != null).map((b) => [b.title, b.rank])).toEqual([['Demons of Unrest', 1], ['The Houseguest and Other Stories', 2]]);
    const again = planMerge(plan.creates, inc, 2000);
    expect(again.creates).toHaveLength(0);
    expect(again.updates).toHaveLength(0);
  });
  it('imported books go to the bottom of an existing queue', () => {
    const plan = planMerge([book({ rank: 4 })], [{ title: 'New', author: 'X', reads: [], queue: true }]);
    expect(plan.creates[0].rank).toBe(5);
  });
  it('a re-read merges into the existing book', () => {
    const existing = [book({ title: 'A Visit from the Goon Squad', author: 'Jennifer Egan', reads: [read({ ended: '2019' })] })];
    const plan = planMerge(existing, [{ title: 'A Visit From the Goon Squad', author: 'jennifer egan', reads: [{ status: 'finished', started: '2026-01-08', ended: '2026-01-18', note: '' }] }]);
    expect(plan.creates).toHaveLength(0);
    expect(plan.updates[0].reads).toHaveLength(2);
  });
});

describe('clippings', () => {
  const raw = '﻿Klara and the Sun (Ishiguro, Kazuo)\r\n- Your Highlight on page 12 | Location 180-182 | Added on Monday, February 13, 2026 10:00:00 PM\r\n\r\nThe Sun always has ways to reach us.\r\n==========\r\n'
    + 'Klara and the Sun (Ishiguro, Kazuo)\n- Your Highlight on page 12 | Location 180-184 | Added on Monday, February 13, 2026 10:01:00 PM\n\nThe Sun always has ways to reach us, he said.\n==========\n'
    + 'Klara and the Sun (Ishiguro, Kazuo)\n- Your Bookmark on page 40 | Location 600 | Added on Monday, February 13, 2026 10:05:00 PM\n\n\n==========\n'
    + "Carl's Doomsday Scenario: Dungeon Crawler Carl Book 2 (Matt Dinniman)\n- Your Highlight at location 50-51 | Added on Tuesday, March 10, 2026 8:00:00 AM\n\nGoddamnit, Donut.\n==========\n";
  const clips = parseClippings(raw);
  it('keeps highlights only and collapses edits', () => {
    expect(clips.map((c) => c.text)).toEqual(['The Sun always has ways to reach us, he said.', 'Goddamnit, Donut.']);
    expect(clips[0]).toMatchObject({ author: 'Kazuo Ishiguro', location: 'loc. 180-184', added: '2026-02-13' });
  });
  it('matches titles with series noise', () => {
    const lib = [book({ title: 'Klara and the Sun', author: 'Kazuo Ishiguro' }), book({ title: "Dungeon Crawler Carl 2: Carl's Doomsday Scenario", author: 'Matt Dinniman' }), book({ title: 'Dungeon Crawler Carl', author: 'Matt Dinniman' })];
    const g = groupClippings(lib, clips);
    expect(g[0].match?.title).toBe('Klara and the Sun');
    expect(matchBook(lib, "Carl's Doomsday Scenario: Dungeon Crawler Carl Book 2", 'Matt Dinniman')?.title).toBe("Dungeon Crawler Carl 2: Carl's Doomsday Scenario");
    expect(matchBook(lib, 'Something Else', 'Nobody')).toBeNull();
  });
  it('re-import adds nothing', () => {
    const b = book({ title: 'Klara and the Sun' });
    const first = newHighlights(b, clips.slice(0, 1));
    expect(first).toHaveLength(1);
    expect(newHighlights({ ...b, highlights: first }, clips.slice(0, 1))).toHaveLength(0);
  });
});

describe('export', () => {
  const lib = [book({ title: 'Klara and the Sun', author: 'Kazuo Ishiguro', reads: [read({ started: '2026-02-12', ended: '2026-02-15', note: 'dread, "innocent" narrator' })], highlights: [{ id: 'h1', text: 'Sun', added: '2026-02-13', source: 'manual' }] })];
  it('round-trips JSON', () => expect(fromJSON(toJSON(lib))).toEqual(lib));
  it('rejects foreign JSON', () => expect(fromJSON('{"a":1}')).toBeNull());
  it('CSV escapes', () => expect(toCSV(lib)).toContain('"dread, ""innocent"" narrator"'));
  it('markdown has year, note, highlight', () => {
    const md = toMarkdown(lib);
    expect(md).toContain('## 2026');
    expect(md).toContain('> Sun');
  });
});

describe('year activity', () => {
  const lib = [
    book({ title: 'Ruin', reads: [read({ started: '2025-12-30', ended: '2026-01-03' })] }),
    book({ title: 'Phlebas', reads: [read({ status: 'dnf', started: '2026-01-05', ended: '2026-01-05' })] }),
    book({ title: 'Memory', reads: [read({ status: 'reading', started: '2026-01-09' })] }),
    book({ title: 'Old', reads: [read({ ended: '2025' })] }),
  ];
  const days = yearActivity(lib, 2026, '2026-01-10');
  it('covers Jan 1 to today', () => expect([...days.keys()]).toHaveLength(10));
  it('reading spans clip to the year; finish marks the end day', () => {
    expect(days.get('2026-01-01')?.reading).toEqual(['Ruin']);
    expect(days.get('2026-01-03')?.finished).toEqual(['Ruin']);
    expect(days.get('2026-01-04')?.reading).toEqual([]);
  });
  it('DNF days are reading days, not finishes; current reads run to today', () => {
    expect(days.get('2026-01-05')).toMatchObject({ reading: ['Phlebas'], finished: [] });
    expect(days.get('2026-01-10')?.reading).toEqual(['Memory']);
  });
  it('month weeks: five buckets per month, future ones flagged', () => {
    const m = monthWeeks(lib, 2026, '2026-01-10');
    expect(m).toHaveLength(12);
    expect(m[0]).toHaveLength(5);
    expect(m[1]).toHaveLength(4); // Feb 2026 has 28 days
    expect(m[0][0]).toMatchObject({ from: '2026-01-01', to: '2026-01-07', level: 2, finished: ['Ruin'], future: false });
    expect(m[0][1]).toMatchObject({ to: '2026-01-10', level: 1, reading: ['Memory'] });
    expect(m[0][2].future).toBe(true);
    expect(m[5][0].future).toBe(true);
  });
  it('long day format', () => expect(fmtLongDay('2026-10-22')).toBe('Thursday, October 22'));
});
