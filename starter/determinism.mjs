// Renders the same timestamp after jumping around; all hashes for one t must match.
import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(path.resolve(process.argv[2])).href);
await page.evaluate(() => window.__ready);
const grab = (t) => page.evaluate((t) => { window.__renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, t);
const order = [2.0, 3.5, 0.1, 2.0, 1.0, 3.5, 2.0];
const seen = {};
for (const t of order) (seen[t] ??= new Set()).add(createHash('sha256').update(await grab(t)).digest('hex').slice(0, 12));
await browser.close();
let ok = true;
for (const [t, h] of Object.entries(seen)) { console.log(`t=${t}: ${[...h].join(', ')}`); if (h.size > 1) ok = false; }
console.log(ok ? 'DETERMINISTIC' : 'NOT DETERMINISTIC: a frame depends on render history');
process.exit(ok ? 0 : 1);
