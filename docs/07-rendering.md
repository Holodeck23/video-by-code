# 7. Render exact frames

Export should be a repeatable computation. A slow capture makes the export take longer; it must not change story timing. The included renderer asks the page for each absolute time, captures the canvas as PNG, and pipes the frames to ffmpeg.

## Requirements and setup

The included path needs Node.js, npm, system Google Chrome, ffmpeg with `libx264` and AAC encoding, and Python for verification. Python scripts with dependency metadata can run through `uv`; `beat-grid.py` requires Python below 3.13, so its documented commands select 3.12.

From the kit root:

```bash
node --version
ffmpeg -hide_banner -version
ffprobe -hide_banner -version
npm ci --prefix starter
```

The lockfile pins the browser automation package. The renderer uses system Chrome, not a Playwright-downloaded browser. Check the runtime section of [the API contract](../lib/API.md) for portability limits. Its graphics flags are tuned for macOS; on another OS, adapt and test the browser launch deliberately.

Do not replace the browser version in the middle of a production without repeating the design-frame and determinism checks. Fonts, browser rendering and GPU drivers can affect pixels even when source code is unchanged.

## Set output storage first

Set `PROD` to the durable production folder selected for the work, and create output subfolders there:

```bash
mkdir -p "$PROD/renders/proof" "$PROD/renders/master" "$PROD/qa"
```

Keep render media outside the code repository. Client renders belong in private client storage. Check disk capacity before a large image sequence or heavy 3D render. A raw 1920×1080 RGB frame is about 6.2 MB; at 30 fps, raw data is roughly 187 MB/s before overhead. This is a throughput calculation, not a promise about disk usage when piping compressed PNGs.

## First render a still and sheet

Use an included example:

```bash
node starter/render.mjs examples/narrated-explainer.html --stills 1,9,17,25,33 --outdir "$PROD/qa/stills"
node starter/render.mjs examples/narrated-explainer.html --sheet 12 --out "$PROD/qa/scene-sheet.jpg"
```

`--stills` accepts comma-separated seconds. `--sheet` samples evenly spaced moments between `--from` and `--to` and adds diagnostic time labels. A labeled sheet is a review artifact, not final footage.

Look at the images. Confirm correct assets, fonts, aspect ratio, layout and final-state coverage before exporting every frame. A blank or fallback-font still is cheaper to fix now.

## Run seek determinism

```bash
node starter/determinism.mjs examples/narrated-explainer.html
```

The test visits timestamps out of order and requires repeated visits to produce identical image hashes in the same runtime. It detects render-history dependence, such as an advancing random generator or a particle list mutated by earlier frames. It does not promise identical pixels across different browsers, GPUs, fonts or operating systems.

The test samples a small set of times. Add production-specific probes around risky boundaries, textures or simulations. A passing global sample does not prove all scene code is pure.

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

External audio and voice files use the page's full timeline, starting at page time zero. When `--from` is nonzero, the renderer trims every track by that amount. Passing an already trimmed segment will trim it again. Page effects are rendered offline on that same time origin, then trimmed and padded to output duration.

The renderer normalizes voice mixes in one pass and encodes audio as AAC. For an approved premixed track, use `--audio mix.wav` without `--voice`; this preserves its mix processing apart from final encoding and duration fitting. Verify loudness and true peak after encoding.

## What the renderer actually does

1. Starts system Chrome and loads the file URL with `?export=1` to suppress the preview player.
2. Waits for `window.__ready` and validates the page contract.
3. Reads canvas dimensions, duration and preferred frame rate.
4. Generates optional offline sound.
5. Calls `__renderFrame(from + n/fps)` for every output frame.
6. Converts the captured frames to limited-range BT.709 `yuv420p` and encodes H.264.
7. Fits audio to the selected video interval, combines it and writes the MP4.
8. Closes the browser and removes its temporary audio files.

It does not provide multiworker export, chunk resume, raw WebGL capture, image-sequence output or multi-sample blur. Those are advanced extensions, not flags to guess.

## Scale only after measuring

The simple PNG pipe is easy to inspect and suitable for this kit. More demanding films may need a higher-throughput path:

- JPEG frames reduce transfer size but introduce another lossy step.
- Raw RGB avoids image compression but greatly increases bandwidth.
- Multiple Chrome workers need ordered frame assembly and bounded buffering.
- WebSocket transport needs backpressure and correct handling of fragmented messages.
- Chunked exports need exact frame ranges, source identity and atomic completion markers.

Make one performance change at a time and compare the encoded result. A worker count that improves one scene may compete for GPU memory on another. Record elapsed time, frame count, average capture fps and peak disk requirements for your own representative segment.

If exporting chunks, define intervals by integer frame indices, not repeated floating-point addition. Write an incomplete file under a temporary name, rename only after a successful encode, and verify each chunk. Concatenation requires compatible stream settings; a visually continuous timeline can still have mismatched encoding parameters.

## Common export failures

| Symptom | Inspect first |
|---|---|
| Missing duration or wrong size | Page contract and canvas attributes |
| Missing fonts/assets | `__ready`, paths and browser errors |
| Frame changes after a seek | Mutable state and randomness |
| Browser fails to launch | System Chrome availability and platform launch configuration |
| ffmpeg stops early | Encoder stderr, audio length and incorrect `-shortest` usage |
| Tail frames missing | Expected integer count and exact audio/video fitting |
| Export much larger than expected | Fine grain, texture, noise, resolution and CRF |
| Preview correct, export wrong | Preview-only state, a second clock or different asset loading |

After export, follow [verification](08-verification.md). Process exit zero is only the beginning of that check.
