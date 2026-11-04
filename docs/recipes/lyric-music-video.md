# Recipe: a lyric music video

**Result:** a measured song map and a deterministic lyric scene. First make a four-second
pipeline smoke test, then extend to the selected song. The starter is not a completed
music-video engine; the design and scene sequence are authored production work.

## 1. Select and preserve the exact song

Use a production folder named for the selected track. Copy the chosen source once;
retain the original. The song prompt, title and requested BPM do not identify the bytes.
From the kit root:

```sh
PROD="/absolute/path/to/selected-song-production"
mkdir -p "$PROD/audio" "$PROD/analysis" "$PROD/renders" "$PROD/checks"
# Put the selected source at "$PROD/audio/song.m4a" before continuing.
uv run tools/timing/audio-identity.py "$PROD/audio/song.m4a" "$PROD/analysis/source"
uv run tools/timing/embedded-lyrics.py "$PROD/audio/song.m4a" "$PROD/analysis/embedded.json"
uv run --python 3.12 tools/timing/beat-grid.py "$PROD/analysis/source/analysis.wav" \
  "$PROD/analysis/beats.json" --tempo-hint 120
```

For embedded subtitles, `found=false` is a valid result: use the lyric sheet. Cue times
are unverified hints. Listen to section entrances, sustained final words, ad-libs and
instrumental gaps. Annotate absent requested events as absent. Compare detected beats
against the waveform; do not infer downbeat phase from a strong snare or force one
constant BPM onto a drifting track. `--constant` is appropriate only after testing the
fit. Once section times are measured, use `--sections` and optionally `--words` to gate
downbeat placement. Do not feed unreliable embedded section times back as ground truth.

## 2. Author word timing and a shot map

Use manual timing or an external ASR/forced aligner, then verify against the selected
audio. No bundled `word-timing.py` is supplied. Store both raw estimates and corrections.

```json
{"lines":[{"text":"Every frame is a function of time","start":0.5,"end":3.6,
"words":[{"w":"Every","start":0.5,"end":0.9,"source":"manual","verified":true}]}]}
```

The abbreviated example shows the schema, not a complete aligned lyric. Fill in every
word, validate `0 <= start < end <= duration`, and keep words monotonic. Never spread
the last word over an instrumental gap just because the next line begins much later.
Store scene intervals with a visible purpose: setup, tension, consequence, release.
A chorus repeat should change a parameter or advance the visual story.

## 3. Prove the picture/audio path

The starter contains a four-second teaching line with **invented** timings. It is useful
for a smoke test only; its words are not timed to your song:

```sh
node starter/render.mjs starter/scene.html --from 0 --to 4 \
  --audio "$PROD/analysis/source/analysis.wav" --out "$PROD/renders/lyric-smoke.mp4"
uv run tools/verify/verify-video.py "$PROD/renders/lyric-smoke.mp4" \
  --expect-seconds 4 --fps 30 --width 1920 --height 1080
```

For a real scene, create your own page from the contract, replace `WORDS` with measured
data, derive pulse/cuts from the actual beat-event array and set DURATION to the intended
film length. Letter positions should be measured after fonts load. Draw upcoming,
active and completed words with stable line wrapping. Test sustained notes and long
lines. Choose a style card by the meaning and physical material, not just by its name.

## 4. Design before the full song

Approve three hero stills, then render a pilot containing a lyric entrance, strong
downbeat, transition and quiet interval. Selectively map stems or features to motion:
bass might control scale, vocal entrance might reveal text, a section change might
alter space. Avoid making every object pulse on every beat. Compute cumulative musical
time from measured energy if a smoothly varying motion clock is useful; preserve the
integral as data so random access remains deterministic.

## 5. Export and review

Render frame-aligned ranges. The selected music should be trimmed by the same `--from`
as the picture, then padded/trimmed to the intended frame count. Re-encode AAC for MP4;
do not copy an Opus stream merely because the input is named `.m4a`. Check exact frames,
tail, sync, colour and caption bounds. For a complete music-only export, pass the exact
selected audio as `--audio-source`; for a clip, make a correspondingly trimmed source
for the correlation test. Listen at every section and check the final syllable.

Use channel-SSIM if fine saturated material smears in 4:2:0. Keep a 4:4:4 master when
needed and a separately reviewed compatible delivery file. A correct lyric layer does
not make a compelling film; inspect progression and cause/consequence independently.
