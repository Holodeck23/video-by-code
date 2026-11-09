// Offline renderer: headless Chrome draws frame n at t = from + n / fps; PNGs are piped into ffmpeg.
// Flags: see lib/API.md section 4, or run `node render.mjs --help`.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from './lib-render/args.mjs';
import { openPage, gpuName, grabPng, pageAudioWav } from './lib-render/page.mjs';

const o = parseArgs(process.argv.slice(2));
let browser, page, meta, fps, from, to, tmp;
const encoders = new Set();
let code = 0;
try {
  ({ browser, page, meta } = await openPage(o.page));
  fps = o.fps ?? meta.fps;
  from = o.from; to = o.to ?? meta.duration;
  if (!(from >= 0 && to > from && to <= meta.duration)) die(`range must satisfy 0 <= from < to <= DURATION (${meta.duration})`);
  if (o.stills && o.stills.some(t => t < 0 || t > meta.duration)) die('still timestamps must be within 0..DURATION');
  if (!o.stills && o.sheet === null && Math.round((to - from) * fps) < 1) die('range rounds to zero frames');
  console.log(`page ${meta.width}x${meta.height}, ${meta.duration}s; rendering ${from}..${to}s at ${fps} fps`);
  console.log(`GPU: ${await gpuName(page)}`);
  tmp = mkdtempSync(path.join(tmpdir(), 'vbc-render-'));
  if (o.stills) await stills();
  else if (o.sheet !== null) code = await sheet();
  else code = await video();
} catch (error) {
  console.error(`render: ${error.message}`);
  code = 1;
} finally {
  for (const ff of encoders) {
    ff.stdin.destroy();
    if (!ff.exited) ff.kill('SIGTERM'); // only this invocation's own child encoder
    await ff.done;
  }
  if (browser) await browser.close();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
process.exitCode = code;

// ---------- modes ----------

async function stills() {
  mkdirSync(o.outdir, { recursive: true });
  for (const t of o.stills) {
    const file = path.join(o.outdir, `still-${t.toFixed(2)}s.png`);
    writeFileSync(file, await grabPng(page, t));
    console.log(`wrote ${file}`);
  }
}

async function sheet() {
  const n = o.sheet, cols = Math.min(n, Math.ceil(Math.sqrt(n * 1.2))), rows = Math.ceil(n / cols);
  const tileW = meta.width >= meta.height ? 480 : 270;
  const ff = ffmpeg(['-f', 'image2pipe', '-framerate', '1', '-i', '-',
    '-vf', `scale=${tileW}:-2,tile=${cols}x${rows}:padding=6:margin=6:color=0x202020`,
    '-frames:v', '1', '-q:v', '3', o.out]);
  for (let i = 0; i < n; i++) await write(ff, await grabPng(page, from + ((to - from) * (i + 0.5)) / n, true));
  const c = await finish(ff);
  if (c === 0) console.log(`wrote ${o.out} (${cols}x${rows} tiles)`);
  return c;
}

async function video() {
  const frames = Math.round((to - from) * fps), len = frames / fps;
  const audio = await prepareAudio(len);
  const graph = [`[0:v]scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,` +
    `setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv[vout]`];
  const args = ['-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  for (const f of audio.inputs) args.push('-i', f);
  if (audio.graph) graph.push(audio.graph);
  args.push('-filter_complex', graph.join(';'), '-map', '[vout]');
  if (audio.graph) args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', String(o.crf), '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    '-r', String(fps), '-frames:v', String(frames), '-movflags', '+faststart', o.out);

  const ff = ffmpeg(args), t0 = Date.now();
  for (let n = 0; n < frames; n++) {
    await write(ff, await grabPng(page, from + n / fps));
    if ((n + 1) % Math.round(fps * 2) === 0 || n === frames - 1) {
      const s = (Date.now() - t0) / 1000;
      process.stdout.write(`\rframe ${n + 1}/${frames}  ${((n + 1) / s).toFixed(1)} fps`);
    }
  }
  process.stdout.write('\n');
  const c = await finish(ff), s = (Date.now() - t0) / 1000;
  console.log(`${frames} frames in ${s.toFixed(1)} s (${(frames / s).toFixed(1)} fps), ffmpeg exit ${c}${c === 0 ? `, wrote ${o.out}` : ''}`);
  return c;
}

// ---------- audio ----------

// Builds the ffmpeg inputs and an audio filter graph that ends in [aout], exactly `len` seconds long.
async function prepareAudio(len) {
  const mode = o.audio ?? (o.voice && meta.hasScore ? 'page' : 'none');
  const inputs = [];
  if (mode === 'page' || mode === 'bundle') {
    if (!meta.hasScore) die(`--audio ${mode} needs window.scoreSound and lib/sound.js on the page`);
    const { wav, peak } = await pageAudioWav(page, to, { voiceover: !!o.voice });
    const f = path.join(tmp, 'page-sound.wav');
    writeFileSync(f, wav);
    console.log(`page sound: ${to.toFixed(2)} s rendered offline${o.voice ? ' in voiceover mode' : ''}, peak ${(20 * Math.log10(peak || 1e-9)).toFixed(1)} dBFS`);
    inputs.push(f);
  } else if (mode !== 'none') inputs.push(mode);
  if (o.voice) inputs.push(o.voice);
  if (!inputs.length) return { inputs, graph: null };

  // Every track is page-timed: drop the part before --from, then fit to the video length exactly.
  const prep = inputs.map((_, i) => `[${i + 1}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,` +
    `atrim=start=${from},asetpts=PTS-STARTPTS[a${i}]`);
  let mix;
  if (inputs.length === 2) mix = `[a0][a1]amix=inputs=2:normalize=0:duration=longest,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000`;
  else if (o.voice) mix = `[a0]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000`;
  else mix = `[a0]anull`;
  const fit = `apad=whole_dur=${len},atrim=end=${len},asetpts=PTS-STARTPTS[aout]`;
  return { inputs, graph: [...prep, `${mix},${fit}`].join(';') };
}

// ---------- ffmpeg plumbing ----------

function ffmpeg(args) {
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'warning', '-y', ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
  encoders.add(ff);
  ff.done = new Promise((r) => {
    ff.on('error', e => { ff.spawnError = e; });
    ff.on('close', c => { ff.exited = true; r(c ?? 1); });
  });
  ff.stdin.on('error', () => {}); // ffmpeg exiting early is reported through its exit code
  return ff;
}
async function write(ff, buf) {
  if (ff.exited) die(`ffmpeg stopped early (exit ${await ff.done})`);
  if (!ff.stdin.write(buf)) {
    let onDrain;
    await Promise.race([new Promise(r => { onDrain = r; ff.stdin.once('drain', onDrain); }), ff.done]);
    ff.stdin.removeListener('drain', onDrain);
  }
  if (ff.exited) die(`ffmpeg stopped early${ff.spawnError ? ': ' + ff.spawnError.message : ` (exit ${await ff.done})`}`);
}
async function finish(ff) {
  ff.stdin.end();
  return ff.done;
}
function die(msg) {
  throw new Error(msg);
}
