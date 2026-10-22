import { useEffect, useRef, type ReactNode } from 'react';
import type { PartialDate } from '../types';
import { isFullDate, today } from '../lib/dates';

/** Stop the page behind an overlay from scrolling; counted, since a sheet can open over the book page. */
let locks = 0;
export function useBodyLock() {
  useEffect(() => {
    if (locks++ === 0) document.body.classList.add('locked');
    return () => { if (--locks === 0) document.body.classList.remove('locked'); };
  }, []);
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useBodyLock();
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="sheet-head"><h2>{title}</h2><button className="btn link" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </>
  );
}

/** Section label in the card-catalog style: small caps with a hairline running to the edge. */
export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="label"><span>{children}</span><i />{right}</div>;
}

export function Seg<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}

/** A calendar date. Year-only values (imported) show as such until a day is picked. */
export function DateField({ label, value, onChange, optional }: { label: string; value: PartialDate | null; onChange: (v: PartialDate | null) => void; optional?: boolean }) {
  const yearOnly = value && !isFullDate(value);
  return (
    <Field label={label} hint={yearOnly ? `Only the year is known (${value}). Pick a day to set it.` : undefined}>
      <div className="date-row">
        <input type="date" value={isFullDate(value) ? value : ''} max={today()} onChange={(e) => onChange(e.target.value || (optional ? null : value))} />
        {value !== today() && <button type="button" className="btn small" onClick={() => onChange(today())}>Today</button>}
        {optional && value && <button type="button" className="btn small" onClick={() => onChange(null)}>Clear</button>}
      </div>
    </Field>
  );
}

/** Textarea that grows with its content. */
export function Grow({ value, onChange, placeholder, autoFocus, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} className="note-input" rows={rows} value={value} placeholder={placeholder} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} />;
}
