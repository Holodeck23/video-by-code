---
name: video-by-code
description: "Build, render, and verify deterministic code-driven videos (narrated explainers, vertical 9:16 shorts, lyric music videos, data stories, and audio visualizers) using Canvas 2D, procedural Web Audio, Playwright, and FFmpeg. Includes 86 visual style specifications, audio timing analyzers, and automated verification gates for seek determinism, safe-area text bounds, cut harshness, colour fidelity, and loudness. Use when asked to create a video by code, programmatic animation, faceless explainer, vertical short, or lyric visualizer."
---

# Video by Code Skill

A runnable toolkit and production workflow for human–agent teams making deterministic videos in code. All scene code stays inside the repository or project workspace; all generated media, audio takes, stills, and verification receipts live in an explicit external `$PROD` directory.

**Order of work:** `brief → audio & timing → style & prompt → 3 design stills → scene code → determinism & text-bounds gate → full render → verify & contact sheet → delivery receipt`

---

## 1. Environment & Smoke Check

Before building a new film, ensure the starter dependencies are installed and the 4-second smoke test passes from the repository root:

```sh
cd starter && npm ci && cd ..
node tests/runtime-contract.mjs
```

---

## 2. Production Directory & Intent (`RUNBOOK.md` §1–2)

1. Choose an absolute production directory outside the code checkout:
   ```sh
   PROD="/absolute/path/to/video-outputs/<project-slug>"
   mkdir -p "$PROD"/{audio,analysis,stills,renders,checks}
   ```
2. Copy [`templates/brief.md`](templates/brief.md) to `"$PROD/brief.md"` and fill in the audience, core takeaway, aspect ratio (`1920x1080` landscape or `1080x1920` vertical), duration, voice/music source, and safe-area margins.

---

## 3. Audio Identity & Timing (`docs/04-music-audio-and-timing.md`, `docs/05-narration-and-captions.md`)

Never animate to guessed timestamps. Measure the actual audio file first and record its SHA-256 hash:

```sh
uv run tools/timing/audio-identity.py "$PROD/audio/source.wav" \
  --out "$PROD/analysis/identity.json" --copy-wav "$PROD/analysis/analysis.wav"
```

* **Spoken narration:**
  * Synthesize via local Kokoro ONNX TTS (with `< 4` word fragment merge and `--say say.json` phonetic dictionary):
    `uv run tools/timing/kokoro-narrate.py script.txt --out-dir "$PROD/audio" --voice af_heart --say say.json`
  * Verify spoken audio round-trip via local `whisper-cli`:
    `uv run tools/verify/verify-narration.py "$PROD/audio/narration.wav" "$PROD/audio/timing.json"`
  * Check scripts/lyrics for verbatim n-gram lift against reference text:
    `python3 tools/verify/check-lift.py candidate.txt reference.txt`
* **Music / lyric / stem-reactive tracks:**
  * Separate 6 stems via Demucs (`vocals, drums, bass, guitar, piano, other`) and normalize 44.1 kHz WAV:
    `uv run --python 3.12 tools/timing/separate-stems.py "$PROD/audio/song.mp3" --out-dir "$PROD/analysis"`
  * Extract 120 Hz stem envelopes, monotone musical time `tau`, beat/bar phase, silences, `features.f32`, and 100 fps guitar pitch/vibrato:
    `uv run --python 3.12 tools/timing/analyze-stems.py "$PROD/analysis" --fps 120 --stem-pitch`
  * Align word-level lyrics (`whisper-cli`, `mlx-whisper`, `faster-whisper`, or `acoustic` vocal-band energy warping):
    `uv run tools/timing/align-words.py "$PROD/analysis/stems/vocals.wav" --script lyrics.txt --backend whisper-cli --out "$PROD/analysis/words.json"`
  * Lightweight single-file cues / beat grid / visualizer envelope:
    * `uv run tools/timing/cue-extract.py "$PROD/audio/song.mp3" --out "$PROD/analysis/cues.json"`
    * `uv run --python 3.12 tools/timing/beat-grid.py "$PROD/analysis/analysis.wav" --out "$PROD/analysis/beats.json"`
    * `python3 tools/build-visualizer.py "$PROD/analysis/analysis.wav" --out "$PROD/analysis/features.js"`

---

## 4. Style Selection & Prompt Assembly (`prompts/README.md`)

Browse [`prompts/styles/INDEX.md`](prompts/styles/INDEX.md) (86 authored visual style cards across 13 families) and [`prompts/briefs/`](prompts/briefs/) (5 format briefs: `explainer-voiceover`, `vertical-short`, `lyric-video`, `instrumental-visualizer`, `data-story`).

Assemble the combined specification for your chosen style and brief:

```sh
python3 tools/build-prompt.py <style-id> --brief <brief-id> --out "$PROD/style-prompt.md"
```

---

## 5. Scene Authoring Contract (`lib/API.md`, `docs/06-building-scenes.md`, `docs/12-advanced-engines-and-benchmarks.md`)

Every scene HTML page loads [`lib/harness.js`](lib/harness.js) (`window.H`) and optionally:
* [`lib/sound.js`](lib/sound.js) (`window.SOUND`) — procedural Web Audio synthesis
* [`lib/features.js`](lib/features.js) (`window.FEATURES`) — 120 Hz binary `features.f32` stem cursor, refractory onset pulse, monotone `tau(t)`, and `words.json` lyric lookup
* [`lib/ink-doodle.js`](lib/ink-doodle.js) (`window.INK`) — 8 fps deterministic line-boil, wobbled doodle primitives, left-anchored ALL-CAPS write-on `marker`, and Ken Burns `plate` camera
* [`lib/webgl-post.js`](lib/webgl-post.js) (`createPost`) — 4-stage Three.js post-processing (`FxOverShader`, `UnrealBloomPass`, `FinalGradeShader` with ACES / `paperMode`, luma-only impact inversion, glitch, shake, grain, and crisp UI overlay)

Every page exposes:
* `<canvas id="c" width="1920" height="1080"></canvas>` (or `1080` × `1920` for vertical)
* `window.DURATION` (seconds) and `window.FPS` (default `30`)
* `window.__ready` (Promise resolving after fonts and cached offscreen plates are ready)
* `window.__renderFrame = (t) => { ... }` — **pure function of `t` in seconds**.
  * Start every frame with `ctx.reset()` (or balanced `save()`/`restore()`).
  * Use `H.rng(seed)` and `H.noise(seed)` outside the frame loop; never advance mutable state across frames.
  * Cache paper/surface textures once via `H.paperTexture(...)` or `H.offscreen(key, w, h, fn)`.
  * Expose `window.__textBounds = () => [...]` for story-critical text (`{text, critical: true, left, right, top, bottom}`) so automated safe-area checks can verify every frame.
* `window.scoreSound = (k) => { ... }` — schedules procedural sound events at fixed timeline timestamps (automatically suppresses beds/music when `--voice` is supplied).

### Key Production Rules from Testing
* **Safe-area margins & font weights:** On macOS Chrome, `Arial` only provides weights `400` and `700` (`600` snaps to `700` Bold and widens lines by ~9%). Always audit `measureText(s).actualBoundingBox*` across **all frames** (`x: 80..960, y: 190..1640` for `1080x1920` vertical shorts).
* **Continuous-camera styles (`transit-map`, pan-and-zoom):** Start camera interpolation at `beat[i].start` (never `beat[i].start - preRoll` when `i` switches at `beat[i].start`, which causes a 1-frame jump), fade beat-local overlays over `0.20 s`, and guard world-space labels so they only draw when inside the clipped map viewport.

---

## 6. Render Stills, Check Determinism & Render Master (`docs/07-rendering.md`)

1. **Seek Determinism Gate:**
   ```sh
   node starter/determinism.mjs path/to/film.html
   ```
2. **Design Stills Gate (inspect opening, dense middle, and ending frames before full render):**
   ```sh
   node starter/render.mjs path/to/film.html --stills 1.5,12.0,24.0 --outdir "$PROD/stills"
   ```
3. **Full MP4 Render:**
   * **Reference single-worker Playwright renderer (default 30 fps Canvas2D + procedural audio):**
     ```sh
     node starter/render.mjs path/to/film.html \
       --out "$PROD/renders/master.mp4" --fps 30 --audio page \
       --voice "$PROD/audio/narration.wav"
     ```
   * **Multi-worker GPU WebSocket renderer (60 fps Three.js / WebGL / kinetic typography):**
     ```sh
     node tools/render/parallel-ws-render.mjs \
       --url "http://127.0.0.1:5173/?capture=1" --duration <DURATION> --fps 60 --workers 4 \
       --audio "$PROD/analysis/analysis.wav" --out "$PROD/renders/master.mp4"
     ```
   * **Browserless Python + Pillow `rawvideo` renderer (captioned workbooks & tutorials):**
     ```sh
     uv run tools/render/workbook-render.py \
       --spec workbook.json --audio "$PROD/audio/narration.wav" --out-dir "$PROD/renders"
     ```

---

## 7. Mandatory Verification Gates (`docs/08-verification.md`)

Every production must run and record these checks in `"$PROD/checks/"` before handoff:

1. **Stream, Decode, Sync & Loudness Gate:**
   ```sh
   uv run tools/verify/verify-video.py "$PROD/renders/master.mp4" \
     --expect-seconds <DURATION> --fps 30 --width <W> --height <H> \
     --json "$PROD/checks/verify-video.json"
   ```
2. **Contact Sheet Visual Inspection:**
   ```sh
   uv run tools/verify/contact-sheet.py "$PROD/renders/master.mp4" \
     "$PROD/checks/contact-sheet.jpg" --n 16 --cols 4 --tile-width 270
   ```
   Visually inspect `contact-sheet.jpg` and the scene stills for text clipping, label collisions, or unintended blank/frozen frames.
3. **Transition & Cut Harshness Audit:**
   ```sh
   uv run tools/verify/cut-harshness.py "$PROD/renders/master.mp4" \
     --top 15 --json "$PROD/checks/cut-harshness.json"
   ```
4. **Look & Palette Diagnostics:**
   ```sh
   uv run tools/verify/measure-look.py "$PROD/renders/master.mp4" \
     --samples 16 --json "$PROD/checks/measure-look.json"
   ```
5. **All-Frame Text Bounds Audit:**
   Follow the pattern in [`tests/layout.mjs`](tests/layout.mjs) to verify `fillText` ink bounds and `window.__textBounds()` across every frame `0 .. frames-1`.

---

## 8. Packaging & Delivery (`RUNBOOK.md` §12)

Complete `"$PROD/qa.md"` (from [`templates/qa.md`](templates/qa.md)) and `"$PROD/delivery.md"` (from [`templates/delivery.md`](templates/delivery.md)). Report machine verification (`PASS`/`WARN` dispositions) separately from human creative viewing and listening approval.

## Key References
* [`README.md`](README.md) — Quickstart and chapter index
* [`RUNBOOK.md`](RUNBOOK.md) — 12-step human–agent production checklist
* [`lib/API.md`](lib/API.md) — Exact `H` graphics and `SOUND` procedural audio contract
* [`examples/README.md`](examples/README.md) — Worked landscape, vertical, and style-study examples
* [`docs/10-pitfalls.md`](docs/10-pitfalls.md) — Symptom → cause → repair table
