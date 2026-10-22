import { useSyncExternalStore } from 'react';

/**
 * A "visit" is one stretch of using the app: it starts on launch and again after the app
 * has been in the background for 30 minutes. Afterglow asks at most one question per visit.
 */
const VISIT_GAP_MS = 30 * 60_000;
let state = { afterglowDone: false, skipped: new Set<string>() };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let hiddenAt = 0;
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > VISIT_GAP_MS) { state = { afterglowDone: false, skipped: new Set() }; emit(); }
  });
}

export function useVisit() {
  const s = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
  return {
    ...s,
    finishAfterglow: () => { state = { ...state, afterglowDone: true }; emit(); },
    skip: (readId: string) => { state = { afterglowDone: true, skipped: new Set([...state.skipped, readId]) }; emit(); },
  };
}

