# Recipe: a 36-second narrated explainer

**Result:** one continuous film in five narrated sections, 1920×1080, 30 fps, 1080 frames; phrase captions,
procedural emphasis sounds and an external narration WAV. This is a reproducibility
exercise, not an approved commercial voice or a topic-to-film automation service.

## 1. Prepare

From the kit root, set a new durable output directory. The voice fixture needs macOS
`say`; on another platform supply an approved 36-second narration and retime the scene
slots as needed. `make-narration.py` stops if the WAV already exists.

```sh
PROD="/absolute/path/to/explainer-production"
mkdir -p "$PROD/renders" "$PROD/checks" "$PROD/stills"
cd starter
npm ci
cd ..
python3 examples/make-narration.py "$PROD/audio"
```

The script synthesises five paragraphs at 170 words/minute, starts each 200 ms into a
7.2-second slot and pads to exactly 36 seconds. It refuses a voice that overruns a slot.
Read `audio/script.txt`; inspect `narration.json` for actual cue durations and voice
identity. The SRT describes phrase-level synthesis slots, not word-accurate timings.

## 2. Lock the voice and inspect the design

```sh
uv run tools/timing/audio-identity.py "$PROD/audio/narration.wav" "$PROD/analysis"
node starter/determinism.mjs examples/narrated-explainer.html
node starter/render.mjs examples/narrated-explainer.html \
  --stills 3,10.2,17.4,24.6,31.8 --outdir "$PROD/stills"
```

The page covers five narrated sections (absolute-time drawing, shared timeline, cause and
effect, verification, delivery) as one continuous film: objects persist and transform between
sections, with two designed transitions. Its `VOICE` table holds phrase times measured from the
generated narration (the page comments give the `silencedetect` command to re-measure them for
another voice); captions are phrase groups of at most two lines in a fixed band, with spoken
words in ink and the rest dimmed. Re-measure the table whenever the voice changes.
Inspect the longest caption and the large headings at 100% and at a reduced 640×360 size.
The HTML preview plays page effects; the external voice is mixed only during export.

## 3. Render the exact mixed result

```sh
node starter/render.mjs examples/narrated-explainer.html \
  --out "$PROD/renders/explainer.mp4" --fps 30 --audio page \
  --voice "$PROD/audio/narration.wav"
uv run tools/verify/verify-video.py "$PROD/renders/explainer.mp4" \
  --expect-seconds 36 --fps 30 --width 1920 --height 1080
uv run tools/verify/contact-sheet.py "$PROD/renders/explainer.mp4" \
  "$PROD/checks/explainer-sheet.jpg" --n 20 --cols 4
```

Expect 1080 frames and AAC audio matching video length within a frame, limited-range
BT.709 and a clean full decode. Normalisation is a rendering choice, not a platform
requirement; measure the final mix. Without `--lufs`, the verifier warns outside its
default loudness window. Record and resolve warnings rather than changing a target only
to obtain a green line.

For a separate source-sync exercise, render with `--audio none --voice ...`; compare
against that exact narration WAV with `--audio-source`. When page effects or music are
mixed in, compare against the intended complete mix or interpret correlation carefully.

## 4. Review, then adapt

Watch once muted: the scene sequence must explain the idea. Listen once without looking:
no missing words, slurred technical terms, truncated tails or distracting effects. Watch
the encoded video with sound: cause should precede effect, captions should hold, and the
last sentence should finish before the tail. Log human review separately from tool checks.

For a new topic, change the brief, script and shot table first. Generate an approved
voice, measure its real paragraph/word times, and retime the page. Do not keep these slots
and force every script into them. Replace the sample diagram with a hero that teaches
the actual subject. Test opening, longest label, hardest transition and ending before a
full render. Preserve the source commit, chosen voice hash, timing and exact command.
