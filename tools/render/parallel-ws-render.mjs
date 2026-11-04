#!/usr/bin/env node
/**
 * High-throughput multi-worker WebSocket renderer for Canvas2D and WebGL2/Three.js scenes.
 *
 * Combines:
 *  - Multi-worker headless Chrome GPU capture (`--workers N`, `--chunk K`) with in-order
 *    frame reassembly, bounded RAM reorder buffer (`--mem-gb`), and disk spool overflow (`--spool-gb`)
 *    from the `which-one-of-you` / `all-signal` 1080p60 pipeline.
 *  - RFC 6455 WebSocket continuation-frame reassembly (`FIN=0` + `opcode=0x00`) from the
 *    `crumbs-in-the-kernel` raymarch renderer so >128 KB JPEG/raw frames are never truncated by Chromium.
 *  - Sub-frame shutter motion blur (`--samples N` or `--shutter 0.5`) when the page exposes
 *    `window.__pdoom.still(t, samples, shutter)` or falls back to `window.__renderFrame(t)`.
 *  - Cut-boundary contact sheets (`--cuts` renders 4 frames around every boundary: -0.1s, -1/fps, +1/fps, +0.1s).
 *
 * Usage:
 *   node tools/render/parallel-ws-render.mjs <page.html|url> --out /abs/out.mp4
 *        [--fps 60] [--from 0] [--to DUR] [--workers 3] [--chunk 8] [--audio /abs/song.wav]
 *        [--crf 18] [--preset medium] [--tune grain] [--samples 1] [--shutter 0.5]
 *
 *   node tools/render/parallel-ws-render.mjs <page.html|url> --cuts /abs/cuts-sheet.jpg [--fps 60]
 */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from '../../starter/node_modules/playwright/index.mjs';

const argv = process.argv.slice(2);
const target = argv[0];
if (!target || target === '--help' || target === '-h') {
  console.log(`Usage:
  node tools/render/parallel-ws-render.mjs <page.html|url> --out /abs/out.mp4
       [--fps 60] [--from 0] [--to DUR] [--workers 2] [--chunk 8] [--audio /abs/audio.wav]
       [--crf 18] [--preset medium] [--tune grain] [--samples 1] [--shutter 0.5]
  node tools/render/parallel-ws-render.mjs <page.html|url> --cuts /abs/cuts-sheet.png [--fps 60]`);
  process.exit(target ? 0 : 2);
}

const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const flag = (k) => argv.includes(`--${k}`);

const pageUrl = target.startsWith('http://') || target.startsWith('https://')
  ? target
  : pathToFileURL(path.resolve(target)).href;

/**
 * Minimal RFC 6455 WebSocket server with full continuation-frame (`FIN=0`, `opcode=0x00`)
 * reassembly so >128 KB frames split by Chromium are never truncated.
 */
function startWsServer(onBinaryMessage, onClose) {
  return new Promise((resolve) => {
    const sockets = new Map();
    const srv = createServer();
    srv.on('upgrade', (req, socket) => {
      const key = req.headers['sec-websocket-key'];
      const wId = Number(new URL(req.url, 'http://localhost').searchParams.get('w') ?? 0);
      const accept = createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
      );
      socket.setNoDelay(true);
      sockets.set(wId, socket);

      let rxBuf = Buffer.alloc(0);
      let fragChunks = [];
      let fragOpcode = 0;

      socket.on('data', (chunk) => {
        rxBuf = Buffer.concat([rxBuf, chunk]);
        while (rxBuf.length >= 2) {
          const b0 = rxBuf[0], b1 = rxBuf[1];
          const fin = (b0 & 0x80) !== 0;
          const opcode = b0 & 0x0f;
          const masked = (b1 & 0x80) !== 0;
          let len = b1 & 0x7f;
          let offset = 2;
          if (len === 126) {
            if (rxBuf.length < 4) return;
            len = rxBuf.readUInt16BE(2);
            offset = 4;
          } else if (len === 127) {
            if (rxBuf.length < 10) return;
            len = Number(rxBuf.readBigUInt64BE(2));
            offset = 10;
          }
          const maskLen = masked ? 4 : 0;
          if (rxBuf.length < offset + maskLen + len) return;
          const payload = Buffer.from(rxBuf.subarray(offset + maskLen, offset + maskLen + len));
          if (masked) {
            const mask = rxBuf.subarray(offset, offset + 4);
            for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
          }
          rxBuf = rxBuf.subarray(offset + maskLen + len);

          if (opcode === 0x08) { socket.end(); return; }
          if (opcode === 0x01 || opcode === 0x02) {
            if (fin) {
              if (opcode === 0x02) onBinaryMessage(wId, payload);
            } else {
              fragOpcode = opcode;
              fragChunks = [payload];
            }
          } else if (opcode === 0x00 && fragChunks.length > 0) {
            fragChunks.push(payload);
            if (fin) {
              const full = Buffer.concat(fragChunks);
              const op = fragOpcode;
              fragChunks = [];
              fragOpcode = 0;
              if (op === 0x02) onBinaryMessage(wId, full);
            }
          }
        }
      });
      socket.on('close', () => onClose?.(wId));
    });

    function sendText(wId, str) {
      const sock = sockets.get(wId);
      if (!sock || sock.destroyed) return;
      const body = Buffer.from(String(str), 'utf8');
      const hdr = Buffer.alloc(body.length < 126 ? 2 : 4);
      hdr[0] = 0x81;
      if (body.length < 126) {
        hdr[1] = body.length;
      } else {
        hdr[1] = 126;
        hdr.writeUInt16BE(body.length, 2);
      }
      sock.write(Buffer.concat([hdr, body]));
    }

    srv.listen(0, '127.0.0.1', () => {
      resolve({
        port: srv.address().port,
        sendText,
        close: () => {
          for (const s of sockets.values()) s.destroy();
          srv.close();
        },
      });
    });
  });
}

async function openWorkerPage() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: !flag('headed'),
    args: [
      '--use-angle=metal',
      '--enable-gpu',
      '--enable-gpu-rasterization',
      '--ignore-gpu-blocklist',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
  });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push(e.message));
  await page.goto(pageUrl, { waitUntil: 'load' });
  await page.evaluate(async () => {
    if (window.__ready) await window.__ready;
    if (document.fonts?.ready) await document.fonts.ready;
  });
  const meta = await page.evaluate(() => {
    const c = document.getElementById('c') || document.querySelector('canvas');
    const p = window.__pdoom;
    return {
      width: p?.width ?? c?.width ?? 1920,
      height: p?.height ?? c?.height ?? 1080,
      duration: Number(p?.duration ?? window.DURATION ?? 4),
      fps: Number(window.FPS ?? 30),
      timeline: p?.timeline ?? (window.TOUR?.beats || []),
    };
  });
  await page.setViewportSize({ width: meta.width, height: meta.height });
  return { browser, page, meta, logs };
}

async function renderCutsSheet(cutsOut) {
  const { browser, page, meta } = await openWorkerPage();
  try {
    const fps = Number(opt('fps', String(meta.fps)));
    const starts = (meta.timeline || []).slice(1).map((b) => Number(b.start)).filter((t) => Number.isFinite(t));
    const times = starts.length
      ? starts.flatMap((s) => [Math.max(0, s - 0.1), Math.max(0, s - 1 / fps), s + 1 / fps, s + 0.1])
      : [0, meta.duration * 0.25, meta.duration * 0.5, meta.duration * 0.75];

    const dataUrl = await page.evaluate(async ({ times, cols }) => {
      const src = document.getElementById('c') || document.querySelector('canvas');
      const cw = 480, ch = Math.round(cw * (src.height / src.width)), pad = 4, lab = 20;
      const rows = Math.ceil(times.length / cols);
      const cv = document.createElement('canvas');
      cv.width = cols * (cw + pad) + pad;
      cv.height = rows * (ch + lab + pad) + pad;
      const c = cv.getContext('2d');
      c.fillStyle = '#181a20';
      c.fillRect(0, 0, cv.width, cv.height);
      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        if (window.__pdoom?.still) window.__pdoom.still(t);
        else window.__renderFrame(t);
        const x = pad + (i % cols) * (cw + pad);
        const y = pad + Math.floor(i / cols) * (ch + lab + pad);
        c.drawImage(src, x, y + lab, cw, ch);
        c.fillStyle = '#e5e7eb';
        c.font = '13px monospace';
        c.fillText(`t=${t.toFixed(3)}s`, x + 4, y + 14);
      }
      return cv.toDataURL('image/png');
    }, { times, cols: 4 });

    mkdirSync(path.dirname(path.resolve(cutsOut)), { recursive: true });
    writeFileSync(cutsOut, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`wrote cut-boundary sheet (${times.length} frames): ${cutsOut}`);
  } finally {
    await browser.close();
  }
}

const cutsOut = opt('cuts');
if (cutsOut) {
  await renderCutsSheet(cutsOut);
  process.exit(0);
}

const outFile = opt('out');
if (!outFile) {
  console.error('--out /abs/output.mp4 is required');
  process.exit(2);
}

const probe = await openWorkerPage();
const { width, height, duration } = probe.meta;
const fps = Number(opt('fps', String(probe.meta.fps || 30)));
const from = Number(opt('from', '0'));
const to = Number(opt('to', String(duration)));
const samples = Number(opt('samples', '1'));
const shutter = Number(opt('shutter', '0.5'));
await probe.browser.close();

const f0 = Math.round(from * fps), f1 = Math.round(to * fps), total = f1 - f0;
const chunk = Math.max(1, Number(opt('chunk', '12')));
const workers = Math.max(1, Math.min(Number(opt('workers', '2')), Math.ceil(total / chunk)));
const audioPath = opt('audio');

mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
const ffArgs = [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', 'pipe:0',
];
if (audioPath && audioPath !== 'none') {
  ffArgs.push('-ss', String(from), '-t', String((total / fps).toFixed(6)), '-i', path.resolve(audioPath));
  ffArgs.push('-map', '0:v:0', '-map', '1:a:0');
}
ffArgs.push(
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709',
  '-c:v', 'libx264', '-preset', opt('preset', 'medium'), '-crf', opt('crf', '18'),
  '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
);
if (opt('tune')) ffArgs.push('-tune', opt('tune'));
if (audioPath && audioPath !== 'none') {
  ffArgs.push('-c:a', 'aac', '-b:a', '256k', '-ar', '48000');
}
ffArgs.push('-frames:v', String(total), '-movflags', '+faststart', path.resolve(outFile));

const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'inherit', 'inherit'] });
const spoolDir = path.join(tmpdir(), `vbc-spool-${process.pid}`);
mkdirSync(spoolDir, { recursive: true });

const waiting = new Map();
const spooled = new Set();
const owed = new Map();
const cap = Math.max(16, Math.floor((Number(opt('mem-gb', '1')) * 1e9) / (width * height * 0.25)));
const spoolCap = Math.max(64, Math.floor((Number(opt('spool-gb', '10')) * 1e9) / (width * height * 0.25)));
const ackCount = new Array(workers).fill(0);
let next = f0, written = 0, cursor = f0, draining = false;
let resolveAll, rejectAll;
const donePromise = new Promise((res, rej) => { resolveAll = res; rejectAll = rej; });
const t0 = performance.now();

let wsServer;
const ack = (wId) => { ackCount[wId]++; wsServer.sendText(wId, String(ackCount[wId])); };
const spoolFile = (n) => path.join(spoolDir, `${n}.jpg`);

function drain() {
  if (draining) return;
  draining = true;
  const step = () => {
    while (waiting.has(next) || spooled.has(next)) {
      let buf = waiting.get(next);
      if (buf) waiting.delete(next);
      else {
        buf = readFileSync(spoolFile(next));
        spooled.delete(next);
        rmSync(spoolFile(next), { force: true });
      }
      const canContinue = ff.stdin.write(buf);
      const wId = owed.get(next);
      if (wId !== undefined) { owed.delete(next); ack(wId); }
      next++; written++;
      if (written % 30 === 0 || written === total) {
        const el = (performance.now() - t0) / 1000;
        process.stdout.write(`\rframe ${written}/${total}  ${(written / el).toFixed(1)} fps`);
      }
      if (written === total) {
        draining = false;
        resolveAll();
        return;
      }
      if (!canContinue) {
        ff.stdin.once('drain', step);
        return;
      }
    }
    draining = false;
  };
  step();
}

wsServer = await startWsServer((wId, payload) => {
  // First 4 bytes = uint32 BE frame number, remainder = JPEG bytes
  if (payload.length < 8) return;
  const frameNum = payload.readUInt32BE(0);
  const jpg = payload.subarray(4);
  if (waiting.size < cap || frameNum === next) {
    waiting.set(frameNum, jpg);
    ack(wId);
  } else if (spooled.size < spoolCap) {
    writeFileSync(spoolFile(frameNum), jpg);
    spooled.add(frameNum);
    ack(wId);
  } else {
    waiting.set(frameNum, jpg);
    owed.set(frameNum, wId);
  }
  drain();
});

const takeChunk = () => {
  if (cursor >= f1) return null;
  const a = cursor;
  cursor = Math.min(f1, a + chunk);
  return [a, cursor];
};

const workerPages = await Promise.all(Array.from({ length: workers }, () => openWorkerPage()));
try {
  await Promise.all(workerPages.map(async ({ page }, wId) => {
    for (let rng = takeChunk(); rng; rng = takeChunk()) {
      await page.evaluate(async ({ a, b, fps, wsUrl, samples, shutter }) => {
        const canvas = document.getElementById('c') || document.querySelector('canvas');
        const ws = new WebSocket(wsUrl);
        ws.binaryType = 'arraybuffer';
        let acked = 0, sent = 0;
        let waiter = null;
        ws.onmessage = (e) => {
          acked = Number(e.data);
          if (waiter) { const w = waiter; waiter = null; w(); }
        };
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

        for (let n = a; n < b; n++) {
          while (sent - acked >= 4) {
            await new Promise((r) => { waiter = r; });
          }
          const t = n / fps;
          if (window.__pdoom?.still) {
            window.__pdoom.still(t, samples, shutter);
          } else {
            window.__renderFrame(t);
          }
          const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.96));
          const ab = await blob.arrayBuffer();
          const msg = new Uint8Array(4 + ab.byteLength);
          new DataView(msg.buffer).setUint32(0, n, false);
          msg.set(new Uint8Array(ab), 4);
          ws.send(msg);
          sent++;
        }
        while (acked < sent) {
          await new Promise((r) => { waiter = r; });
        }
        ws.close();
      }, { a: rng[0], b: rng[1], fps, wsUrl: `ws://127.0.0.1:${wsServer.port}/?w=${wId}`, samples, shutter });
    }
  }));

  await donePromise;
  ff.stdin.end();
  const code = await new Promise((res) => ff.on('close', res));
  if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);
  const el = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(`\n${total} frames in ${el}s (${(total / Number(el)).toFixed(1)} fps, ${workers} workers) -> ${outFile}`);
} finally {
  for (const w of workerPages) await w.browser.close().catch(() => {});
  wsServer.close();
  rmSync(spoolDir, { recursive: true, force: true });
}
