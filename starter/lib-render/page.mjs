// Opens a kit page in system Chrome and reads frames and audio out of it.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export async function openPage(file) {
  const browser = await chromium.launch({
    channel: 'chrome', // system Chrome: the Playwright-bundled shell may be missing or lack GPU
    args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('page error:', e.message); process.exit(1); });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error(`page ${m.type()}: ${m.text()}`); });
  // ?export=1 keeps the preview player (lib/player.js) switched off.
  await page.goto(pathToFileURL(path.resolve(file)).href + '?export=1');
  await page.evaluate(() => window.__ready);
  const meta = await page.evaluate(() => {
    const c = document.getElementById('c');
    if (!c) throw new Error('page has no <canvas id="c">');
    if (typeof window.__renderFrame !== 'function') throw new Error('page has no window.__renderFrame(t)');
    return {
      width: c.width, height: c.height,
      duration: Number(window.DURATION), fps: Number(window.FPS) || 30,
      hasScore: typeof window.scoreSound === 'function' && !!window.SOUND,
    };
  });
  if (!(meta.duration > 0)) throw new Error('page must set window.DURATION (seconds)');
  return { browser, page, meta };
}

// The GPU string tells you whether Chrome is drawing on the GPU or in software (SwiftShader).
export async function gpuName(page) {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return 'no WebGL';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
}

// Draws frame t and returns the PNG bytes. `label` stamps a small time code in a corner (for sheets).
export async function grabPng(page, t, label = false) {
  const b64 = await page.evaluate(({ t, label }) => {
    window.__renderFrame(t);
    let c = document.getElementById('c');
    if (label) {
      const copy = document.createElement('canvas');
      copy.width = c.width; copy.height = c.height;
      const x = copy.getContext('2d'), s = Math.max(1, c.width / 1920);
      x.drawImage(c, 0, 0);
      x.font = `${Math.round(40 * s)}px Menlo, monospace`;
      const txt = `${t.toFixed(2)}s`, w = x.measureText(txt).width;
      x.fillStyle = 'rgba(0,0,0,0.65)'; x.fillRect(0, 0, w + 32 * s, 60 * s);
      x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText(txt, 16 * s, 30 * s);
      c = copy;
    }
    return c.toDataURL('image/png').split(',')[1];
  }, { t, label });
  return Buffer.from(b64, 'base64');
}

// Renders window.scoreSound through SOUND.renderOffline inside the page and returns WAV bytes.
// The samples come back in base64 chunks so long videos do not hit message-size limits.
export async function pageAudioWav(page, seconds, { voiceover = false, sampleRate = 48000 } = {}) {
  const size = await page.evaluate(async ({ seconds, voiceover, sampleRate }) => {
    const pcm = await window.SOUND.renderOffline(window.scoreSound, seconds, sampleRate, { voiceover });
    let peak = 0;
    for (let i = 0; i < pcm.length; i++) { const a = Math.abs(pcm[i]); if (a > peak) peak = a; }
    window.__wav = window.SOUND.toWav(pcm, sampleRate);
    window.__wavPeak = peak;
    return window.__wav.length;
  }, { seconds, voiceover, sampleRate });
  const CHUNK = 4 << 20, parts = [];
  for (let off = 0; off < size; off += CHUNK) {
    const b64 = await page.evaluate(({ off, n }) => {
      const bytes = window.__wav.subarray(off, off + n);
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(s);
    }, { off, n: CHUNK });
    parts.push(Buffer.from(b64, 'base64'));
  }
  const peak = await page.evaluate(() => { const p = window.__wavPeak; delete window.__wav; return p; });
  return { wav: Buffer.concat(parts), peak };
}
