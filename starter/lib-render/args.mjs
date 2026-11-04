// Command-line flags for render.mjs (see lib/API.md section 4).
const USAGE = `usage: node render.mjs <page.html> --out out.mp4 [--fps 30] [--from 0] [--to <DURATION>]
                 [--audio none|page|<file.wav>] [--voice narration.wav] [--crf 18]
       node render.mjs <page.html> --stills 1.5,4,9.25 --outdir DIR
       node render.mjs <page.html> --sheet 8 --out sheet.jpg`;

const VALUE_FLAGS = new Set(['out', 'fps', 'from', 'to', 'audio', 'voice', 'crf', 'stills', 'outdir', 'sheet']);

export function parseArgs(argv) {
  const opts = { page: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { console.log(USAGE); process.exit(0); }
    if (a.startsWith('--')) {
      const [name, inline] = a.slice(2).split('=', 2);
      if (!VALUE_FLAGS.has(name)) fail(`unknown flag --${name}`);
      const v = inline ?? argv[++i];
      if (v === undefined || v === '' || v.startsWith('--')) fail(`--${name} needs a value`);
      opts[name] = v;
    } else if (!opts.page) opts.page = a;
    else fail(`unexpected argument ${a}`);
  }
  if (!opts.page) fail('missing page.html');
  const num = (k, d) => {
    if (opts[k] === undefined) return d;
    const n = Number(opts[k]);
    if (!Number.isFinite(n)) fail(`--${k} must be a number`);
    return n;
  };
  const out = {
    page: opts.page, out: opts.out, outdir: opts.outdir,
    fps: num('fps', undefined), from: num('from', 0), to: num('to', undefined), crf: num('crf', 18),
    audio: opts.audio, voice: opts.voice,
    stills: opts.stills ? opts.stills.split(',').map((s) => Number(s.trim())) : null,
    sheet: opts.sheet !== undefined ? Math.round(num('sheet')) : null,
  };
  if (out.stills && out.stills.some((t) => !Number.isFinite(t))) fail('--stills takes comma-separated seconds, e.g. 1,2.5,8');
  if (out.stills && !out.outdir) fail('--stills needs --outdir DIR');
  if (out.sheet !== null && (out.sheet < 1 || out.sheet > 64)) fail('--sheet takes 1..64');
  if (!out.stills && !out.out) fail('missing --out');
  if (out.fps !== undefined && out.fps <= 0) fail('--fps must be > 0');
  if (out.from < 0 || (out.to !== undefined && out.to <= out.from)) fail('range must satisfy 0 <= from < to');
  if (out.crf < 0 || out.crf > 51) fail('--crf must be between 0 and 51');
  if (out.stills && out.sheet !== null) fail('--stills and --sheet are separate modes');
  return out;
}

function fail(msg) {
  console.error(`render: ${msg}\n${USAGE}`);
  process.exit(2);
}
