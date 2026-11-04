# Recipe: an instrumental visualizer

**Result:** a deterministic orbital composition whose scale responds to a measured RMS
envelope. This is a runnable baseline. A directed instrumental film adds authored heroes,
section changes and consequences; a continuously moving particle field alone does not
create a story.

## 1. Pin the audio and build features

From the kit root, after installing starter dependencies:

```sh
PROD="/absolute/path/to/instrumental-production"
mkdir -p "$PROD/analysis" "$PROD/renders" "$PROD/checks"
# Place the selected audio outside the checkout first.
uv run tools/timing/audio-identity.py "$PROD/audio/song.wav" "$PROD/analysis/source"
python3 tools/build-visualizer.py "$PROD/analysis/source/analysis.wav" \
  --out examples/my-visualizer.html
node starter/determinism.mjs examples/my-visualizer.html
node starter/render.mjs examples/my-visualizer.html \
  --audio "$PROD/analysis/source/analysis.wav" --out "$PROD/renders/visualizer.mp4"
```

The builder writes code into `examples/`, so its relative library paths work. Choose a
new filename for another production; it refuses overwrite. It decodes mono at 12 kHz,
measures RMS at 30 Hz, normalises to the 95th percentile, and applies faster attack than
release. Source SHA256 and measurement method are embedded in the generated page. No
audio bytes enter the repo. The original `examples/instrumental.html` uses a synthetic
teaching pattern; it does not claim to analyse whichever track you mux over it.

The small standard-library builder buffers decoded mono samples and is intended for
short/ordinary song lengths, not multi-hour material. A production analyser should
stream or use a binary feature store for large inputs.

## 2. Interpret the features

RMS is energy, not beat, pitch, vocal activity or semantics. The envelope may lag sharp
onsets and react to any loud instrument. Use the beat tool for an initial grid, stems
for instrument-specific envelopes and manual listening for structural changes. Keep
raw and processed curves so the control mapping can be tuned without decoding again.

The sample uses one envelope for hero radius, seeded particles for layout and absolute
time for drift. Each particle's position can be evaluated directly. There is no live
microphone or analyser node during export. Interpolation between measured points avoids
stepping. A simulation with memory must be re-simulated from deterministic checkpoints
when seeking; pretending it is a pure function will break parallel rendering.

## 3. Add direction

Mark section boundaries and decide what changes there. Give the introduction a stable
world, let a new layer cause a visible change, and let a breakdown empty the scene.
Use a small set of semantic mappings. Design the quietest and loudest stills together,
so the hero remains legible at both extremes. Make the ending resolve rather than
simply cutting a running loop at the audio tail.

## 4. Verify and deliver

```sh
uv run tools/verify/verify-video.py "$PROD/renders/visualizer.mp4" \
  --fps 30 --width 1920 --height 1080 --audio-source "$PROD/analysis/source/analysis.wav"
uv run tools/verify/contact-sheet.py "$PROD/renders/visualizer.mp4" \
  "$PROD/checks/visualizer-sheet.jpg" --n 24 --cols 4
uv run tools/verify/cut-harshness.py "$PROD/renders/visualizer.mp4"
```

Also pass `--expect-seconds` using the intended frame-aligned duration and confirm the
expected frame count (`round(duration * 30)`). Review black/freeze warnings against the
designed quiet sections. The cut detector's spikes are inspection candidates; it does
not understand intent. Check the encoded bloom, red/blue details, grain and tail. Keep
the source/audio hash, generated feature code, exact command and reviewed receipts.
