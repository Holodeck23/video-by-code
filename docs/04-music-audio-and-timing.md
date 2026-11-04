# 4. Music, audio identity and timing

Treat the selected audio file as the production's timing authority. A song prompt, lyric sheet, nominal BPM or embedded subtitle stream is evidence about intent, not proof of what happens in the take.

The order of work in this chapter:

| Step | Tool | Output you keep |
|---|---|---|
| Pin the take | `tools/timing/audio-identity.py` | `identity.json`, `analysis.wav` |
| Read embedded cues | `tools/timing/embedded-lyrics.py` | `embedded-cues.json` (hints only) |
| Separate stems (optional) | `tools/timing/separate-stems.py` | `analysis/stems/<model>/<slug>-44k/*.wav` |
| Measure features | `tools/timing/analyze-stems.py` | `analysis.json`, `features.f32`, `structure-map.png` |
| Fit and check the grid | `tools/timing/beat-grid.py` | `beats-checked.json` |
| Locate scored events | the scans below | a located/absent table in the song map |
| Time the words | `tools/timing/align-words.py` plus review | `words.json` with provenance |

Python tools declare their dependencies in PEP 723 headers; run them with `uv run`. Read each tool's `--help` before first use.

## Pin the exact take

Keep two homes and never mix them. Renderer code lives in a version-controlled checkout. Everything the production makes or consumes (selected audio and its hash, lyric sheet, stems, analysis, timing, every render pass, contact sheets, treatment and log) lives in one durable production folder outside the checkout. Link into it rather than copying media into the repository. A render finished in a tool's scratch directory is copied into `$PROD/renders/<pass-name>/` in the same session, and the log records where.

Copy the chosen audio into the production folder before analysis. Keep the original compressed file and create a decoded analysis copy. Avoid repeated lossy conversion. Record the original filename, SHA256, codec, sample rate, channels and duration.

From the kit root, with `PROD` set to an existing production folder and the selected take copied to `source/selected.m4a`:

```bash
uv run tools/timing/audio-identity.py "$PROD/source/selected.m4a" "$PROD/analysis/audio"
```

The tool writes `identity.json` (SHA256, byte size, ffprobe JSON, codec facts, warnings, analysis-copy hash) and a 48 kHz stereo 16-bit `analysis.wav` (`--rate` changes the rate). It refuses to overwrite existing results unless `--force` is explicit. The analysis copy is a decoded working version; it does not improve the source quality.

Read the warnings. Each has a consequence:

| Warning | Why it matters | What to do |
|---|---|---|
| `.m4a`/`.mp4` whose audio is Opus | Many players and MP4 muxers expect AAC. In one re-encode, `-c:a copy` from an `.m4a` silently put Opus into the MP4 | Re-encode to AAC from the original at the final mux; record the conversion |
| A subtitle stream is present | Some AI-music exports carry the lyric sheet as `mov_text` | Run `embedded-lyrics.py` (below) |
| Sample rate below 44.1 kHz, or mono | Facts about the source | Not automatic reasons to reject useful speech |

Use the same selected take for the edit and the final mux. Mux the original, not a browser playback derivative: compounding lossy encodes costs quality, and one production muxed a separately made MP3 whose origin nobody had recorded. If a trim, time stretch, replacement take or mastering step changes the timing, regenerate or transform every dependent timing artifact and record the operation. A file with the same name can still have different bytes; compare the hash.

## Establish the timeline origin

Decide whether `t=0` means the original file's start or an intentional trimmed start. Keep the choice visible in the manifest. If the narration has 6.65 seconds of leading silence, subtract that offset from all dependent cues only when the render uses an identically trimmed audio track. `align-words.py --offset 6.65` applies it to every aligned time.

Do not subtract an offset twice. A cue file measured against trimmed audio is already on the trimmed clock. A useful timing header includes:

```json
{
  "audioSha256": "replace-with-the-selected-file-hash",
  "origin": "decoded source start",
  "offsetSeconds": 0,
  "method": "manual review plus ASR estimates",
  "verifiedByListening": false,
  "lines": []
}
```

This is a suggested production schema. The kit does not automatically ingest every field; your scene loader and validators should agree on the schema.

## Extract embedded lyric cues as hints

Some music exports carry `mov_text` subtitles: one cue per sung line plus cues that are only section tags such as `[Chorus]`. Check before proposing transcription or an external API:

```bash
ffprobe -v error -show_entries stream=index,codec_type,codec_name -of compact "$PROD/source/selected.m4a"
```

A `codec_name=mov_text` line means cues exist. Extract them from the original container, before converting to WAV:

```bash
uv run tools/timing/embedded-lyrics.py "$PROD/source/selected.m4a" "$PROD/analysis/embedded-cues.json"
```

The output separates `sections` (cues whose whole text is a bracket tag) from sung `cues`, marks every time `verified=false`, and flags each cue:

| Flag | Rule in the tool | What it usually means |
|---|---|---|
| `runaway` | longer than 2 × the time the line needs (`max(1.6 s, 0.072 s × characters)`) and over 3 s | The cue end runs across an instrumental break to the next cue or tag |
| `crosses-section` | ends after a later section tag starts | Possible in sidecar SRTs |
| `overlaps-next` | ends after the next cue starts | Exporter error |
| `long` | longer than `max(7 s, 0.45 s × words)` | Held line, or a runaway |
| `short` | shorter than 0.5 s | Fragment or ad-lib |

If no subtitles exist, the tool writes `found=false` with empty lists and exits 0; this is a valid outcome and normal for an instrumental.

### Why cue times are only hints

On one 4:20 machine-made track the stream yielded 96 cues including the bracketed section tags. That removed the need to find lines, but the times were unreliable in two directions:

- **Late starts.** On another track the final chorus cue sat at 3:29 but was sung at 3:52, and a bridge cue at 2:36 was sung at 2:47. Repeated sections can drift.
- **Runaway ends.** Cue ends are often flat placeholders that run to the next cue. One line sung at 8.86 s had a raw cue end of 30.40 s, across a 16-second instrumental break. Another ended at 238.48 s, at the start of the next section. A closing line had a 47-second window. Spreading words evenly over those windows smeared them across the break at one to three seconds per word.

Clamp each line's active window before distributing any words in it:

```python
def active_window(cue, next_cue, bar_s):
    """Clamp a cue to the time the line could plausibly take to sing."""
    need = max(1.6, len(cue["text"]) * 0.072)          # seconds the characters need
    end = cue["start"] + min(2 * bar_s, need)          # never more than two bars
    if next_cue is not None:
        end = min(next_cue["start"] - 0.04, end)       # and never into the next line
    return cue["start"], end
```

That is `min(next.start − 0.04, start + min(2·bar, max(1.6, chars·0.072)))`. `align-words.py --backend acoustic` applies the same clamp (with a 0.35 s floor). Preserve the raw cue times; record any display-hold adjustment separately, and never let a hold overlap the next sung cue. Subtitle extraction alone never proves transcription accuracy.

## Make a measured song map

Listen to the chosen take and create a section table with actual start and end times: intro, verse, chorus, bridge, break, final return and ending. Name functions as well as genre labels: establish, build pressure, release, interruption, changed return.

### Novelty sections are proposals

`analyze-stems.py` proposes sections from a checkerboard novelty curve over a bar-synchronous self-similarity matrix and writes them as `sections_proposed`, with a note to confirm by ear. Machine boundaries fail in ways that look plausible:

- A sign error in the novelty kernel turned structural peaks into troughs and collapsed one whole song into a single section.
- On another song a correct detector still produced one 92-second block.

In both cases the usable map came from stems plus word times plus playback. Use the stem energies, the line starts and your ears to resolve boundaries; then write the measured section file the grid check uses.

### Scored events: located or absent

AI music models treat bracket directions as weak hints. Silences, strips, builds, intro lengths and outro hits written into the lyric field frequently do not exist in the take, or exist somewhere else. Before designing, test each promised event against the audio and record it as located (start, end, evidence) or absent.

| Intended event | Measured result | Edit consequence |
|---|---|---|
| Two beats of silence before the final chorus | Absent: the mix never drops | Hard cut to a clean frame on the downbeat instead of a blackout |
| "Two beats of silence" (another take) | A four-bar drum dropout; the mix keeps going | Empty the drum-driven layer; keep the moving vocal layer |
| Stripped bridge | Drums continue; the band drops out for 3 s elsewhere | Move the visual valley to the real 3 s |
| Twelve-second intro | Absent; voice begins early | Bring the subject in before the first words |
| Twenty-four-bar final drop | Eight bars | Shorten the planned escalation |
| Glitch break | Absent | Do not fake it with a visual |

Four scans find the facts:

1. **Dropout scan, 20 ms RMS over the mix.** A "silence" the mix never reaches is not a silence.

```python
# uv run --with numpy --with soundfile python3 dropouts.py "$PROD/analysis/audio/analysis.wav"
import sys, numpy as np, soundfile as sf
y, sr = sf.read(sys.argv[1], always_2d=True); y = y.mean(axis=1)
hop = int(0.020 * sr)                                    # 20 ms windows
n = len(y) // hop
db = 20 * np.log10(np.sqrt((y[:n * hop].reshape(n, hop) ** 2).mean(axis=1)) + 1e-9)
quiet = db < -45.0                                       # record the threshold you used
start = None
for i, q in enumerate(np.append(quiet, False)):
    if q and start is None: start = i
    elif not q and start is not None:
        if i - start >= 2: print(f"dropout {start * 0.02:8.2f}-{i * 0.02:8.2f} s")
        start = None
```

2. **Per-bar, per-stem RMS against the downbeats.** Strips, drum dropouts and bass drops show as one stem falling 40 dB or more for a bar while the mix barely moves.

```python
# downbeats from beats-checked.json; stems from separate-stems.py
import json, numpy as np, soundfile as sf
PROD, SLUG = "/absolute/path/to/production", "song"
def bar_db(path, downbeats):
    y, sr = sf.read(path, always_2d=True); y = y.mean(axis=1)
    out = []
    for a, b in zip(downbeats, downbeats[1:]):
        seg = y[int(a * sr):int(b * sr)]
        out.append(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9))
    return np.array(out)
dbs = json.load(open(f"{PROD}/analysis/beats-checked.json"))["downbeats"]
stem_dir = f"{PROD}/analysis/stems/htdemucs_6s/{SLUG}-44k"
mix = bar_db(f"{PROD}/analysis/{SLUG}-44k.wav", dbs)
for stem in ["drums", "bass", "vocals", "other"]:
    s = bar_db(f"{stem_dir}/{stem}.wav", dbs)
    for k in range(1, len(s)):
        if s[k - 1] - s[k] >= 40 and abs(mix[k - 1] - mix[k]) < 6:   # 6 dB = "barely moves", a choice
            print(f"{stem} drops {s[k-1]-s[k]:.0f} dB at bar {k} ({dbs[k]:.2f} s)")
```

3. **Zoom.** Inspect 100 ms windows with beats marked over every region the brackets describe. `analyze-stems.py` also writes `structure-map.png` with per-stem energy, onsets, sections and silences.
4. **Read the transcript for sections the sheet does not have**: post-chorus ad-libs, an added hook at the top of a final chorus, a spoken bridge that keeps its drums. Also watch for prompt bleed: one ASR pass "heard" lyric text over the first 0.7 s of an instrumental intro.

Then design to the located facts. An absent event is not faked with a visual.

### Silence detection loses half a window at each edge

An RMS window smears energy outward, so a naive threshold reports dead air short. One detector read 0.906 s for a true 0.952 s gap, one window narrow. `analyze-stems.py` pushes each silence edge out by half a window (`1024 / 22050 / 2 ≈ 23 ms`), with a floor of −45 dB and a minimum length of 0.35 s, and writes the result as `silences`. Generate known-answer audio with `uv run tools/timing/make-test-audio.py OUTDIR` to confirm a detector before trusting it on the real take.

## Beat grids: tempo is not phase

A grid needs both a period and an origin. At 120 BPM the beat period is 0.5 s, but the first audible beat might be at 0.23 s. Bar position adds another choice: which beat is beat one?

```bash
uv run --python 3.12 tools/timing/beat-grid.py "$PROD/analysis/audio/analysis.wav" "$PROD/analysis/beats.json" --tempo-hint 120
```

This uses librosa's onset envelope and beat tracker. It is an estimate. The reported BPM summarises detected intervals; it does not prove that every musical event lies on one constant grid. Some trackers quantise inter-beat intervals, so a median BPM can read about 1% low; over a four-minute song that error accumulates past a beat. Cut on per-beat event times from the grid, never on `n × 60 / median_bpm`.

### Machine-made music: fit one constant tempo

Tracks generated by a model or locked to a click do not drift. Fit one period and phase by regression:

```bash
uv run --python 3.12 tools/timing/beat-grid.py "$PROD/analysis/audio/analysis.wav" "$PROD/analysis/beats-constant.json" --constant --tempo-hint 120
```

The tool regresses beat times on integer beat indices, re-indexes and refits, drops outliers more than a quarter beat out, then slides the phase within ±60 ms onto a fine onset envelope. It reports the RMS residual. Reference points:

| Track | Method | Result |
|---|---|---|
| A four-minute machine-made song | constant regression | 116.990 BPM, 18.9 ms RMS residual over 504 beats |
| A three-minute machine-made song | kick grid from the separated drum stem | 402 beats at 129.174 BPM, 10.7 ms jitter |
| A take whose prompt asked for 128 BPM | per-beat tracking with cleanup | drifted from 129.1 to 132 BPM; a fixed 128 BPM grid matched only 29% of measured kicks |

The third row is the warning. A nominal tempo, a prompt instruction or "it's synthetic" does not justify `--constant`. Played music drifts, and some generated takes do too. A low residual means the detections fit one model; it does not prove they are the correct musical beat. Strong offbeats, half-time or double-time readings can produce plausible but wrong grids.

Check a grid against the kicks independently:

```python
# uv run --python 3.12 --with librosa python3 grid_hits.py
import json, librosa, numpy as np
PROD, SLUG = "/absolute/path/to/production", "song"
beats = np.array(json.load(open(f"{PROD}/analysis/beats-constant.json"))["beats"])
y, sr = librosa.load(f"{PROD}/analysis/stems/htdemucs_6s/{SLUG}-44k/drums.wav", sr=22050)
kicks = librosa.onset.onset_detect(y=y, sr=sr, units="time")
near = np.min(np.abs(kicks[:, None] - beats[None, :]), axis=1)
print(f"{(near < 0.035).mean():.0%} of drum onsets within 35 ms of a grid beat")   # tolerance is a choice
```

A grid that matches a minority of kicks is the wrong grid, whatever its residual. For played music, use per-beat tracking and clean it: drop beats closer than 0.7 local intervals, fill gaps longer than 1.5 intervals.

### Downbeats: assert them, never trust the heuristic

Without section information, the tool picks beat one as the offset with the highest mean onset strength. That heuristic can be wrong by one or two beats, for example on tracks with strong offbeats. On one track it chose the wrong phase and placed the first chorus cut at 71.036 s against a 72.048 s section start: 1.012 s early, cutting mid-word through the end of the pre-chorus.

Author a measured section file:

```json
{"sections":[{"name":"chorus-1","start":72.048},{"name":"chorus-2","start":118.91}]}
```

Then check every section start against the downbeats and against the words:

```bash
uv run --python 3.12 tools/timing/beat-grid.py "$PROD/analysis/audio/analysis.wav" "$PROD/analysis/beats-checked.json" \
  --constant --sections "$PROD/analysis/sections-measured.json" --words "$PROD/analysis/words.json" \
  --meter 4 --tolerance 0.12
```

The assertion is two conditions for every section:

1. a downbeat lies within ±120 ms of the section start: `abs(downbeat − section.start) <= 0.120`;
2. that downbeat falls after the last word of the preceding line: `downbeat >= prev_line.words[-1].end`.

The tool picks the offset whose downbeats sit closest to the section starts, prints what the heuristic would have picked, prints an ok/FAIL row per section with the worst offset error, and on any violation exits 1 and writes nothing. `--downbeat-offset N` forces an offset; the assertions still run. Supply only sections that should land on downbeats: a pickup vocal or a free-time opening may not. Passing unverified embedded tags into this assertion merely tests one estimate against another.

## Stems: useful, leaky, and sometimes empty

Stem separation lets drums drive impacts, bass drive mass or camera weight and melody drive form or colour. A single full-mix envelope cannot represent an instrument dropping out.

```bash
uv run --python 3.12 tools/timing/separate-stems.py "$PROD/source/selected.m4a" "$PROD" --slug song
uv run --python 3.12 tools/timing/analyze-stems.py "$PROD" --slug song --stem-pitch
```

`separate-stems.py` writes a 44.1 kHz stereo WAV, `audio-identity.json`, `audio-probe.json` and Demucs stems for `--models` (default `htdemucs_6s,htdemucs_ft`) on `--device` (auto: `mps`, `cuda` or `cpu`). It is idempotent and never modifies the source. Demucs adds a model download, processing time and separation artefacts; check its licence and requirements for your use.

Model names are choices, not a guarantee of clean isolation:

- The six-stem model always writes `guitar` and `piano`, even when no such instrument plays.
- A six-stem "guitar" contained a distorted synth in a guitar-free intro. It was useful as a mid-range lead layer, not evidence of a guitar.
- A "vocals" stem on an instrumental can contain effects and separation residue.

### Keep an absolute noise floor

Per-track percentile normalisation inflates an absent instrument's residue into full motion. The analysis keeps an absolute reference where it matters and gates the rest:

| Curve | Scaling in `analyze-stems.py` | Consequence |
|---|---|---|
| `<stem>.level` | absolute: `(dB + 60) / 60`, clipped to 0..1 | Silence stays 0 |
| `<stem>.env` | attack 10 ms / release 250 ms follower of `level` | Motion with weight |
| `<stem>.onset`, `<stem>.bright` | percentile-normalised (2nd to 99.5th) | Residue can look like a full-scale signal |

`lib/features.js` therefore tests whether each stem is present: if the spread of `level` between its 5th and 98th percentiles is under 0.04 (about 2.4 dB on that scale), the stem is marked absent and `norm()` returns 0 for it, and it contributes no onsets. Onsets are rising crossings of 0.45 with a 70 ms refractory window, so one attack is one event. Record these thresholds in the production log, and check by eye that an instrument's layer empties where `structure-map.png` shows it stop.

## Derive motion from measured features

`analyze-stems.py` writes curves at 120 samples per second into `features.f32`, described in `analysis.json`:

```json
"features": {"file": "features.f32", "rate": 120, "frames": 35873, "dtype": "float32-le",
             "layout": "[feature][frame]", "names": ["bar.phase", "bass.bright", "...", "tau"]}
```

Names are `mix.*` and `<stem>.{level,env,onset,bright}` for each stem found, plus `beat.phase`, `bar.phase` and `tau`. Validate the byte length before trusting the file: it must equal `names.length × frames × 4`. The loader throws on a mismatch, which catches a stale feature file next to a regenerated `analysis.json`.

```js
const f = await FEATURES.loadAnalysis('analysis');            // fetches analysis.json + features.f32
function drawLayer(ctx, t) {
  const kickHit = f.pulseAt(f.onsets.drums, t, 0.12);         // decays from the latest drum onset
  const mass = f.norm('bass', 'env', t);                      // 0 when the bass stem is absent
  const travel = f.sample('tau', t);                          // musical time, see below
  const section = f.downbeats[f.cursorAt(f.downbeats, t)];    // most recent bar line
  if (f.inSilence(t)) return;                                 // measured dead air: empty frame
  // ... draw from kickHit, mass, travel
}
```

All lookups are pure functions of `t`: binary search for events, linear interpolation for curves. Design the four timescales deliberately:

| Timescale | Audio evidence | Visual role |
|---|---|---|
| Form | sections, repeated motifs, instrumentation changes | worlds, palette evolution, major transformations |
| Phrase | downbeats, phrase starts, builds and drops | camera moves, reveals, anticipation, cuts |
| Beat | beats and per-stem onsets | impacts, pulses, sparks, brief light changes |
| Texture | per-stem level, envelope, brightness | density, mass, speed, roughness, colour |

Use event timestamps for cuts and hits. Use smoothed envelopes for breathing, light intensity or material activity. Anticipation can use the known future: tighten framing or reduce light in the phrase before a drop. That is a creative choice, not a rule that every cut lands on a downbeat.

### Musical time, `tau(t)`

Never multiply time by energy (`noise(t * energy)`): when energy falls, the product falls and motion runs backwards. Integrate instead. `analyze-stems.py` computes

```text
drive(t) = 0.35 + 0.65 · mix.env(t) + 0.5 · drums.onset(t)     (mix.onset if no drum stem)
drive    = attack 50 ms / release 600 ms follower of drive
tau(t)   = cumulative sum of drive / mean(drive), divided by 120
```

Because `drive` is always positive, `tau` is strictly increasing; normalising by the mean makes it advance one second per second at average energy, faster when the track is loud and busy. Drive noise, travel and particle phase from `f.sample('tau', t)`. The bottom panel of `structure-map.png` plots `tau − t`, which shows where the film will run ahead of or behind the clock. Store or deterministically integrate it; never accumulate it from whatever frame happened to render previously.

### Optional lead and percussion detail

`--stem-pitch` also writes `stem-features.json` at 100 frames per second: `guitar_f0` from pYIN between A2 and E6 (taken from the guitar stem, else `other`, else the mix), `guitar_f0_norm`, `guitar_vibrato` (frame-to-frame pitch movement, gated to where the lead is audible), `kick_hit` and `snare_hit`, `bass_sub` (35 to 95 Hz) and `filter_cutoff` (spectral centroid of `other`, mapped from 380 to 3400 Hz). Each is an estimate; check that `guitar_f0` follows the audible lead before tying geometry to it.

Design behaviour for absent stems and silence. A missing vocal should empty a vocal-driven layer rather than leave a permanent low-level flutter. One transient peak should not flatten the rest of the film.

## Time words against the sound

For kinetic typography, word timing is the genre. Spreading a line's words by character count inside a cue is adequate for a rough structural pilot and wrong for the film: words land early or late by most of a second.

### Methods and what they prove

| Method | What it does | What it does not prove |
|---|---|---|
| Embedded cue | Reads exporter metadata | Actual syllable onset |
| ASR word timestamps | Recognises sound and estimates word spans | Exact lyric correctness or reliable silence boundaries |
| Script matching | Matches ASR tokens to known words | That unmatched words were sung |
| Interpolation | Distributes unmatched words between anchors | Any measured word timing |
| Acoustic warping | Distributes syllables over vocal-band energy inside a clamped window | Correct boundaries in dense or stacked vocals |
| Forced alignment | Aligns a supplied transcript against audio | That the supplied transcript is correct |
| Manual listening review | Corrects specific audible events | Coverage of unreviewed passages |

`tools/timing/align-words.py` runs the first five on a vocal stem or speech file:

```bash
# ASR + script matching (default backend whisper-cli; needs the whisper.cpp CLI and a ggml model)
uv run --python 3.12 tools/timing/align-words.py "$PROD/analysis/embedded-cues.json" \
  "$PROD/analysis/stems/htdemucs_ft/song-44k/vocals.wav" "$PROD/analysis/words.json"

# Acoustic warping for dense or shouted vocals, on the fitted grid
uv run --python 3.12 tools/timing/align-words.py "$PROD/analysis/embedded-cues.json" \
  "$PROD/analysis/stems/htdemucs_ft/song-44k/vocals.wav" "$PROD/analysis/words-acoustic.json" \
  --backend acoustic --bpm 116.99 --phase 0.231
```

The first argument may be `embedded-lyrics.py` output, a `timing.json`, or a plain script (paragraphs become evenly spaced cues). `--backend` also accepts `mlx-whisper` and `faster-whisper` when those Python packages install; on some machines their dependencies fail to build, and the whisper.cpp CLI is the reliable path. Raw ASR words are cached beside the output as `<name>.raw.json`; keep that file, because it contains the ad-libs and repeats the lyric sheet lacks.

What the tool does, and what it leaves to you:

| Rule | In `align-words.py` | Your job |
|---|---|---|
| Match known words to heard words | difflib, accepted from 3 s before the cue start to `--window` (30 s) after | Read unmatched spans |
| Label provenance | `src`: `asr`, `interp`, `acoustic` or `gang-16th` | Keep it through to the scene |
| First-word stretch | a first word longer than 0.7 s starts at `end − 0.45` | Confirm against 40 ms vocal RMS (below) |
| Long or gapped lines | split at more than 14 words or an inner gap over 2.5 s | Also split lines over 6.5 s |
| Monotonic order | any word starting before the previous one is an error | Fix the cause, not the assert |
| Coverage | prints `matched/total` and stores both | Report it; investigate a low ratio |

Report the matched/total figure in the log. On real productions it was 135 of 147 words on one song, 233 of 259 on another and 133 of 134 on a clean narration. A ratio well below that means the vocal stem, the lyric sheet or the window is wrong.

### Failure modes and their rules

- **First-word stretch.** ASR attaches leading instrumental bars to word 0 of a phrase. Trim it, but do not trim a genuinely held opening note. Check with 40 ms RMS on the vocal stem:

```python
import numpy as np, soundfile as sf
VOCALS = "/absolute/path/to/production/analysis/stems/htdemucs_ft/song-44k/vocals.wav"
y, sr = sf.read(VOCALS, always_2d=True); y = y.mean(axis=1)
def first_voiced(start, end, rel_db=-30.0):
    """First 40 ms window inside [start, end] within rel_db of the word's peak."""
    hop = int(0.040 * sr)
    seg = y[int(start * sr):int(end * sr)]
    n = max(1, len(seg) // hop)
    db = 20 * np.log10(np.sqrt((seg[:n * hop].reshape(n, -1) ** 2).mean(axis=1)) + 1e-9)
    on = np.argmax(db >= db.max() + rel_db)
    return start + on * 0.040
```

If the voiced onset is well after the word's start, move the start. If the energy holds to the end, it is a held note: keep the onset where it is sung and let the highlight stay active through the sustained vowel. One production fixed words that appeared late on held notes this way.

- **Gang vocals.** Forced and CTC alignment collapse on stacked, shouted vocals. Clamp each such line to a two-bar window and snap its onsets to the sixteenth-note grid (`step = beat_seconds / 4`, measured from the grid phase). The acoustic backend snaps only lines you name with `--gang-pattern` (a case-insensitive regex over whole lines, for example `--gang-pattern '^(yes we did|not me)$'`); each line's words are paired and every pair lands on sixteenths. Without the flag, no line is snapped.
- **Monologue collapse.** One song sheet grouped a 48-word spoken bridge, 33 s long, into one paragraph. When trailing words failed to match, interpolation ran backwards in time (one word at 135.38 s, a later word at 118.39 s), and a single-line karaoke layout shrank 48 words to illegible 18 px type. Never emit a line longer than 14 words or 6.5 s. Split monologues into sentences of 12 words or fewer, using the segment boundaries in the raw ASR file.
- **Gap bridging.** A chorus ended on a truncated hook at 41.38 s, then an 8.6 s instrumental break, then three post-chorus ad-libs. Aligning the full written chorus line bridged the break (41.38 to 53.04 s) and stole the first ad-lib. Any inner gap over 2.5 s splits the line, and heard ad-libs in the raw ASR file become first-class timed lines.
- **Repeated choruses** must be matched within their own time windows, not to the first identical text in the song.
- **Gaps before a line.** Do not spread a long gap evenly across the next line's words. A phrase after eight seconds of instrumental music starts after the gap.

### Validate the file before a scene reads it

Preserve provenance on every word:

```json
{"text": "Small delays accumulate", "start": 12.46, "end": 14.73,
 "words": [
   {"w": "Small", "start": 12.46, "end": 12.9, "src": "asr"},
   {"w": "delays", "start": 12.94, "end": 13.61, "src": "manual", "verified": true},
   {"w": "accumulate", "start": 13.63, "end": 14.73, "src": "interp"}]}
```

Then run a validator that fails loudly:

```python
import json, math
PROD, DUR = "/absolute/path/to/production", 260.0      # DUR: duration from identity.json
d = json.load(open(f"{PROD}/analysis/words.json"))
prev, problems, src = -1.0, [], {}
for ln in d["lines"]:
    ws = ln["words"]
    if len(ws) > 14: problems.append(f"{ln['text'][:30]}: {len(ws)} words")
    if ws[-1]["end"] - ws[0]["start"] > 6.5: problems.append(f"{ln['text'][:30]}: longer than 6.5 s")
    for a, b in zip(ws, ws[1:]):
        if b["start"] - a["end"] > 2.5: problems.append(f"gap {a['end']:.2f}-{b['start']:.2f} inside a line")
    for i, w in enumerate(ws):
        s, e = w["start"], w["end"]
        assert math.isfinite(s) and math.isfinite(e) and 0 <= s < e <= DUR, w
        assert s >= prev - 1e-3, f"non-monotonic at {w['w']} {s}"
        prev = s
        src[w.get("src", "?")] = src.get(w.get("src", "?"), 0) + 1
        if e - s < 0.10: problems.append(f"short word {w['w']} at {s:.2f}")
        if i == 0 and e - s > 0.7: problems.append(f"long first word {w['w']} at {s:.2f}")
print(f"matched {d.get('matched')}/{d.get('total')}; sources {src}")
print("\n".join(problems) or "no problems")
```

Short words are a prompt to listen, not automatically errors: one accepted film had 13 of 530 words under 100 ms. A line whose first words are crammed into about one second is a likely alignment artefact. Flag suspiciously short words, very long spans, first words stretched over silence and lines that cross section changes, then listen to each flagged span.

## Toolchain traps

- `timeout` does not exist on a default macOS install. A command prefixed with it exits 127 with empty stdout, which reads as an empty finding when stderr is hidden. Check exit codes.
- Recent librosa versions return `tempo` from `beat_track` as an array, not a float. Use `float(np.atleast_1d(tempo)[0])`.
- `analyze-stems.py`, `beat-grid.py`, `separate-stems.py` and `align-words.py` need Python 3.10 to 3.12; pass `--python 3.12` to `uv run`.
- `analyze-stems.py` uses Beat This! (without its DBN) when it is installed with `uv run --python 3.12 --with "beat_this @ git+https://github.com/CPJKU/beat_this" ...`, and otherwise falls back to librosa with the onset-energy downbeat heuristic. The `tools.beats` field in `analysis.json` says which ran. Its downbeats are unverified either way; use `beat-grid.py --sections` for the edit.

## Review before building the whole edit

Listen around the opening, every section transition, repeated hooks, held words and the ending. Make a short clip with a visible beat marker and highlighted words. A grid report, waveform plot or correlation score cannot establish musical feeling. Save the corrected times and review notes, then build the scene timeline on them.

Distinguish what was measured from what was heard: "sync checked against word times" and "watched with sound" are different log entries. Do not claim to have listened when only metadata, subtitles or a correlation were inspected. Continue with [narration and captions](05-narration-and-captions.md) or [scene construction](06-building-scenes.md).
