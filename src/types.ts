/** 'YYYY-MM-DD', or 'YYYY' when only the year is known (the imported 2025 sheet). */
export type PartialDate = string;

export type ReadStatus = 'reading' | 'finished' | 'dnf';

export interface Read {
  id: string;
  status: ReadStatus;
  started: PartialDate | null;
  /** Finished or gave-up day; null while reading. */
  ended: PartialDate | null;
  note: string;
}

export interface Highlight {
  /** Hash of the normalized text, so re-importing the same clipping is a no-op. */
  id: string;
  text: string;
  location?: string;
  added: string;
  source: 'clippings' | 'manual';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  reads: Read[];
  /** Position in the queue, ascending (fractional, so a move writes one document); null when not queued. The first UP_NEXT books are Up Next. */
  rank: number | null;
  highlights: Highlight[];
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}
