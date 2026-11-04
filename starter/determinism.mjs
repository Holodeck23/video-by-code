// Renders the same timestamps after jumping around; every hash for one t must match.
// Usage: node determinism.mjs <page.html>   (any kit page: reads canvas#c and window.DURATION)
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const file = process.argv[2];
if (!file) { console.error('usage: node determinism.mjs <page.html>'); process.exit(2); }
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => { console.error('page error:', e.message); process.exit(1); });
await page.goto(pathToFileURL(path.resolve(file)).href + '?export=1');
await page.evaluate(() => window.__ready);
const dur = await page.evaluate(() => Number(window.DURATION) || 4);
const grab = (t) => page.evaluate((t) => {
  window.__renderFrame(t);
  return document.getElementById('c').toDataURL('image/png');
}, t);

// Out-of-order visits, including the end, the start and repeats.
const at = (u) => Math.round(u * dur * 1000) / 1000;
const order = [0.5, 0.875, 0.025, 0.5, 0.25, 0.999, 0.875, 0, 0.5, 0.25, 0, 0.999].map(at);
const seen = new Map();
for (const t of order) {
  if (!seen.has(t)) seen.set(t, new Set());
  seen.get(t).add(createHash('sha256').update(await grab(t)).digest('hex').slice(0, 12));
}
await browser.close();
let ok = true;
for (const [t, h] of seen) { console.log(`t=${t}: ${[...h].join(', ')}`); if (h.size > 1) ok = false; }
console.log(ok ? 'DETERMINISTIC' : 'NOT DETERMINISTIC: a frame depends on render history');
process.exit(ok ? 0 : 1);
