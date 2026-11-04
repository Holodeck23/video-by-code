# 7. Render exact frames

Export should be a repeatable computation. A slow capture makes the export take longer; it must not change story timing. The included renderer asks the page for each absolute time, captures the canvas as PNG, and pipes the frames to ffmpeg.

This chapter covers the single-worker reference renderer first, then the measured trade-offs of faster capture paths, the multi-worker WebSocket renderer, sub-frame motion blur, chunked resumable renders and the bookkeeping that keeps a long export trustworthy.

## Requirements and setup

The included path needs Node.js, npm, system Google Chrome, ffmpeg with `libx264` and AAC encoding, and Python for verification. Python scripts with dependency metadata can run through `uv`; `beat-grid.py` requires Python below 3.13, so its documented commands select 3.12.

From the kit root:

```bash
node --version
ffmpeg -hide_banner -version
ffprobe -hide_banner -version
npm ci --prefix starter
```

The lockfile pins the browser automation package. The renderer uses system Chrome (`channel: 'chrome'`), not a Playwright-downloaded browser: the bundled headless shell may be missing, or may lack GPU access. Check the runtime section of [the API contract](../lib/API.md) for portability limits. Its graphics flags are tuned for macOS; on another OS, adapt and test the browser launch deliberately.

The Chrome flags both kit renderers pass, and why:

| Flag | Purpose |
|---|---|
| `--use-angle=metal` | Route WebGL through ANGLE's Metal backend on macOS; other systems need a different backend or none |
| `--enable-gpu-rasterization` | Rasterize Canvas2D on the GPU where possible |
| `--ignore-gpu-blocklist` | Stop Chrome from silently falling back to software on an unlisted GPU or driver |
| `--disable-background-timer-throttling` | Headless and background pages otherwise get throttled timers |
| `--disable-renderer-backgrounding` | Keep the renderer process at full priority while not visible |
| `--disable-backgrounding-occluded-windows` | Same, for windows Chrome thinks are hidden (multi-worker renderer) |
| `--autoplay-policy=no-user-gesture-required` | Let offline audio contexts start without a click (reference renderer) |

Do not replace the browser version in the middle of a production without repeating the design-frame and determinism checks. Fonts, browser rendering and GPU drivers can affect pixels even when source code is unchanged.

## Confirm the GPU before estimating anything

Every render time and ETA assumes the browser is drawing on the GPU. A software fallback can be ten times slower and can render WebGL differently. The reference renderer prints the GPU string on every run:

```text
GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M5, Unspecified Version)
```

It reads `UNMASKED_RENDERER_WEBGL` through the `WEBGL_debug_renderer_info` extension. To check a page or another engine by hand:

```js
const gl = document.createElement('canvas').getContext('webgl');
const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
console.log(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl ? gl.getParameter(gl.RENDERER) : 'no WebGL');
```

A string containing `SwiftShader`, `llvmpipe` or `Software` means software rendering. Fix the launch (system Chrome, flags, a real display session on some systems) before measuring throughput. Record the GPU string in the render receipt; it explains pixel differences between machines.

## Set output storage first

Set `PROD` to the durable production folder selected for the work, and create output subfolders there:

```bash
mkdir -p "$PROD/renders/proof" "$PROD/renders/master" "$PROD/qa"
```

Keep render media outside the code repository. Client renders belong in private client storage. A render that finishes in a tool's own output or a temporary directory is copied into `$PROD/renders/<pass-name>/` in the same working session, and the production log records the path. Temporary directories are cleaned, sessions end and the only copy disappears.

Check disk capacity before a large image sequence or heavy 3D render. A raw 1920×1080 RGB frame is about 6.2 MB; at 30 fps, raw data is roughly 187 MB/s, and at 60 fps about 373 MB/s, before overhead. This is a throughput calculation, not a promise about disk usage when piping compressed PNGs. A retained PNG sequence for a 4-minute 1080p60 film is 14,400 files; at a few megabytes each that is tens of gigabytes. Plan where it lives before starting.

## First render a still and sheet

Use an included example:

```bash
node starter/render.mjs examples/narrated-explainer.html --stills 1,9,17,25,33 --outdir "$PROD/qa/stills"
node starter/render.mjs examples/narrated-explainer.html --sheet 12 --out "$PROD/qa/scene-sheet.jpg"
```

`--stills` accepts comma-separated seconds and writes `still-<t>s.png` files. `--sheet` samples evenly spaced moments between `--from` and `--to` and adds diagnostic time labels. A labeled sheet is a review artifact, not final footage.

Look at the images. Confirm correct assets, fonts, aspect ratio, layout and final-state coverage before exporting every frame. A blank or fallback-font still is cheaper to fix now.

The renderer rejects unknown flags (`render: unknown flag --bogus`) and exits non-zero. That matters: in one custom renderer a mistyped `--at` instead of `--t` was silently ignored, and every requested still was rendered at `t = 0`. If you write your own renderer, reject unknown flags, and name output files by the time actually drawn so a wrong time is visible in the filename.

## Run seek determinism

```bash
node starter/determinism.mjs examples/narrated-explainer.html
```

The test visits twelve timestamps out of order (fractions 0.5, 0.875, 0.025, 0.5, 0.25, 0.999, 0.875, 0, 0.5, 0.25, 0, 0.999 of the duration) and requires repeated visits to produce identical image hashes in the same runtime. It prints one line per time and `DETERMINISTIC` or `NOT DETERMINISTIC: a frame depends on render history`, exiting 0 or 1. It detects render-history dependence, such as an advancing random generator or a particle list mutated by earlier frames. It does not promise identical pixels across different browsers, GPUs, fonts or operating systems.

The test samples a small set of times. Add production-specific probes around risky boundaries, textures or simulations. A passing global sample does not prove all scene code is pure.

### Screenshot capture has its own failure

The reference renderer reads pixels from the canvas with `toDataURL`, which returns what the canvas holds right now. Renderers that capture with a browser screenshot instead read what the compositor has painted, which can lag behind. A scene can be perfectly deterministic while screenshots still capture stale browser paint. If your path uses screenshots:

- Wait for fonts (`await document.fonts.ready`) and the page's readiness promise before the first frame.
- After drawing each frame, wait for paint, for example two `requestAnimationFrame` ticks, before taking the screenshot.
- Wait again after any viewport change.
- Test identical timestamps in non-sequential order through the same capture path, not only through the drawing function: draw time A, then B, then A again, and compare A's two hashes.

## Render a representative segment

```bash
node starter/render.mjs examples/narrated-explainer.html --from 7.2 --to 14.4 --fps 30 --audio page --out "$PROD/renders/proof/segment.mp4"
```

Use boundaries on the output frame grid. The renderer uses JavaScript `round((to-from)*fps)` for frame count; an arbitrary fractional duration may round to the nearest frame. Decide this policy before authoring exact output lengths. For a requested length not on the frame grid, choose an explicit integer frame count and document the resulting duration.

The page's canvas determines resolution. Landscape examples use 1920×1080; the vertical example uses 1080×1920. H.264 `yuv420p` output requires even dimensions; the runtime validates them.

## Audio modes

| Command choice | Result |
|---|---|
| No audio flag | Silent output unless a voice option selects the page score default |
| `--audio none` | No page or external effects track |
| `--audio page` | Synthesizes `window.scoreSound` through the sound kit |
| `--audio /absolute/file.wav` | Uses an external page-timed audio track |
| `--voice /absolute/narration.wav` | Mixes the voice, with page effects in voiceover mode when selected |

For the complete narrated example, after preparing the narration as described in [the recipe](recipes/narrated-explainer.md):

```bash
python3 examples/make-narration.py "$PROD/source"
node starter/render.mjs examples/narrated-explainer.html --audio page --voice "$PROD/source/narration.wav" --fps 30 --out "$PROD/renders/proof/narrated.mp4"
```

The helper above uses macOS `say` and writes a 36-second voice fixture plus script, phrase cues and SRT. It refuses to overwrite an existing narration file. On another platform, supply an approved 36-second track with matching cue placement or retime the example to your own take; the helper is a local smoke-test convenience, not a portable TTS dependency or listening approval.

For a vertical example with synthesized page effects:

```bash
node starter/render.mjs examples/vertical-short.html --audio page --fps 30 --out "$PROD/renders/proof/vertical.mp4"
```

On one Apple Silicon machine this printed `page sound: 12.00 s rendered offline, peak -12.4 dBFS` and `360 frames in 2.4 s (148.0 fps)`, and the verifier then measured the effects-only mix at −31.5 LUFS: correct for a sound-effects sketch, far below a web master. A clean render says nothing about whether the loudness is right.

External audio and voice files use the page's full timeline, starting at page time zero. When `--from` is nonzero, the renderer trims every track by that amount. Passing an already trimmed segment will trim it again. Page effects are rendered offline on that same time origin, then trimmed and padded to output duration.

The renderer normalizes voice mixes in one pass and encodes audio as AAC. For an approved premixed track, use `--audio mix.wav` without `--voice`; this preserves its mix processing apart from final encoding and duration fitting. Verify loudness and true peak after encoding.

## What the renderer actually does

1. Starts system Chrome with the flags above and loads the file URL with `?export=1` to suppress the preview player.
2. Waits for `window.__ready` (30-second timeout) and validates the page contract: `canvas#c`, `window.__renderFrame`, a positive `DURATION`, a positive `FPS`, even canvas dimensions.
3. Prints canvas size, duration, range, fps and the GPU string.
4. Generates optional offline sound and reports its peak.
5. Calls `__renderFrame(from + n/fps)` for every output frame and reads the canvas as PNG. Any page error stops the export.
6. Converts the captured frames to limited-range BT.709 `yuv420p` and encodes H.264 at `--crf` (default 18).
7. Fits audio to the selected video interval with `apad`/`atrim` (never `-shortest`), combines it and writes the MP4.
8. Prints frame count, elapsed time, average fps and ffmpeg's exit code; closes the browser and removes its temporary audio files.

It does not provide multi-worker export, chunk resume, raw WebGL capture, image-sequence output or multi-sample blur. Some of those live in `tools/render/` (below); the rest are techniques described in this chapter, not flags to guess.

## Capture methods and measured throughput

How frames leave the browser decides throughput more than any other choice. Measured on Apple Silicon machines across several productions:

| Capture method | Content | Measured throughput | Notes |
|---|---|---|---|
| Browser screenshot per frame, after two animation-frame ticks, JPEG to disk | 3D lyric film, 1080p30 | about 3 fps with 4 workers (8,968 frames in about 51 min) | Simple and inspectable; compositor round trip and screenshot encode dominate |
| Canvas `toDataURL('image/png')` piped to ffmpeg (the kit's reference renderer) | Simple Canvas2D examples, 1080p30 | 146–148 fps, single worker | Short examples: 180 frames in 1.2 s; 360 frames in 2.4 s |
| Canvas `toDataURL('image/jpeg', 0.96)` piped to ffmpeg, 12 frames per call | Vertical Canvas2D shorts, 1080×1920 | about 84–130 fps depending on page weight (84 and 104 fps measured on two finished films) | Batching frames per browser call cuts round trips |
| Canvas PNG pipe with image-heavy frames | Hand-drawn explainer with large painted plates, 1080p30 | 19.6 fps (22,407 frames in 19 min 01 s, 1.53× real time) | Per-frame image compositing, not capture, is the cost |
| Canvas `toBlob` JPEG q0.96 over WebSocket, ack window of 4 | Raymarched WebGL2 pilot, 1080p60 | 36.6 fps (1,800 frames in 49.2 s) | Binary transport avoids base64 overhead |
| WebGL `readPixels` into a fenced pixel buffer, raw RGB from a worker over WebSocket, 3 Chrome workers, x264 `-tune grain` | Full-length 3D lyric films with film grain, 1080p60 | 22.7–32.4 fps overall (15,601 frames in 687.6 s; 11,269 frames in 360 s) | Dark, heavy scenes at the low end, paper scenes at the high end |
| HTML/CSS composition framework, headless capture | 34-second vertical shorts, 1080×1920 at 60 fps | about 23–43 fps | Canvas-heavy pages at the low end |

What each transport trades:

- **PNG** is lossless and easy to inspect, but compressing every frame costs CPU, especially for noisy or grainy frames.
- **JPEG** at quality 0.96 is smaller and faster but is a second lossy step before the video encoder. Keep it for review and pilot exports, or compare a JPEG-path frame with a PNG-path frame before using it for a master.
- **Raw RGB** avoids image compression entirely but moves about 6.2 MB per 1080p frame; the transport, not the GPU, becomes the bottleneck without care. WebGL `readPixels` also returns rows bottom-up; the encoder needs a vertical flip (`vflip`).
- **Base64 data URLs** add a third to the transfer size; binary WebSocket messages or `toBlob` avoid it.

The fastest method on a cheap page is not the fastest on a heavy one. On the kit's narrated example, the reference single-worker PNG path rendered 6 seconds at 30 fps at 146 fps, while the 2-worker WebSocket renderer managed 86 fps on the same range: worker start-up dominates a short, cheap render.

## State ETAs from full-pipeline throughput

Estimate render time from the measured throughput of the whole pipeline (drawing, capture, transport, reordering and encoding together) on a representative heavy section. Never estimate from GPU-only frame times; drawing a frame in 5 ms tells you nothing about how fast it reaches the file.

```text
ETA = total frames / measured end-to-end fps
    = (duration × fps) / measured fps
```

Worked examples at the measured 22.7–32.4 fps for 1080p60 with grain: a 3-minute film is 10,800 frames, so about 6–8 minutes; a 4.3-minute film is 15,601 frames, which took 11 min 28 s at 22.7 fps. Measure on the heaviest section, not the title card. Separate shader warm-up (the first frames are slow while shaders compile) from steady rendering, account for other work competing for the GPU, and add encode, verification and review time to the estimate you give anyone.

## The multi-worker WebSocket renderer

`tools/render/parallel-ws-render.mjs` is the kit's high-throughput path for heavier pages and 60 fps films:

```bash
node tools/render/parallel-ws-render.mjs examples/narrated-explainer.html --out "$PROD/renders/proof/par.mp4" \
  --fps 30 --from 0 --to 6 --workers 2 --chunk 12 --audio "$PROD/source/approved-mix.wav"

# Four frames around every cut boundary, for review
node tools/render/parallel-ws-render.mjs page.html --cuts "$PROD/qa/cuts-sheet.png" --fps 60
```

| Flag | Default | Meaning |
|---|---|---|
| `--out` | required | Absolute output path |
| `--fps` | page `FPS`, else 30 | Output frame rate |
| `--from`, `--to` | 0, `DURATION` | Range in seconds; frame indices are `round(from × fps)` to `round(to × fps)` |
| `--workers` | 2 | Separate Chrome instances, capped at the number of chunks |
| `--chunk` | 12 | Frames handed to a worker at a time |
| `--audio` | none | A page-timed WAV, trimmed with `-ss from -t duration` |
| `--crf`, `--preset`, `--tune` | 18, medium, none | x264 settings; `--tune grain` helps grainy material |
| `--samples`, `--shutter` | 1, 0.5 | Sub-frame motion blur, only if the page defines `window.__still` |
| `--mem-gb`, `--spool-gb` | 1, 10 | RAM reorder buffer, then disk spool for frames that arrive early |
| `--headed` | off | Show the browser windows for debugging |

How it works: each worker draws a frame, encodes the canvas with `toBlob('image/jpeg', 0.96)`, prefixes a 4-byte frame index and sends it over a local WebSocket. At most 4 frames can be unacknowledged per worker, which is the backpressure. The server writes frames to ffmpeg strictly in index order; frames that arrive early wait in the RAM buffer, and spill to a temporary disk spool when RAM is full. ffmpeg converts to limited-range BT.709 `yuv420p` and stops at an exact `-frames:v` count, so a short audio file cannot end the video early. The renderer prints `N frames in S s (F fps, W workers)` at the end; that line is your throughput measurement.

Keep the worker count within measured capacity. More workers compete for the same GPU memory and encoder; three workers was the measured sweet spot for one 1080p60 WebGL film, and one or two is often faster for Canvas2D. Change one variable at a time.

## WebSocket frames larger than 128 KB

Chromium splits a WebSocket message larger than 131,072 bytes (128 KB) into an initial frame with `FIN=0` and the binary opcode `0x02`, followed by continuation frames with opcode `0x00`, the last of which has `FIN=1`. A minimal server that only handles opcode `0x02` reads the first fragment as a whole frame. The symptom is ffmpeg errors such as `[mjpeg] overread 8` or `Invalid data found when processing input`, and missing or corrupt frames. Detailed 1080p JPEG frames at quality 0.96 cross 128 KB routinely; flat test frames often do not, which is why the bug hides during development.

The rule: accumulate payloads from `FIN=0` until the continuation frame with `FIN=1`, then read the 4-byte index from the reassembled message. The kit's renderer does this. If you write or replace the transport, test it with a deliberately detailed frame (noise or grain over the whole canvas) and compare the decoded frame count with the expected count.

## Sub-frame motion blur

Fast objects drawn once per frame can strobe: at 24 or 30 fps, small fast debris jumps in crisp steps. Sub-frame blur draws several moments inside the shutter interval and averages them. The multi-worker renderer calls `window.__still(t, samples, shutter)` when the page defines it, and falls back to `__renderFrame(t)` otherwise; `--samples` has no effect on a page without the hook, so check a blurred frame rather than trusting the flag.

A Canvas2D implementation sketch:

```js
// Average `samples` sub-frames spread over `shutter` of one frame interval, centred on t.
window.__still = (t, samples = 1, shutter = 0.5) => {
  if (samples <= 1) return window.__renderFrame(t);
  const c = document.getElementById('c');
  const acc = H.offscreen('blur-acc', c.width, c.height, () => {});
  const a = acc.getContext('2d');
  a.globalAlpha = 1;
  a.clearRect(0, 0, acc.width, acc.height);
  const span = shutter / (window.FPS || 30);
  const shotStart = shotStartAt(t);            // your timeline: start of the shot containing t
  for (let i = 0; i < samples; i++) {
    const ts = Math.max(shotStart, t + span * ((i + 0.5) / samples - 0.5)); // never sample the previous shot
    window.__renderFrame(ts);
    a.globalAlpha = 1 / (i + 1);                 // running average
    a.drawImage(c, 0, 0);
  }
  c.getContext('2d').drawImage(acc, 0, 0);
};
```

Rules that came from real failures:

- **Never blur across a cut.** Clamp sub-frame times to the shot that contains `t`. Averaging two unrelated shots creates a double image that viewers read as a glitch.
- **Blur everything that moves fast, or say clearly what is not blurred.** One film keyed shutter motion only for camera, focus, lens and the hero object. Small fast debris stayed unblurred and strobed; three of six viewer-reported "glitches" were exactly that debris.
- **Interpolate rotations properly.** For 3D cameras, sample transforms at shutter time with quaternion interpolation and consistent signs; Euler angles can wrap and spin the camera inside one frame.
- **Cost multiplies.** Four samples is roughly four times the drawing time per frame. Measure throughput with blur on before quoting an ETA.
- **Running averages in 8-bit lose precision.** With many samples, accumulate in a float buffer (WebGL) instead of repeated canvas blends.

Check it the same way the failure was found: take three consecutive frames from the densest motion region, crop and magnify. Smooth motion shows small displacements with softened leading edges; strobing shows large displacements with perfectly crisp edges.

## Chunked, resumable renders

Long or expensive renders should survive an interruption without restarting. Neither kit renderer resumes chunks; this is a technique to build when you need it.

1. **Split by integer frame indices**, never by repeated floating-point addition of seconds. Chunk `k` covers frames `[k × N, min((k + 1) × N, total))`.
2. **Write an intent record** for the whole render before starting, and store it with every chunk:

```json
{
  "source": "git commit or source snapshot hash",
  "page": "examples/my-film/film.html",
  "assets": {"audio/mix.wav": "sha256…", "analysis/words.json": "sha256…"},
  "settings": {"width": 1920, "height": 1080, "fps": 60, "crf": 18, "preset": "medium", "pix_fmt": "yuv420p"},
  "chunk": {"index": 7, "firstFrame": 1050, "frameCount": 150}
}
```

3. **Write each chunk under a temporary name** (`chunk-0007.part.mp4`) and rename it only after ffmpeg exits 0 and a probe shows the expected frame count.
4. **Resume only chunks whose intent matches** the current source revision, asset hashes, frame range, dimensions and encoding settings. File existence alone is not enough: after a code or timing change, an old chunk with the right name contains the wrong film.
5. **Refuse to start from a dirty working tree** if the intent records a commit; otherwise the record names a revision that was never rendered.
6. **Concatenate only compatible chunks.** `ffmpeg -f concat -safe 0 -i chunks.txt -c copy video-silent.mp4` requires identical codec, dimensions, pixel format, frame rate and time base; a visually continuous timeline can still have mismatched parameters. Then mux audio once, over the whole film.
7. **Check the seams.** Look at the frame before and after every chunk boundary; a worker-specific state bug shows up exactly there.

One earlier pipeline used 150-frame chunks with `.part.mp4` names renamed on success. Another refused a dirty tree, required a matching source hash, wrote a render-intent file and resumed only on identical intent. Both patterns worked; the second is safer.

## Hash large files by streaming

Bind every render to a hash, and compute it without loading the file into memory. A manifest step that read a finished 2.9 GB export into a single Node buffer failed (Node cannot read a file over 2 GiB in one call), after the expensive render had already succeeded.

```js
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
export const sha256File = (file) => new Promise((resolve, reject) => {
  const h = createHash('sha256');
  createReadStream(file).on('data', (d) => h.update(d)).on('end', () => resolve(h.digest('hex'))).on('error', reject);
});
```

From a shell, `shasum -a 256 film.mp4` (macOS) or `sha256sum film.mp4` (Linux) stream the file. In Python, read in blocks with `hashlib.file_digest(f, "sha256")` or a loop over `f.read(1 << 20)`.

## Keep the manifest separate from the render

Write the manifest (output hash, audio hash, timing file hashes, caption offset, source revision, command, tool versions) in a separate step that can be rerun on its own. A failed bookkeeping step should cost seconds, not a re-render. One pipeline added a `manifest` mode that re-bound an existing render after the hashing failure above.

A repaired manifest must identify the source revision actually rendered, not silently bind the video to newer source files. If the working tree has changed since the render, record the rendered revision from the intent record, or say that it is unknown.

## Scale only after measuring

The simple PNG pipe is easy to inspect and suitable for this kit. More demanding films may need a higher-throughput path:

- JPEG frames reduce transfer size but introduce another lossy step.
- Raw RGB avoids image compression but greatly increases bandwidth.
- Multiple Chrome workers need ordered frame assembly and bounded buffering.
- WebSocket transport needs backpressure and correct handling of fragmented messages.
- Chunked exports need exact frame ranges, source identity and atomic completion markers.

Make one performance change at a time and compare the encoded result. A worker count that improves one scene may compete for GPU memory on another. Record elapsed time, frame count, average capture fps and peak disk requirements for your own representative segment. Keep a known design frame and a short encoded reference from before the change; faster output is not useful if text, colour or timing regresses.

Measure encoding cost in the pilot too. Fine per-pixel grain does not compress: one 41-second pilot with strong per-pixel animated grain was about 1 GB. See [chapter 9](09-encode-and-deliver.md) for the fix and the master/review split.

## Common export failures

| Symptom | Inspect first |
|---|---|
| Missing duration or wrong size | Page contract and canvas attributes |
| `page readiness timed out after 30 seconds` | A font, image or texture promise that never resolves; a missing file path |
| Missing fonts/assets | `__ready`, paths and browser errors |
| Frame changes after a seek | Mutable state and randomness |
| Deterministic scene, inconsistent screenshots | Stale compositor paint; wait for paint after drawing |
| Browser fails to launch | System Chrome availability and platform launch configuration |
| Very slow, GPU string says SwiftShader | Software rendering; launch flags, bundled browser or no GPU session |
| ffmpeg stops early | Encoder stderr, audio length and incorrect `-shortest` usage |
| `websocket closed` partway through a multi-worker render | ffmpeg exited early (often `-shortest` with a short audio file) and the server closed |
| `[mjpeg] overread` or `Invalid data found` | WebSocket continuation frames not reassembled |
| Tail frames missing | Expected integer count and exact audio/video fitting |
| Frames out of order or duplicated | Missing frame index in the transport, or a reorder buffer keyed by arrival |
| Memory climbs until the render dies | Unbounded reorder buffer; no backpressure from the encoder |
| `--samples` set, no visible blur | The page does not define `window.__still` |
| Double images at a cut | Blur sub-frames crossing the shot boundary |
| Export much larger than expected | Fine grain, texture, noise, resolution and CRF |
| Manifest step fails after a long render | Whole-file read of a multi-gigabyte output; hash by streaming |
| Resumed render shows old content | Chunks reused by filename instead of by matching intent |
| Preview correct, export wrong | Preview-only state, a second clock or different asset loading |

After export, follow [verification](08-verification.md). Process exit zero is only the beginning of that check.
