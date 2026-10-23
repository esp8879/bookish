import type { Book, Read } from '../types';
import { isoDay } from '../lib/dates';

/** The demo library's id: lives at /demo, entirely in memory, never saved anywhere. */
export const DEMO_ID = 'demo';

const ago = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return isoDay(d); };
let n = 0;
const read = (status: Read['status'], startedAgo: number | null, endedAgo: number | null, note = ''): Read => ({
  id: `demo-r${n++}`, status, started: startedAgo == null ? null : ago(startedAgo), ended: endedAgo == null ? null : ago(endedAgo), note,
});
/** A highlight made `addedAgo` days ago, from the Kindle unless noted (print books get typed in by hand). */
const hl = (text: string, location: string, addedAgo: number, source: 'clippings' | 'manual' = 'clippings') => ({
  id: `demo-h${n++}`, text, location: location || undefined, added: ago(addedAgo), source,
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
    book('Middlemarch', 'George Eliot', {
      reads: [read('reading', 11, null)],
      highlights: [
        hl('If we had a keen vision and feeling of all ordinary human life, it would be like hearing the grass grow and the squirrel\'s heart beat, and we should die of that roar which lies on the other side of silence.', 'loc. 3104-3106', 3),
      ],
    }),

    book('The Count of Monte Cristo', 'Alexandre Dumas', { rank: 1 }),
    book('Frankenstein', 'Mary Shelley', { rank: 2 }),
    book('The Age of Innocence', 'Edith Wharton', { rank: 3 }),
    book('Dracula', 'Bram Stoker', { rank: 4 }),
    book('North and South', 'Elizabeth Gaskell', { rank: 5 }),
    book('Anna Karenina', 'Leo Tolstoy', { rank: 6 }),
    book('The Brothers Karamazov', 'Fyodor Dostoevsky', { rank: 7 }),
    book('Great Expectations', 'Charles Dickens', { rank: 8 }),

    book('The Great Gatsby', 'F. Scott Fitzgerald', {
      reads: [read('finished', 24, 19, 'short, sad and glittery. the green light is doing a lot of work and it earns it.')],
      highlights: [
        hl('I hope she\'ll be a fool—that\'s the best thing a girl can be in this world, a beautiful little fool.', 'loc. 262-263', 23),
        hl('So we beat on, boats against the current, borne back ceaselessly into the past.', 'loc. 2738-2739', 19),
      ],
    }),
    book('Pride and Prejudice', 'Jane Austen', {
      reads: [read('finished', 52, 33, 'a re-read. funnier than i remembered, and mr. collins is a menace.')],
      highlights: [
        hl('It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', 'loc. 1-2', 51),
        hl('I could easily forgive his pride, if he had not mortified mine.', 'loc. 312-313', 47),
      ],
    }),
    book('Jane Eyre', 'Charlotte Brontë', {
      reads: [read('finished', 81, 59, 'gothic and stubborn in the best way. the middle drags, the ending lands.')],
      highlights: [
        hl('I am no bird; and no net ensnares me: I am a free human being with an independent will, which I now exert to leave you.', 'loc. 4987-4988', 66),
        hl('Reader, I married him.', 'loc. 8930', 59),
      ],
    }),
    book('The Picture of Dorian Gray', 'Oscar Wilde', {
      reads: [read('finished', 96, 85, 'every other line is a quote. the plot is almost an excuse for the epigrams.')],
      highlights: [
        hl('There is only one thing in the world worse than being talked about, and that is not being talked about.', 'loc. 87-88', 95),
        hl('The only way to get rid of a temptation is to yield to it.', 'loc. 311', 94),
      ],
    }),
    book('Little Women', 'Louisa May Alcott', {
      reads: [read('finished', 131, 102, 'cozier than expected. jo is great, the ending still annoys me.')],
      highlights: [hl('I\'m not afraid of storms, for I\'m learning how to sail my ship.', '', 110, 'manual')],
    }),
    book('The Time Machine', 'H. G. Wells', { reads: [read('finished', 140, 137, 'a quick one between longer books. bleaker than its reputation.')] }),
    book('Wuthering Heights', 'Emily Brontë', {
      reads: [read('finished', 176, 151, 'everyone is awful and the moors are wonderful.')],
      highlights: [hl('Whatever our souls are made of, his and mine are the same.', 'loc. 1302', 163)],
    }),
    book('Persuasion', 'Jane Austen', {
      reads: [read('finished', 231, 212, 'quieter austen. the letter scene is worth the whole book.')],
      highlights: [hl('You pierce my soul. I am half agony, half hope.', 'loc. 3417', 213)],
    }),

    book('Moby-Dick', 'Herman Melville', {
      reads: [read('dnf', 262, 247, 'the whale anatomy chapters lost me. maybe someday.')],
      highlights: [
        hl('Call me Ishmael.', 'loc. 1', 262),
        hl('It is not down in any map; true places never are.', 'loc. 1187', 255),
      ],
    }),
  ];
}
