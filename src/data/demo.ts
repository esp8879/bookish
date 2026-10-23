import type { Book, Read } from '../types';
import { isoDay } from '../lib/dates';

/** The demo library's id: lives at /demo, entirely in memory, never saved anywhere. */
export const DEMO_ID = 'demo';

const ago = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return isoDay(d); };
let n = 0;
const read = (status: Read['status'], startedAgo: number | null, endedAgo: number | null, note = ''): Read => ({
  id: `demo-r${n++}`, status, started: startedAgo == null ? null : ago(startedAgo), ended: endedAgo == null ? null : ago(endedAgo), note,
});
const book = (title: string, author: string, extra: Partial<Book> = {}): Book => ({
  id: `demo-b${n++}`, title, author, reads: [], rank: null, highlights: [], created_at: n, updated_at: n, deleted_at: null, ...extra,
});

/**
 * Sample library for the demo: public-domain classics, dated relative to today so it always looks current.
 * Rebuilt fresh on every visit.
 */
export function demoBooks(): Book[] {
  n = 0;
  return [
    book('Middlemarch', 'George Eliot', { reads: [read('reading', 11, null)] }),

    book('The Count of Monte Cristo', 'Alexandre Dumas', { rank: 1 }),
    book('Frankenstein', 'Mary Shelley', { rank: 2 }),
    book('The Age of Innocence', 'Edith Wharton', { rank: 3 }),
    book('Dracula', 'Bram Stoker', { rank: 4 }),
    book('North and South', 'Elizabeth Gaskell', { rank: 5 }),
    book('Anna Karenina', 'Leo Tolstoy', { rank: 6 }),
    book('The Brothers Karamazov', 'Fyodor Dostoevsky', { rank: 7 }),
    book('Great Expectations', 'Charles Dickens', { rank: 8 }),

    book('The Great Gatsby', 'F. Scott Fitzgerald', { reads: [read('finished', 24, 19, 'short, sad and glittery. the green light is doing a lot of work and it earns it.')] }),
    book('Pride and Prejudice', 'Jane Austen', {
      reads: [read('finished', 52, 33, 'a re-read. funnier than i remembered, and mr. collins is a menace.')],
      highlights: [
        { id: 'demo-h1', text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', location: 'loc. 1-2', added: ago(51), source: 'clippings' },
        { id: 'demo-h2', text: 'I could easily forgive his pride, if he had not mortified mine.', location: 'loc. 312-313', added: ago(47), source: 'clippings' },
      ],
    }),
    book('Jane Eyre', 'Charlotte Brontë', { reads: [read('finished', 81, 59, 'gothic and stubborn in the best way. the middle drags, the ending lands.')] }),
    book('The Picture of Dorian Gray', 'Oscar Wilde', { reads: [read('finished', 96, 85, 'every other line is a quote. the plot is almost an excuse for the epigrams.')] }),
    book('Little Women', 'Louisa May Alcott', { reads: [read('finished', 131, 102, 'cozier than expected. jo is great, the ending still annoys me.')] }),
    book('The Time Machine', 'H. G. Wells', { reads: [read('finished', 140, 137, 'a quick one between longer books. bleaker than its reputation.')] }),
    book('Wuthering Heights', 'Emily Brontë', { reads: [read('finished', 176, 151, 'everyone is awful and the moors are wonderful.')] }),
    book('Persuasion', 'Jane Austen', { reads: [read('finished', 231, 212, 'quieter austen. the letter scene is worth the whole book.')] }),

    book('Moby-Dick', 'Herman Melville', { reads: [read('dnf', 262, 247, 'the whale anatomy chapters lost me. maybe someday.')] }),
  ];
}
