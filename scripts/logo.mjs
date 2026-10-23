// Renders the README logo (a dictionary entry for book·ish) in Literata, light and dark, at 2x.
// Run from the repo root:  npm i --no-save playwright-core && node scripts/logo.mjs
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';

const font = (f) => `data:font/woff2;base64,${readFileSync(`public/fonts/${f}`).toString('base64')}`;
const themes = {
  light: { ink: '#2B2520', muted: '#7A6F63', green: '#3F5B4A', rule: '#D9D0C1' },
  dark: { ink: '#EDE5D6', muted: '#A09481', green: '#8FB39C', rule: '#3A332B' },
};

const html = (t) => `<!doctype html><html><head><style>
  @font-face { font-family: L; font-weight: 200 900; src: url(${font('literata.woff2')}) format('woff2'); }
  @font-face { font-family: L; font-style: italic; font-weight: 200 900; src: url(${font('literata-italic.woff2')}) format('woff2'); }
  html, body { margin: 0; background: transparent; }
  #logo { display: inline-block; padding: 8px 4px 10px; font-family: L, Georgia, serif; color: ${t.ink}; }
  .head { display: flex; align-items: baseline; gap: 22px; }
  .word { font-size: 92px; font-weight: 600; letter-spacing: -0.015em; line-height: 1; }
  .dot { color: ${t.green}; }
  .pron { font-size: 26px; color: ${t.muted}; }
  .pos { font-size: 24px; font-style: italic; color: ${t.muted}; }
  .rule { height: 1px; background: ${t.rule}; margin: 18px 0 14px; width: 100%; }
  ol { margin: 0; padding: 0; list-style: none; font-size: 24px; line-height: 1.5; }
  li { display: flex; gap: 14px; }
  li b { color: ${t.green}; font-weight: 600; min-width: 16px; }
  li span { font-style: italic; }
</style></head><body><div id="logo">
  <div class="head"><span class="word">book<span class="dot">·</span>ish</span><span class="pron">/ˈbʊk·ɪʃ/</span><span class="pos">adj.</span></div>
  <div class="rule"></div>
  <ol>
    <li><b>1</b><span>fond of reading, and of keeping track of it.</span></li>
    <li><b>2</b><span>a little reading log that belongs to you.</span></li>
  </ol>
</div></body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1000, height: 400 }, deviceScaleFactor: 2 });
for (const [name, t] of Object.entries(themes)) {
  await page.setContent(html(t));
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#logo').screenshot({ path: `docs/logo-${name}.png`, omitBackground: true });
  console.log('wrote', `docs/logo-${name}.png`);
}
await browser.close();
