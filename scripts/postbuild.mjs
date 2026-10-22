// Remove start_url from the manifest. iOS "Add to Home Screen" then keeps the page URL,
// which carries the library id (/l/<id>), instead of launching at "/" with no library.
import { readFileSync, writeFileSync } from 'node:fs';
const p = new URL('../dist/manifest.webmanifest', import.meta.url);
const m = JSON.parse(readFileSync(p, 'utf8'));
delete m.start_url;
writeFileSync(p, JSON.stringify(m));
console.log('manifest: start_url removed');
