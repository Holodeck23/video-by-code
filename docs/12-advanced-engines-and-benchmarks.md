# 12. Advanced Engines, Shaders & Quantitative Benchmarks

This chapter records the concrete engines, mathematical formulas, shader rules, and measured luminance/color benchmarks extracted from the full production lineage (Three.js/WebGL lyric films, 6-stem instrumental visualizers, multi-worker 60 fps kinetic typography, Blender 3D story-world videos, hand-drawn doodle explainers, and Pillow/FFmpeg captioned workbooks).

Every runnable tool and browser module referenced here is bundled directly in [`tools/`](../tools/) and [`lib/`](../lib/).

---

## 1. End-to-End Stem Separation, 120 Hz Feature Packing & Pitch Tracking

When a film reacts to a full song rather than a simple RMS envelope, run the two-stage audio preparation pipeline:

```sh
# 1. Normalize to 44.1 kHz stereo WAV, record SHA-256 identity, and split 6 stems via Demucs:
uv run --python 3.12 tools/timing/separate-stems.py "$PROD/audio/song.mp3" \
  --out-dir "$PROD/analysis" --model htdemucs_6s

# 2. Extract 120 Hz stem envelopes, beat/bar phase, monotone musical time (tau),
#    silence windows, binary features.f32, and 100 fps guitar pyin f0 + vibrato:
uv run --python 3.12 tools/timing/analyze-stems.py "$PROD/analysis" \
  --fps 120 --stem-pitch --stem-fps 100
```

### Key Signal-Processing Rules (`tools/timing/analyze-stems.py` & `lib/features.js`)

1. **Dual-anchor tempo tracking:** Beat trackers frequently half-time sparse openings or halftime bridges. `analyze-stems.py` runs primary beat tracking (Beat This! DBN when installed, falling back to `librosa` on harmonic-percussive separated `drums + bass`), checks the global median BPM against the rock/electronic prior (`95–175 BPM`), and repairs isolated half-time gaps via `2x` subdivision when local IBI exceeds `1.75 × median_ibi`.
2. **Window-edge-compensated silence detection:** Because STFT RMS frames (`frame_length = 2048`) smear energy outward by half a window (`1024 / 44100 ≈ 0.023 s`) at each boundary, raw RMS thresholding under-reports brief dramatic mutes. `find_silences()` shrinks the detected silence start by `-edge` and extends the end by `+edge`, recovering sub-150 ms dead-air gaps (`drums < -36 dB && full < -32 dB` for `>= 0.08 s`).
3. **Noise-floor auto-gating in the browser (`lib/features.js`):** 6-stem separation (`htdemucs_6s`) always produces a `piano` and `guitar` stem even when the instrument is absent. `FEATURES.load()` checks the peak-to-mean span of every stem channel on load; any stem with `span < 0.04` has its `level`, `env`, and `onset` zeroed out so bleed never triggers visual transients.
4. **Monotone musical time (`tau`):** Never multiply `t * energy` in a shader or particle drift—when `energy` drops, time reverses. `analyze-stems.py` integrates a strictly non-decreasing curve `tau(t)` (`base_rate = 0.25 + 1.35 * full_env + 0.40 * drum_env`), and `FEATURES.load()` exposes `f.tau(t)` for shaders and camera travel.
5. **100 fps lead-guitar pitch & vibrato (`--stem-pitch`):** Extracts `librosa.pyin` (`E2` to `E6`, `82.4–1318.5 Hz`), normalized log-pitch `pitch_norm`, and vibrato modulation depth (`4–9 Hz` bandpass over `f0` derivative) into `stem-features.json` for solo-reactive ribbon geometry.

---

## 2. Multi-Backend Lyric & Speech Alignment (`tools/timing/align-words.py`)

Different audio sources require different alignment strategies:

| Mode | Command | Best For |
|---|---|---|
| Local `whisper.cpp` DTW | `uv run tools/timing/align-words.py vocals.wav --script lyrics.txt --backend whisper-cli --out words.json` | Fast local CPU/Metal speech & clean vocals with `SequenceMatcher` script projection |
| Apple Silicon `mlx-whisper` | `uv run tools/timing/align-words.py vocals.wav --script lyrics.txt --backend mlx-whisper --out words.json` | High-accuracy large-v3-turbo word timestamps on Apple Silicon |
| `faster-whisper` | `uv run tools/timing/align-words.py vocals.wav --script lyrics.txt --backend faster-whisper --out words.json` | Cross-platform CTranslate2 word timestamps |
| Acoustic energy warping | `uv run tools/timing/align-words.py vocals.wav --cues cues.json --beats beats.json --backend acoustic --out words.json` | Dense rock/scream vocals where ASR drops words; distributes syllables across `280–3400 Hz` vocal energy with 2-bar clamping and 16th-note gang-vocal snapping |

### Post-Alignment Guards (`align-words.py` & `lib/features.js`)
* **First-word pre-silence trim (`fixFirstWord`):** Forced aligners routinely attach leading instrumental bars to word 0 of a phrase (`e.g., t0 = 5.76 s → t1 = 15.14 s`). Both `align-words.py` and `FEATURES.fixFirstWord()` clamp `w0.t0 = max(w0.t0, w0.t1 - 0.45)` and recompute `line.t0`.
* **Over-long phrase split:** Any aligned line with `> 14 words` or an internal word gap `> 2.5 s` is split automatically at the largest internal pause so on-screen typography never overflows a 2-line card.
* **Verbatim-lift gate (`tools/verify/check-lift.py`):** Before rendering lyrics or spoken scripts written near a reference source, run `python3 tools/verify/check-lift.py candidate.txt reference.txt` to verify zero substantive 4/5/6-gram overlap.

---

## 3. Quantitative Look, Luminance & Color Benchmarks

Visual review is backed by hard pixel distribution targets measured via `tools/verify/measure-look.py`.

### Dark-Ground Atmospheric & 3D Videos (Reference: *LGTM* Chorus Benchmark)

| Metric | Target Range | Failure Mode When Violated |
|---|---|---|
| Frame median luminance (`Y`) | `18 – 24` (0–255 scale) | `< 12` = muddy void; `> 40` = washed-out grey fog |
| Frame mean luminance (`Y`) | `25 – 32` | Over-lit background planes competing with foreground type |
| Mid-tone occupancy (`Y > 64`) | `10% – 14%` of pixels | Scene lacks structural mid-tone depth (silhouette/grid/fog) |
| Bright accent occupancy (`Y > 128`) | `1.8% – 4.6%` of pixels | `< 1%` = lifeless; `> 8%` = blown-out bloom washing out lyrics |
| Specular highlight cap (`Y > 200`) | `< 1.5%` of pixels | Unreadable white-on-white lyric collisions |

**Dark-ground shader & grade rules (`lib/webgl-post.js`):**
1. **Linear-RGB background lift:** In GLSL sky/background shaders, lift the deep ink ground by `mix(C_INK, C_INK2, 0.20)` in linear RGB and clamp red/amber alarm washes (`sev1`) so they never flood the frame above `Y = 32`.
2. **Selective HDR bloom (`FxOverShader`):** Only push pixels into HDR bloom when they are **both** bright (`luma > 0.35`) and warm/saturated (`warmth > 0.06` or `sat > 0.28`). Never bloom neutral white UI/subtitle text (`u_bloomStrength <= 0.38`, `threshold >= 0.78`).

### Light-Ground Editorial / Paper Videos (`paperMode > 0.5`)

| Metric | Target Range | Failure Mode When Violated |
|---|---|---|
| Frame median luminance (`Y`) | `206 – 235` | Paper looks dingy (`< 195`) or sterile `#FFFFFF` (`> 245`) |
| Dark ink occupancy (`Y < 64`) | `4% – 14%` of pixels | Over-inked frame or hairlines too thin to survive 4:2:0 |
| Highlight roll-off | Soft knee above `0.82` | Standard ACES tone-mapping crushes warm cream paper (`#F2EDE2`) to dull grey (`Y ≈ 190`); `FinalGradeShader` switches to a paper-preserving soft-knee curve when `u_paperMode > 0.5`. |

### Luma-Only Impact Inversion (`u_invert`)
Never invert RGB channels via `1.0 - col` on a branded palette: warm `#FF2A00` vermilion inverts to `#00D5FF` cyan, violating palette discipline. Invert **luminance only** while preserving chromaticity:

```glsl
float y = dot(col, vec3(0.2126, 0.7152, 0.0722));
vec3 invLuma = clamp(col + (1.0 - 2.0 * y), 0.0, 1.0);
col = mix(col, invLuma, u_invert);
```

---

## 4. 3D Typography, Frustum Math & Raymarched SDF Rules

### 3D `TextPlane` Frustum Sizing
When placing 3D typography in a Three.js perspective camera (`fov` in degrees, aspect `A = 16/9`, distance `d = |cam.z - text.z|`), the visible world height and width at depth `d` are:

$$H_{\text{vis}}(d) = 2 \cdot d \cdot \tan\left(\frac{\text{fov} \cdot \pi}{360}\right), \qquad W_{\text{vis}}(d) = H_{\text{vis}}(d) \cdot A$$

At `fov = 42°` and `d = 6.8`, $H_{\text{vis}} \approx 5.22$ world units and $W_{\text{vis}} \approx 9.28$ world units.
* **Safe-width rule:** Keep `textPlane.width <= 0.78 * W_vis(d)` (`<= 7.2` units at `d = 6.8`). For a 38-character lyric line, cap font height at `capH <= 0.28` world units (`planeW <= 8.5`).
* **Subtitle clearance rule:** When a bottom 2D subtitle bar occupies `y_screen > 0.78`, anchor 3D hero typography at world `y >= 1.8` (for camera `y ≈ 1.4–1.6`) so 3D cards never collide with 2D captions.

### Raymarched SDF Rules
1. **No polar `atan(z, x)` on horizontal planes:** Displacing a ground plane with `sin(atan(p.z, p.x) * N)` creates a degenerate pinch point at the origin `(0, 0)` where all radial spokes collide. Replace polar displacement with an **isotropic 3D Gyroid wave field**:
   ```glsl
   float gyroid(vec3 p, float k) {
     vec3 q = p * k;
     return dot(sin(q), cos(q.yzx)) / 3.0;
   }
   ```
2. **No Blinn-Phong `normalize(L + V)` bullseye on central spheres:** When a directional light `L` is nearly opposite the view vector `V` (`L + V ≈ 0`), `normalize(L + V)` flips erratically across the center of a sphere, creating a concentric bullseye artifact. Use offset key lighting (`L = normalize(vec3(0.55, 0.75, 0.35))`) or Schlick-GGX with clamped `NoH`.

---

## 5. Story-World State & Blender 3.x / 4.x / 5.0 Rules

When building a continuous narrative world (whether in Three.js or headless Blender Python):

1. **World memory is a pure function of `t`:** Persistent consequences (a cracked screen at `t = 42.0 s`, a flipped status badge at `t = 78.4 s`, scorch marks after an impact) are declared in a static event table `EVENTS = [{ t: 42.0, kind: 'crack', pos: [x,y] }, ...]` and queried via `events.filter(e => t >= e.t)`. Seeking backwards immediately restores the uncracked state.
2. **Fractional cut boundaries in Blender:** Frame-accurate cuts computed from audio timestamps (`t_cut * fps`) must use `math.ceil(t_cut * fps)` consistently for both outgoing shot end and incoming shot start so no 1-frame black gap or overlap occurs.
3. **Blender 5.0 API compatibility:**
   * EEVEE Next uses `scene.render.engine = 'BLENDER_EEVEE'` (or `'BLENDER_EEVEE_NEXT'` on 4.2–4.3); probe `bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items.keys()` rather than hardcoding.
   * Always set keyframe interpolation explicitly to `'LINEAR'` or `'BEZIER'` after inserting FCurve keys (`kp.interpolation = 'LINEAR'`) when driving stepped mechanical motion.

---

## 6. Hand-Drawn Doodle & Narrated Storyboard Rules (`lib/ink-doodle.js`)

For high-retention whiteboard/notebook explainers (`spoken-video-engine` lineage):

1. **8 fps deterministic line-boil (`INK.setBoil(t, seed)`):** Quantize wobble phase to `floor(t * 8)` (`125 ms` holds). Boiling at 30/60 fps looks like electric jitter; 8 fps reads as traditional 2D animation on threes/fours.
2. **Left-anchored ALL-CAPS write-on (`INK.marker`):** Never animate write-on text with `textAlign = 'center'` by slicing `text.slice(0, n)`—every new character shifts the entire word left. Measure the full string width once, compute `x_left = cx - fullW / 2`, and draw the partial prefix left-aligned from `x_left`.
3. **Shot density & camera POI table (`INK.plate`):**
   * Target mean shot length of **1.6–1.9 s** (`30–38 shots` per 60 seconds).
   * Drive Ken Burns moves from normalized Points of Interest (`fx, fy` in `0..1` image coordinates) with `zoom <= 1.28`.
   * **Never horizontally flip (`scale(-1, 1)`) an illustrated plate that contains clock faces, signage, or UI text.** Draw clocks and callout labels in a separate unflipped Canvas layer over the plate.
4. **TTS pronunciation & ASR round-trip (`tools/timing/kokoro-narrate.py` & `tools/verify/verify-narration.py`):**
   * Merge sentence fragments `< 4 words` into the preceding chunk before calling Kokoro TTS so short fragments do not trigger prosody rush or trailing silence clipping.
   * Pass `--say say.json` to map acronyms and years (`"2026" -> "twenty twenty-six"`, `"SQL" -> "sequel"`) only inside the TTS payload while keeping display captions clean in `timing.json`.
   * Run `uv run tools/verify/verify-narration.py narration.wav timing.json` to verify zero 3-word runs of dropped or mangled speech.

---

## 7. High-Throughput & Deterministic Renderers (`tools/render/`)

| Renderer | Command | When to Use |
|---|---|---|
| Single-worker reference (`starter/render.mjs`) | `node starter/render.mjs page.html --out master.mp4` | Default 30 fps Canvas2D + `SOUND.renderOffline` projects up to ~90 seconds |
| Multi-worker GPU WebSocket (`tools/render/parallel-ws-render.mjs`) | `node tools/render/parallel-ws-render.mjs --url http://127.0.0.1:5173/?capture=1 --duration 215 --fps 60 --workers 4 --out master.mp4` | 60 fps full-length (3–5 min) WebGL/Three.js or kinetic-typography films; includes RFC 6455 continuation-frame reassembly (`> 128 KB`), RAM/disk spool safety budgets, multi-subframe motion blur (`--samples`), and 4-frame cut contact sheets (`--cuts`) |
| Python + Pillow rawvideo (`tools/render/workbook-render.py`) | `uv run tools/render/workbook-render.py --spec workbook.json --audio voice.mp3 --out-dir "$PROD"` | Zero-browser deterministic captioned workbooks & dark-card tutorials; pipes `rgb24` directly to FFmpeg with explicit BT.709 conversion/tags and emits `poster.png`, `.srt`, and `qa/storyboard.png` |
| Reference-locked batch imagegen (`tools/render/codex-imagegen.sh`) | `REF_IMAGE=ref.png bash tools/render/codex-imagegen.sh prompts.tsv "$PROD/plates" 4` | Generating consistent character/scene plates across 20–40 storyboard shots in parallel while locking style to a master reference PNG |
