const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'into', 'nor', 'of', 'on', 'or', 'over', 'the', 'to', 'up', 'via', 'vs', 'with']);

/** Uppercase the first letter of each hyphen part; keep words that already carry inner capitals ("SA", "McCarthy"). */
function capWord(w: string): string {
  if (/[A-Z]/.test(w.slice(1))) return w;
  return w.split('-').map((p) => p.replace(/^([^A-Za-zÀ-ÿ]*)([a-zà-ÿ])/, (_, pre: string, c: string) => pre + c.toUpperCase())).join('-');
}

/** Title Case: small words stay lowercase unless first, last, or after a colon or dash. */
export function titleCase(s: string): string {
  const words = s.trim().replace(/\s+/g, ' ').split(' ');
  return words.map((w, i) => {
    if (!w) return w;
    const bare = w.toLowerCase().replace(/[^a-z']/g, '');
    const prev = words[i - 1] ?? '';
    const boundary = i === 0 || i === words.length - 1 || /[:—–-]$/.test(prev) || w.startsWith('(');
    if (bare === 'i') return w.replace('i', 'I');
    if (!boundary && SMALL.has(bare) && w === w.toLowerCase()) return w;
    if (!boundary && SMALL.has(bare)) return w.toLowerCase();
    return capWord(w);
  }).join(' ');
}

/** Names: capitalize each part, keep existing inner capitals and initials. */
export function nameCase(s: string): string {
  return s.trim().replace(/\s+/g, ' ').split(' ').map(capWord).join(' ');
}
