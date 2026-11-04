// Offline renderer: headless Chrome draws frame N at t = N / fps, we pipe PNGs into ffmpeg.
// Usage: node render.mjs <scene.html> <audio.wav|none> <out.mp4> [seconds=4] [fps=30]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const [scene, audio, out, secs = '4', fpsArg = '30'] = process.argv.slice(2);
if (!scene || !audio || !out) { console.error('usage: node render.mjs scene.html audio.wav|none out.mp4 [seconds] [fps]'); process.exit(2); }
const fps = +fpsArg, frames = Math.round(+secs * fps);

const browser = await chromium.launch({
  channel: 'chrome', // system Chrome: the Playwright-bundled shell may be missing or lack GPU
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => { console.error('page error:', e.message); process.exit(1); });
await page.goto(pathToFileURL(path.resolve(scene)).href);
await page.evaluate(() => window.__ready);

const inputs = ['-hide_banner', '-loglevel', 'warning', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
if (audio !== 'none') inputs.push('-i', audio);
const enc = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
if (audio !== 'none') enc.push('-c:a', 'aac', '-b:a', '192k');
const ff = spawn('ffmpeg', [...inputs, ...enc, '-frames:v', String(frames), out], { stdio: ['pipe', 'inherit', 'inherit'] });

const t0 = Date.now();
for (let n = 0; n < frames; n++) {
  const b64 = await page.evaluate((t) => { window.__renderFrame(t); return document.getElementById('c').toDataURL('image/png').split(',')[1]; }, n / fps);
  if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
}
ff.stdin.end();
const code = await new Promise((r) => ff.on('close', r));
await browser.close();
console.log(`${frames} frames in ${((Date.now() - t0) / 1000).toFixed(1)} s, ffmpeg exit ${code}`);
process.exit(code);
