# 4. Music, audio identity and timing

Treat the selected audio file as the production's timing authority. A song prompt, lyric sheet, nominal BPM or embedded subtitle stream is evidence about intent, not proof of what happens in the take.

## Pin the exact take

Copy the chosen audio into durable production storage before analysis. Keep the original compressed file and create a decoded analysis copy. Avoid repeated lossy conversion. Record the original filename, SHA256, codec, sample rate, channels and duration.

From the kit root, with `PROD` set to an existing production folder and the selected take copied to `source/selected.m4a`:

```bash
uv run tools/timing/audio-identity.py "$PROD/source/selected.m4a" "$PROD/analysis/audio"
```

The tool writes `identity.json` and a 48 kHz stereo 16-bit `analysis.wav`. It refuses to overwrite existing results unless `--force` is explicit. The analysis copy is a decoded working version; it does not improve the source quality.

Read the warnings. An `.m4a` extension does not prove AAC: the stream can contain Opus. A file may have several audio streams or an embedded subtitle stream. Mono and low sample rate are facts to consider, not automatic reasons to reject useful speech.

Use the same selected take for the edit and final audio. If a trim, time stretch, replacement take or mastering step changes the timing, regenerate or transform every dependent timing artifact and record the operation. A file with the same name can still have different bytes.

## Establish the timeline origin

Decide whether `t=0` means the original file's start or an intentional trimmed start. Keep the choice visible in the manifest. If the narration has 6.65 seconds of leading silence, subtract that offset from all dependent cues only when the render uses an identically trimmed audio track.

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

Some music exports carry `mov_text` subtitles. Extract them from the original container, before converting to WAV:

```bash
uv run tools/timing/embedded-lyrics.py "$PROD/source/selected.m4a" "$PROD/analysis/embedded-cues.json"
```

The output distinguishes section tags from sung lines and marks all times unverified. It warns about unusually long cues, short cues, overlaps and cues crossing a later section. If no subtitles exist, it writes an empty result with `found=false`; this is a valid outcome.

Never use these cues uncritically for active-word typography. A cue can start late, end at the next subtitle boundary, span an instrumental break or attach the wrong chorus occurrence. Use them to locate passages for review. Correct the timing against the audio.

## Make a measured song map

Listen to the chosen take and create a section table with actual start and end times: intro, verse, chorus, bridge, break, final return and ending. Name functions as well as genre labels: establish, build pressure, release, interruption, changed return.

For every promised special event, record whether it is present:

| Intended event | Measured result | Edit consequence |
|---|---|---|
| Two beats of silence | No silence; drums drop for four bars | Remove a full blackout; retain moving vocal layer |
| Long instrumental introduction | Voice begins at 2.1 s | Bring the subject in before the first words |
| Final drop | Eight bars, not twenty-four | Shorten the planned escalation |

This prevents a common failure: animating an imaginary arrangement that existed only in the generation prompt.

## Beat grids: tempo is not phase

A grid needs both a period and an origin. At 120 BPM the beat period is 0.5 s, but the first audible beat might be at 0.23 s. Bar position adds another choice: which beat is beat one?

```bash
uv run --python 3.12 tools/timing/beat-grid.py "$PROD/analysis/audio/analysis.wav" "$PROD/analysis/beats.json" --tempo-hint 120
```

This uses librosa's onset envelope and beat tracker. It is an estimate. The reported BPM summarizes detected intervals; it does not prove that every musical event lies on one constant grid.

For a demonstrably steady track, fit period and phase:

```bash
uv run --python 3.12 tools/timing/beat-grid.py "$PROD/analysis/audio/analysis.wav" "$PROD/analysis/beats-constant.json" --constant --tempo-hint 120
```

Inspect residuals, detected beats and actual transients. A low residual means the detections fit the model; it does not prove they are the correct musical beat. Strong offbeats, half-time or double-time interpretations can produce plausible but wrong grids. Generated music can drift, so do not assume `--constant` is safe merely because the track is synthetic.

Author a measured section file such as:

```json
{"sections":[{"name":"chorus-1","start":32.48},{"name":"chorus-2","start":78.91}]}
```

Then check section starts against downbeats:

```bash
uv run --python 3.12 tools/timing/beat-grid.py "$PROD/analysis/audio/analysis.wav" "$PROD/analysis/beats-checked.json" --sections "$PROD/analysis/sections-measured.json" --meter 4 --tolerance 0.12
```

The tool tries beat offsets and requires a downbeat within the tolerance of every supplied start. `--downbeat-offset N` can force an offset. Supply only sections that should land on downbeats: a pickup vocal or a free-time opening may not. Passing unverified embedded tags into this assertion merely tests one estimate against another.

For a track with drums, an isolated drum stem can make onsets easier to detect. Stem separation is optional and is not provided by these tools. It adds model dependencies, processing time and separation artifacts. Check source licence and model requirements before adding it.

## Time words against the sound

The kit does not include an ASR engine or forced aligner. Use a separately configured transcription/alignment tool or time the words manually. Save raw results, map them to the approved lyric or script, and record uncertain spans.

These methods have different meanings:

| Method | What it does | What it does not prove |
|---|---|---|
| Embedded cue | Reads exporter metadata | Actual syllable onset |
| ASR word timestamps | Recognizes sound and estimates word spans | Exact lyric correctness or reliable silence boundaries |
| Script matching | Matches ASR tokens to known words | That unmatched words were spoken |
| Interpolation | Distributes unmatched words between anchors | Any measured word timing |
| Forced alignment | Aligns a supplied transcript against audio | That the supplied transcript is correct |
| Manual waveform/listening review | Corrects specific audible events | Automatic coverage of unreviewed passages |

Preserve provenance on every word:

```json
{
  "text": "Small delays accumulate",
  "start": 12.46,
  "end": 14.73,
  "words": [
    {"w":"Small","start":12.46,"end":12.9,"source":"asr","verified":false},
    {"w":"delays","start":12.94,"end":13.61,"source":"manual","verified":true},
    {"w":"accumulate","start":13.63,"end":14.73,"source":"interpolated","verified":false}
  ]
}
```

Validate that every time is finite, `0 <= start < end <= duration`, word order is monotonic, line bounds contain their words and the approved word sequence is preserved. Flag suspiciously short words, very long spans, first words stretched over silence and cues that cross section changes. Repeated choruses must be matched within their own time windows, not to the first identical text in the song.

For held notes, distinguish word onset from highlight duration. The word should appear when sung and may remain active through the sustained vowel. Do not spread a long gap evenly across the next line's words. A phrase after eight seconds of instrumental music should start after the gap.

## Derive motion from measured features

Precompute curves at a known rate, such as 100 samples/s. Store the rate, duration, audio hash, feature names and layout. Simple linear interpolation is enough for many amplitude envelopes:

```js
function sampleCurve(values, rate, t) {
  const x = Math.max(0, Math.min(values.length - 1, t * rate));
  const i = Math.floor(x), j = Math.min(i + 1, values.length - 1);
  return values[i] + (values[j] - values[i]) * (x - i);
}
```

Use event timestamps for cuts and hits. Use smoothed envelopes for breathing, light intensity or material activity. A useful advanced technique is an accumulated energy clock `tau(t) = integral(speed(t))`: noise or travel then accelerates with energy while staying deterministic. Store or deterministically integrate it; never accumulate it from whatever frame happened to render previously.

Design behavior for absent stems and silence. A missing vocal should empty a vocal-driven layer rather than leave a permanent low-level flutter. Clamp and normalize against meaningful ranges; one transient peak should not flatten the rest of the film.

## Review before building the whole edit

Listen around the opening, every section transition, repeated hooks, held words and the ending. Make a short clip with a visible beat marker and highlighted words. A grid report, waveform plot or correlation score cannot establish musical feeling. Save the corrected times and review notes, then build the scene timeline on them. Continue with [narration and captions](05-narration-and-captions.md) or [scene construction](06-building-scenes.md).
