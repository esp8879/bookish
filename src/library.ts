const LID_KEY = 'books.lid';
const LID_CHARS = '[A-Za-z0-9_-]{24,}';
const PATH_RE = new RegExp(`^/l/(${LID_CHARS})`);

export function generateLid(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode etc. */ }
}

/** Extract a library id from a full link or a bare path. */
export function lidFromUrl(url: string): string | null {
  try {
    return PATH_RE.exec(new URL(url, location.origin).pathname)?.[1] ?? null;
  } catch { return null; }
}

export const libraryPath = (lid: string) => `/l/${lid}`;
export const libraryUrl = (lid: string) => `${location.origin}${libraryPath(lid)}`;

/**
 * The library id is the secret and lives in the URL PATH (/l/<id>) so that
 * "Add to Home Screen" on iOS, which keeps the page URL, always launches into the
 * library even though a home-screen app has its own separate storage.
 * Priority: URL, then this device's saved id. Returns null if neither exists.
 */
export function resolveLid(): string | null {
  const lid = lidFromUrl(location.href) ?? safeGet(LID_KEY);
  if (!lid || lid.length < 24) return null;
  safeSet(LID_KEY, lid);
  if (location.pathname !== libraryPath(lid)) history.replaceState(null, '', libraryPath(lid));
  return lid;
}

export function createLibrary(): string {
  const lid = generateLid();
  safeSet(LID_KEY, lid);
  history.replaceState(null, '', libraryPath(lid));
  return lid;
}

/** Switch this device to a library link and reload so listeners restart. */
export function openLibrary(link: string): boolean {
  const lid = lidFromUrl(link.trim());
  if (!lid) return false;
  safeSet(LID_KEY, lid);
  location.href = libraryPath(lid);
  return true;
}

export function forgetLibrary() {
  try { localStorage.removeItem(LID_KEY); } catch { /* ignore */ }
}
