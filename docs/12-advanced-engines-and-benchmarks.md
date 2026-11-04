# 12. Advanced Engines, Shaders & Quantitative Benchmarks

This chapter records the concrete engines, formulas, shader rules and measured luminance and colour benchmarks from a series of productions: Three.js/WebGL lyric films, six-stem instrumental visualizers, multi-worker 60 fps kinetic typography, Blender 3D story-world videos, illustrated "doodle" explainers and Pillow/FFmpeg captioned walkthroughs.

Every runnable tool and browser module referenced here is bundled in [`tools/`](../tools/) and [`lib/`](../lib/). Where this chapter and a tool's `--help` disagree, the tool is right; fix this page. Numbers quoted from past productions describe those scenes on that hardware. Remeasure before using them as budgets or acceptance thresholds.

---

## 1. End-to-End Stem Separation, 120 Hz Feature Packing & Pitch Tracking

When a film reacts to a full song rather than a single loudness envelope, run the two-stage audio preparation:

```sh
# 1. Normalise to 44.1 kHz stereo WAV, record SHA-256 identity, split stems with Demucs.
#    Writes $PROD/analysis/song-44k.wav and $PROD/analysis/stems/<model>/song-44k/*.wav
uv run --python 3.12 tools/timing/separate-stems.py "$PROD/source/song.m4a" "$PROD" \
  --slug song --models htdemucs_6s,htdemucs_ft

# 2. 120 Hz per-stem curves, beats, proposed sections, edge-compensated silences, musical time,
#    and (with --stem-pitch) 100 fps lead pitch, vibrato, kick/snare, sub-bass and filter sweep.
uv run --python 3.12 tools/timing/analyze-stems.py "$PROD" --slug song --stem-pitch

# Optional neural beat tracker (otherwise librosa is used):
uv run --python 3.12 --with "beat_this @ git+https://github.com/CPJKU/beat_this" \
  tools/timing/analyze-stems.py "$PROD" --slug song --stem-pitch --force
```

Outputs in `$PROD/analysis/`:

| File | Contents |
|---|---|
| `analysis.json` | duration, `bpm_median`, `tempo_spread`, `beats`, `downbeats`, `sections_proposed`, `silences`, stem paths, the `features` descriptor, tool versions |
| `features.f32` | float32 little-endian, row-major `[feature][frame]`, 120 frames per second |
| `structure-map.png` | per-stem energy, onsets, sections, silences and `tau − t` on one timeline |
| `stem-features.json` | with `--stem-pitch`: 100 fps lead and percussion detail |

### Key Signal-Processing Rules (`tools/timing/analyze-stems.py` & `lib/features.js`)

1. **Beats are an estimate; the edit grid comes from `beat-grid.py`.** The analyzer uses Beat This! (`final0` checkpoint, no DBN) when it is installed and falls back to librosa's `beat_track`; `analysis.json` records which in `tools.beats`. `bpm_median` summarises inter-beat intervals and `tempo_spread` reports the shortest and longest. A tracker that quantises intervals can read about 1% slow at the median, so cut on beat event times, never on a multiple of the median period. The fallback picks beat one by onset energy, which can be one or two beats wrong; assert section downbeats with `beat-grid.py --sections` ([chapter 4](04-music-audio-and-timing.md#downbeats-assert-them-never-trust-the-heuristic)).
2. **Window-edge-compensated silence detection.** An RMS window (1024 samples at 22.05 kHz) smears energy outward by half a window at each boundary, so raw thresholding under-reports short dramatic mutes: one detector read 0.906 s for a true 0.952 s gap. `find_silences()` moves each edge outward by `1024 / 22050 / 2 ≈ 0.023 s`, with a −45 dB floor and a 0.35 s minimum.
3. **Absolute level, then a presence gate in the browser.** `<stem>.level` is absolute (`(dB + 60) / 60`, clipped), so digital silence stays 0; `onset` and `bright` are percentile-normalised and can inflate residue. A six-stem model always writes `guitar` and `piano` stems even when the instrument is absent. `FEATURES.loadAnalysis()` computes each stem's `level` spread between the 5th and 98th percentiles; under `0.04` the stem is marked absent, `norm()` returns 0 and it yields no onsets, so bleed never triggers visual transients. Onsets are rising crossings of 0.45 with a 70 ms refractory window.
4. **Monotone musical time (`tau`).** Never multiply `t * energy` in a shader or particle drift: when energy drops, time reverses. The analyzer integrates `drive = 0.35 + 0.65·mix.env + 0.5·drums.onset` (smoothed with a 50 ms attack and 600 ms release, divided by its mean), so `tau` is strictly increasing and advances one second per second at average energy. Read it with `f.sample('tau', t)`.
5. **Lead pitch and percussion (`--stem-pitch`).** At 100 fps: `guitar_f0` from `librosa.pyin` between A2 and E6 (110 to 1318.5 Hz) on the guitar stem (else `other`, else the mix), `guitar_f0_norm`, `guitar_vibrato` (frame-to-frame pitch movement, gated where the lead is audible), `kick_hit`, `snare_hit`, `bass_sub` (35 to 95 Hz) and `filter_cutoff` (centroid of `other`, mapped from 380 to 3400 Hz). Confirm `guitar_f0` follows the audible lead before tying geometry to it; a six-stem "guitar" once contained a synth.

### Loading the curves

```js
const f = await FEATURES.loadAnalysis('analysis');   // throws unless bytes == names × frames × 4
const drums = f.norm('drums', 'env', t);              // 0..1, 0 when the stem is absent
const hit = f.pulseAt(f.onsets.drums, t, 0.12);       // exponential decay from the latest onset
const tau = f.sample('tau', t);
const bar = f.cursorAt(f.downbeats, t);               // index of the latest downbeat at or before t
```

The byte-length check catches a stale `features.f32` beside a regenerated `analysis.json`. Every lookup is a pure function of `t`.

### Validate the chain on known answers first

Before trusting any detector on a real take, run it on audio whose answers you know:

```sh
uv run tools/timing/make-test-audio.py "$PROD/test-audio"
```

This writes a click track at a known BPM and phase with a scored two-beat silence between two sections, a "song" with four spoken lines plus one ad-lib not on the sheet, an `.m4a` with `mov_text` cues (one with a runaway end), an Opus-in-`.m4a` file, a narration with a sentence removed, and `answer-key.json` with the true beats, downbeats, silence and line placements. Each timing tool should recover the key within its stated tolerance; a tool that misses a synthetic two-beat silence will miss a real one. Then validate on one representative real recording and listen.

---

## 2. Multi-Backend Lyric & Speech Alignment (`tools/timing/align-words.py`)

The tool takes cues or a script, an audio file and an output path, in that order:

| Mode | Command | Best for |
|---|---|---|
| Local whisper.cpp (default) | `uv run --python 3.12 tools/timing/align-words.py cues.json vocals.wav words.json` | Speech and clean vocals; needs the `whisper-cli` binary and a ggml model (`--whisper-model`) |
| Apple Silicon `mlx-whisper` | `uv run --python 3.12 --with mlx-whisper tools/timing/align-words.py cues.json vocals.wav words.json --backend mlx-whisper --whisper-model <hf-repo>` | Word timestamps on Apple Silicon, when it installs |
| `faster-whisper` | `uv run --python 3.12 --with faster-whisper tools/timing/align-words.py cues.json vocals.wav words.json --backend faster-whisper --whisper-model small.en` | Cross-platform CTranslate2, when it installs |
| Acoustic energy warping | `uv run --python 3.12 tools/timing/align-words.py cues.json vocals.wav words.json --backend acoustic --bpm 116.99 --phase 0.231` | Dense, shouted or stacked vocals where ASR drops words |

`cues.json` may be `embedded-lyrics.py` output or a `timing.json`; a `.txt` or `.md` script also works (paragraphs become evenly spaced cues). On some machines the `mlx-whisper` and `faster-whisper` dependencies fail to build; the whisper.cpp CLI is the dependable path. Raw heard words are cached as `words.raw.json` beside the output.

The acoustic backend clamps each line to `min(next.start − 0.04, start + min(2·bar, max(1.6, chars·0.072)))` (never under 0.35 s), builds a 200 fps vocal envelope from the 280 to 3400 Hz band minus a share of the 30 to 180 Hz band, and places words by blending a syllable-and-length weight (62%) with cumulative vocal energy (38%). Lines matching `--gang-pattern REGEX` are treated as gang vocals and their word pairs snapped to sixteenth notes from `--bpm` and `--phase`; without the flag nothing is snapped.

### Post-Alignment Guards (`align-words.py` & `lib/features.js`)

* **First-word pre-silence trim (`fixFirstWord`).** ASR routinely attaches leading instrumental bars to the first word of a phrase. A first word longer than 0.7 s is moved to start at `end − 0.45` and marked `fixed`. `FEATURES.loadLyrics()` applies the same rule on load. Confirm against 40 ms vocal RMS so held notes survive ([chapter 4](04-music-audio-and-timing.md#failure-modes-and-their-rules)).
* **Over-long or gapped lines are split.** Any line with more than 14 words, or an inner word gap over 2.5 s, is split there, so a karaoke layout never shrinks a monologue to micro-type and a chorus hook never bridges a break into the next ad-lib. The tool does not enforce a duration cap: also split lines longer than 6.5 s, into sentences of 12 words or fewer.
* **Strict monotonic order.** A word starting before its predecessor stops the tool with an error rather than writing a file.
* **Coverage report.** The output stores `matched` and `total`; report them. Past productions matched 135/147, 233/259 and 133/134 words.
* **Verbatim-lift gate (`tools/verify/check-lift.py`).** Before rendering lyrics or a script written near a reference, run `python3 tools/verify/check-lift.py REFERENCE.txt CANDIDATE.txt`. It normalises both, ignores n-grams with two or more function words, and exits 1 on any shared substantive 3-gram (reporting 4-, 5- and 6-gram overlaps too). Passing it does not establish originality or permission.

---

## 3. Quantitative Look, Luminance & Color Benchmarks

Visual review is backed by measured distributions from `tools/verify/measure-look.py`: per frame (scaled to 480×270) the median Rec.709 luma, the percentage of pixels above 128, the three most common colours after 16-level quantisation, and the mean of the 400 most saturated pixels.

```sh
uv run tools/verify/measure-look.py "$PROD/references/ref.mp4" --samples 15 --json "$PROD/references/look.json"
uv run tools/verify/measure-look.py "$PROD/qa/stills" --compare "$PROD/references/stills" --json "$PROD/qa/look-vs-ref.json"
```

`--compare` exits 1 when the candidate falls outside the reference's range by more than `--tol-median` (5 levels) or `--tol-hot` (1.5 points), or its accent or top ground colour is further than `--tol-accent` (60) or `--tol-ground` (40) in RGB distance.

### Dark-Ground Atmospheric & 3D Videos (dark-ground lyric-film reference)

Measured on the chorus frames of a dark-ground lyric-film reference:

| Metric | Reference | Failure seen when violated |
|---|---|---|
| Median luma (0–255) | `18 – 24` | A draft measured `34` and read as washed-out grey |
| Pixels above 128 | `1.8% – 4.6%` | The same draft had `14.3%`, three to eight times the hot pixels |
| Ground | blue-dominant near-black, `#000010 – #101020` | A green-dominant ground read as a different world |
| Accent | one saturated colour per world, alarm colour spent once | Green, white, amber and red cards together read as a rainbow |

In the productions that followed, 26 dark-scene stills measured medians from 15 to 29 once calibrated, and paper scenes 229 to 235.

**The linear-RGB lift.** Scenes rendered in linear RGB and converted to sRGB in post are brighter than their shader constants suggest: linear `0.11` becomes about `0.11^(1/2.2) ≈ 94/255`. A background mix such as `mix(C_INK, C_INK2, 0.42)` plus `coreGlow * 0.18`, or an alarm wash of `vec3(0.11, 0.008, 0.016)`, put dark frames at a median of 34 to 55 with 5 to 15% of pixels above 128. Calibration that brought every dark plate back to a median of 18 to 26:

| Element | Calibrated value |
|---|---|
| Background mix between the two ground inks | `mix(C_INK, C_INK2, 0.20)` |
| Radial core glow | under `0.025 + 0.045 * kick` |
| Red alarm wash | capped at linear `vec3(0.035, 0.005, 0.010)`, mix at most `0.45` |
| 2D bokeh particles | 14 to 16 |

Measure after every change to a background shader; the eye adapts to a bright monitor.

**Selective HDR bloom (`lib/webgl-post.js`).** `FxOverShader` multiplies the type/effects layer by `fxGain` (default 2.0) only through a mask: on a dark world, warmth (`clamp((r − b) * 1.6)`) times `smoothstep(0.3, 1.0, r)`; in paper mode, saturation. The `UnrealBloomPass` runs with strength 0.5, radius 0.4 and threshold 1.0, so only pixels pushed past true overexposure bloom and neutral white type never does. Override per frame with `render({ bloom, fxGain })`.

### Light-Ground Editorial / Paper Videos (`paperMode`)

| Metric | Measured / rule | Failure when violated |
|---|---|---|
| Median luma | `229 – 235` on paper scenes in past productions | Measure your own paper reference; a lyric reference's light world was warm grey-white, not cream |
| Highlight roll-off | `paperMode: true` skips ACES and rolls off only above `0.90` | ACES turns warm cream paper into dull grey |
| HDR | only the accent hue | Ink and paper bloom into a haze |

### Luma-Only Impact Inversion (`lumaInvert`)

Never invert RGB channels via `1.0 - col` on a branded palette: warm `#FF2A00` vermilion inverts to `#00D5FF` cyan, and a blue accent turns yellow. Invert luminance only, preserving chromaticity (this is `FinalGradeShader`'s `uLumaInvert`, set with `render({ lumaInvert })`):

```glsl
float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));
vec3 inv = clamp(col + vec3(1.0 - 2.0 * Y), 0.0, 1.0);
col = mix(col, inv, uLumaInvert);
```

### Cut and encode benchmarks

| Measure | Observed | Tool |
|---|---|---|
| Mean frame-to-frame luma change | baseline 1.8; cuts viewers reported as glitches 29 to 90 (16 to 50 times baseline) | `uv run tools/verify/cut-harshness.py film.mp4 --ratio 10` |
| Red-channel SSIM, copper on dark blue, 8-bit 4:2:0 at about 4.9 Mbit/s | R 0.693 vs G 0.977, B 0.963 | `uv run tools/verify/channel-ssim.py FRAMES_DIR film.mp4 --min-ssim 0.90 --max-lag 0.05` |
| Same content, 10-bit 4:2:0 | R 0.722 | the cause is subsampling, not bitrate |
| Same content, 4:4:4 at the same size | R 0.984 | keep 4:4:4 as the master; see [chapter 9](09-encode-and-deliver.md) |

---

## 4. 3D Typography, Frustum Math & Raymarched SDF Rules

### 3D `TextPlane` Frustum Sizing

For a perspective camera with vertical `fov` in degrees, aspect `A` and distance `d = |cam.z − text.z|`, the visible world height and width at the text's depth are:

$$H_{\text{vis}}(d) = 2 \cdot d \cdot \tan\left(\frac{\text{fov} \cdot \pi}{360}\right), \qquad W_{\text{vis}}(d) = H_{\text{vis}}(d) \cdot A$$

| fov | d | H_vis | W_vis (16:9) |
|---|---|---|---|
| 34° | 6.8 | 4.16 | 7.39 |
| 42° | 6.8 | 5.22 | 9.28 |

At `fov = 34°`, `d = 6.8`, a 21-character string at cap height `0.44` was about 6.65 units wide, 90% of the visible width. It clipped both screen edges as soon as the camera orbited or dollied in below `d = 6`. That gives a measured width of about `0.72 × capH` per character for that font; measure your own font the same way (plane width ÷ cap height ÷ characters).

```js
function visible(fovDeg, d, aspect = 16 / 9) {
  const h = 2 * d * Math.tan(fovDeg * Math.PI / 360);
  return { h, w: h * aspect };
}
// dMin: the closest the camera gets to this text during the shot; fill: share of width allowed
function maxCapHeight(chars, fovDeg, dMin, { perChar = 0.72, fill = 0.55, aspect = 16 / 9 } = {}) {
  return (fill * visible(fovDeg, dMin, aspect).w) / (perChar * chars);
}
```

Size against the closest distance in the shot, not the resting one, and leave room for any orbit. Values that held in production:

| Case | Cap height |
|---|---|
| Headers of 20+ characters at `d ≈ 6.8`, fov 34° (about 55% of the width) | `<= 0.28` |
| Close-ups at `d ≈ 4 – 5` | `<= 0.22` |
| Short banners at `d = 9 – 13` | `<= 0.58` |
| Full sentences at `d = 9 – 13` | `<= 0.34 – 0.44` |

* **Subtitle clearance:** when a 2D subtitle bar is active near the bottom (baseline at `y = H − 118` on a 1080-high frame), keep 3D hero type at world `y >= 1.8` (for the camera heights used there, about 1.4 to 1.6) so world-space text never collides with screen-space captions.
* **One gate at a time:** in a corridor of text gates, show only the nearest gate's text.

### Raymarched SDF Rules

1. **No polar `atan` displacement across an axis.** Displacing a raymarched sphere with `cos(atan(p.z, p.x) * m)` creates an unbounded gradient where all angular spokes meet on the pole axis: a visible pinch and step-overshoot ripples. The same happens on a ground plane at its origin. Use an isotropic 3D gyroid wave field, scaled by a Lipschitz safety factor (0.72 was enough) so the distance gradient stays at or below 1:
   ```glsl
   float gyroid(vec3 p, float k) {
     vec3 q = p * k;
     return dot(sin(q), cos(q.yzx)) / 3.0;
   }
   // d = sphereSDF(p) + 0.72 * amp * gyroid(p, k);
   ```
2. **No Blinn-Phong `normalize(L + V)` where `L = −V`.** With a point light at the origin inside a central core (to light surrounding objects), the light vector on the core's camera-facing centre points straight away from the camera, `L + V → 0`, and the half-vector becomes `0/0`. It amplifies tiny raymarch termination differences into concentric bullseye rings. Shade the core's speculars from external key and rim lights (an offset key such as `normalize(vec3(0.55, 0.75, 0.35))`), or use Schlick-GGX with a clamped `NoH`.
3. **Dither before 8-bit output.** Add sub-LSB interleaved gradient noise (about `±0.85 / 255`) before quantisation so smooth volumetric gradients do not band.

---

## 5. Story-World State & Blender 3.x / 4.x / 5.0 Rules

When building a continuous narrative world, in Three.js or headless Blender Python:

1. **World memory is a pure function of `t`.** Persistent consequences (a cracked screen at 42.0 s, a switched-off sign when a sweep reaches it at `t0 + distance / speed`, a fallen drone) are declared as dated events and queried with `events.filter(e => t >= e.t)`. Seeking backwards restores the earlier state immediately. Patterns and code are in [chapter 6](06-building-scenes.md#state-with-history-three-deterministic-patterns).
2. **Fractional cut boundaries.** The first frame of the new shot is `math.ceil(t_cut * fps)`, for both the outgoing shot's end and the incoming shot's start, so no frame is shared or lost. `round()` can assign the cut key to the previous shot and let shutter interpolation sweep between cameras.
3. **Interpolation on the actual keys.** In the tested Blender build, keys inserted from Python stayed Bezier despite a Linear preference in the UI. Set `kp.interpolation = 'LINEAR'` (or `'BEZIER'`) on each FCurve key point after inserting it.
4. **Audit baked paths without the evaluator.** Check baked camera paths at fractional frames on both sides of each cut without calling the analytic camera function, which can overwrite the faulty bake during the check. In one regression the bake was off by about 5.4 m; corrected cut indices and linear keys brought it to about 0.000058 m.
5. **Blender can exit 0 after a Python exception.** Print a completion marker (for example `FRAME_DONE`) from the script, and check both the marker and the count of written PNGs.
6. **Engine names change between versions.** EEVEE Next is `'BLENDER_EEVEE_NEXT'` on 4.2 to 4.3 and `'BLENDER_EEVEE'` again later; probe `bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys()` rather than hard-coding.
7. **Bind renders to their source.** Refuse to render from an uncommitted tree, write the source commit and settings to a render-intent file, and resume only when the intent is identical.

One same-frame comparison at 1080p on an Apple Silicon laptop (a night city of plain box towers, about 500 signs) observed:

| Renderer | Settings | Cost per frame |
|---|---|---|
| EEVEE | 32 samples | about 2 s after shader compilation |
| Cycles, Metal GPU | 256 samples | about 3 minutes |

On box geometry neither showed a persuasive quality gain over a browser engine. That is evidence about the test, not the engine's ceiling: modelled detail and real materials give light more to describe. Traps seen in the same test:

* The AgX view transform turns saturated neon pastel; Khronos PBR Neutral or Standard keeps the hue.
* An area light placed just in front of a sign blows it out.
* World-volume haze over-scatters quickly; about 0.002 to 0.003 density suited city scale.
* Depth of field at a wide aperture blurs the nearest signage text. Enable it only in shots that name a focus distance.

World-building rules from the same series:

* Grid cities hide facade signs from a street-level camera (edge-on or blocked). Hang blade signs out from side faces along the street and string banners across the road for lyrics; open a view corridor in front of a hero window.
* Lit windows at about 15%, small, dim and varied, with near-black facades. Bigger, brighter, more numerous windows read as a toy city.
* Coloured spill on whole facades looks fake: keep facade spill under about 0.5% of the light's colour; put strong spill on wet ground, rain and the character's rim.
* Transparent additive volumes read as solid boxes. Put the event on surfaces: a thin scan line where a light wave meets facades and ground, short like a flash.
* A rim term around `pow(1 − N·V, 4)` at low gain; a strong or wide rim turns a figure into a glowing mannequin.
* Soft beam edges on a stretched instance need inverse-transpose normals (`M · S⁻² · n`), or a cone renders as a flat slab. Fade beams out within a few metres of the camera.

---

## 6. Hand-Drawn Doodle & Narrated Storyboard Rules (`lib/ink-doodle.js`)

For whiteboard and notebook explainers built from drawn primitives and illustrated plates:

1. **8 fps deterministic line boil (`INK.setBoil(t)`).** Wobble steps through three states at `floor(t * 8) % 3` (125 ms holds). Boiling at 30 or 60 fps looks like electrical jitter; 8 fps reads as drawn animation on threes and fours.
2. **Left-anchored ALL-CAPS write-on (`INK.marker(ctx, text, x, y, { size, p })`).** Never animate write-on text with `textAlign = 'center'` by slicing `text.slice(0, n)`: every new character shifts the word left. The marker measures the full string once and draws the prefix from the fixed left edge.
3. **Shot density and plate camera (`INK.plate(ctx, img, t, t0, t1, a, b)`).**
   * Target a new shot every 1.6 to 1.9 s: about 31 to 38 shots per minute. The measured reference ran 81 shots in 150 s (mean 1.85 s, median 1.63 s). One pilot averaged 3.35 s over 223 shots and felt slow.
   * `a` and `b` are `{ z, x, y }`: zoom plus a point of interest, normalised `0..1` in image coordinates (or pixels when above 1). The plate cover-fits, eases from `a` to `b` over `[t0, t1]` and clamps so the frame never shows past the image edge. Keep a table of named points per image (face, clock, wide) so shots aim at content. Modest zooms (about 1.02 to 1.1 in the pilot) keep illustrated detail sharp.
   * `plate` returns a mapper from image coordinates to screen coordinates; use it to pin labels, arrows and highlights to the moving plate.
   * **Never horizontally flip (`scale(-1, 1)`) a plate that contains clock faces, signage or interface text.** A mirrored turn-back once mirrored the clock digits. Draw clocks and labels in a separate unflipped layer over the plate.
4. **Plates in batches (`tools/render/codex-imagegen.sh`).**
   ```sh
   bash tools/render/codex-imagegen.sh shots.txt "$PROD/plates" "$PROD/refs/character.png" 4
   ```
   `shots.txt` holds one `name|scene description` per line; an optional fifth argument replaces the default style prompt. Existing `name.png` files are skipped, so an interrupted batch is safe to rerun. Inside the script the prompt must come before `-i REF.png`, or `-i` swallows it. Expect quotas to cap a batch: one service refused after 14 images, another stopped after 26. Plan an asset library (character poses, about 10 backgrounds, about 30 props) composed in code rather than one image per shot.
5. **TTS pronunciation and round-trip check (`tools/timing/kokoro-narrate.py`, `tools/verify/verify-narration.py`).**
   ```sh
   ~/.local/share/kokoro/.venv/bin/python tools/timing/kokoro-narrate.py script.txt "$PROD/audio/narration.wav" \
     --voice af_heart --speed 0.89 --say say.json
   uv run tools/verify/verify-narration.py script.txt "$PROD/audio/narration.wav" --json "$PROD/qa/narration.json"
   ```
   * Fragments under four words are merged into the neighbouring chunk so they do not rush or clip. Defaults: 0.35 s between sentences, 0.75 s between paragraphs.
   * `--say` maps display text to spoken text only inside the TTS payload (`"2026": "twenty twenty-six"`, a time such as `"3:07": "three oh seven"`, names spelled phonetically), keeping captions clean.
   * `verify-narration.py` transcribes the audio with whisper.cpp and exits 1 on any run of `--min-run` (default 3) consecutive script words missing from the speech.
   * Chunking and speed change pace, not expressiveness. One measurement put this voice's pitch variation at 2.86 to 3.01 semitones (standard deviation of F0) against 4.3 to 5.7 for six human narrators. Treat flatness as a property of the model.

---

## 7. High-Throughput & Deterministic Renderers (`tools/render/`)

| Renderer | Command | When to use |
|---|---|---|
| Single-worker reference (`starter/render.mjs`) | `node starter/render.mjs page.html --out "$PROD/renders/pass/master.mp4" --audio page` | Default 30 fps Canvas2D with `SOUND.renderOffline`; short and medium films. `--stills` and `--sheet N` use the same drawing function |
| Multi-worker GPU WebSocket (`tools/render/parallel-ws-render.mjs`) | `node tools/render/parallel-ws-render.mjs page.html --out /abs/master.mp4 --fps 60 --workers 3 --audio /abs/song.wav --crf 18 --preset medium --tune grain` | 60 fps full-length WebGL/Three.js or kinetic-type films; `--samples N --shutter S` for sub-frame blur, `--cuts sheet.png` for four frames around every boundary |
| Python + Pillow rawvideo (`tools/render/workbook-render.py`) | `uv run tools/render/workbook-render.py /abs/spec.json --preview`, then without `--preview` | Browserless captioned walkthroughs from a JSON spec of scenes; pipes `rgb24` to ffmpeg with BT.709 conversion and tags; writes `.srt`, `poster.png`, `qa/chapter-NN.png` and `qa/storyboard.png`; no audio track |
| Reference-locked batch imagegen (`tools/render/codex-imagegen.sh`) | `bash tools/render/codex-imagegen.sh shots.txt OUTDIR REF.png 4` | Consistent character and scene plates for 20 to 40 storyboard shots in parallel |

**Multi-worker renderer details.** Each worker is headless system Chrome (`--use-angle=metal`, GPU rasterisation, background throttling disabled) streaming JPEG frames (quality 0.96) over a WebSocket with an ack window of four frames. The server reassembles RFC 6455 continuation frames: Chromium splits messages over 128 KB, and a parser that reads only the first fragment truncates large frames (`overread` / `Invalid data found`). Frames are reordered across workers with a RAM buffer (`--mem-gb`) and a disk spool (`--spool-gb`). For each frame it calls, in order of preference, `window.__engine.still(t, samples, shutter)`, the optional page hook `window.__still(t, samples, shutter)`, then `window.__renderFrame(t)`. Keep sub-frames inside the current shot ([chapter 6](06-building-scenes.md#motion-blur-never-across-a-cut)). `--cuts` reads shot starts from `window.__engine.timeline` or `window.TOUR.beats`.

Confirm the GPU before estimating time: log `UNMASKED_RENDERER_WEBGL` from the `WEBGL_debug_renderer_info` extension. A software renderer is many times slower.

Measured throughput, encode included (state ETAs from these, never from GPU-only frame times):

| Capture method | Film | Throughput |
|---|---|---|
| Screenshot per frame, 4 workers, PNG to ffmpeg in resumable chunks | 8,968 frames at 30 fps | about 3 fps (about 51 min) |
| Canvas JPEG over a WebSocket, one worker | 1,800 frames at 1080p60, raymarched | 36.6 fps |
| `readPixels` raw frames from 3 GPU workers, `x264 -tune grain`, 1080p60 | 15,601 frames (4:20) | 22.7 fps (11 min 28 s) |
| Same pipeline, simpler scenes | 11,269 frames (3:08) | 32.4 fps (6 min) |
| Canvas2D JPEG pipe, vertical short | about 810 frames | 84 to 104 fps |
| Canvas2D PNG pipe, illustrated explainer | 22,407 frames | 19.6 fps |

Encode-side lessons that cost a full render once each:

* Render in chunks to temporary names and mark them complete only after a successful encode. Resume only chunks whose source, audio, analysis, frame range, size and encode settings match; file existence alone is not enough after a code change.
* Hash large files in chunks. Reading a 2.9 GB export into one Node buffer failed after the render had succeeded; keep manifest writing separate from rendering so it can be repaired alone.
* `-color_primaries` and similar output flags did not reach the stream in one pipeline; `-vf ...,setparams=color_primaries=bt709:color_trc=bt709` after `scale=out_color_matrix=bt709` did. Probe the output's tags.
* `-shortest` trimmed four frames (and the closing beat) in one re-encode and made ffmpeg exit early under a two-worker render in another. Probe frame count and duration against the source before replacing anything.
