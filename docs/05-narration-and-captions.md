# 5. Narration and captions

For a spoken film, finish the voice before polishing the animation. Voice determines duration, emphasis, breath and scene boundaries. Replacing it late can invalidate every caption and visual cue.

The order in this chapter is the order of work: write for speech, lock pronunciation, choose and measure a voice, synthesize or record in sentence chunks, master the take, verify every word, time the words, then build cues and captions on the measured track. Each step produces a file the next step depends on. If an earlier file changes, everything after it is regenerated.

## Write for speech

Read the script aloud. Prefer concrete nouns and active verbs. Give each sentence a visual job. A short explainer still needs a complete arc: establish the problem, demonstrate a cause, show the change, prove the result and close with an actionable or memorable conclusion.

Budget time from a spoken take, not a word-count formula alone. A narrator needs pauses around important ideas. Fast delivery cannot rescue a script with too many claims. If a 30-second film contains a dense paragraph plus several diagrams, cut the script before shrinking the type or accelerating captions.

Useful pacing reference points, measured on two minutes of each of six popular human-narrated explainer videos:

| Measure | Observed range | How to use it |
|---|---|---|
| Speaking pace | 142–215 words per minute | A synthetic voice at about 185 wpm is inside the range; 150–165 wpm reads as calm |
| Pitch movement (F0 standard deviation) | 4.3–5.7 semitones | A voice well below this range tends to sound flat over minutes |
| Pitch range (5th–95th percentile) | 13–20 semitones | Same diagnostic, less sensitive to a few outliers |

Pace is rarely the problem on its own. The same measurements showed fast-growing channels talking at 190–215 wpm. If a take feels lifeless at a normal pace, slowing it will not help; see the next sections.

Write punctuation for the pauses you want. A comma is a short breath; a full stop ends a synthesis chunk in the kit's narrator; a blank line ends a paragraph and earns a longer gap. Keep each sentence under about 500 characters; long chunks make synthesis less stable and give the aligner fewer anchors.

## Maintain a pronunciation map

Maintain an approved display script and a pronunciation map. Numbers, times, abbreviations and names may need explicit spoken forms:

```json
{
  "3:07": "three oh seven",
  "2015": "twenty fifteen",
  "API": "A P I",
  "30 fps": "thirty frames per second"
}
```

The map is plain JSON: keys are the written form, values are what the voice should say. The kit's narrator applies it with `--say say.json` before synthesis. Keep it beside the script in the production folder and version it with the script; a change to the map is a change to the audio.

The pronunciation spelling is for synthesis. Captions should show the intended written form unless the director explicitly chooses otherwise. That means two texts exist on purpose: the display script (what captions and the word checker compare against) and the spoken script (display script plus substitutions).

Expect substitutions to show up in checks. On the kit's known-answer fixture, the display text `30 fps` is spoken as "thirty frames per second". The round-trip checker still passes, but its match ratio drops to 0.951 because those words are counted as replacements. A long substitution could exceed the missing-run threshold and fail; if that happens, confirm by listening and record the reason rather than editing the display script to suit the checker.

Proper names are the most common synthesis error. Test each unusual name in isolation before a long synthesis run, and add a phonetic respelling such as `"Hadza": "Hahd-zah"` when needed.

## Choose and review the voice

Record a human take or use an approved synthesis system. Local TTS is convenient for animatics and smoke tests, but a successful waveform is not a production-quality verdict. Assess intelligibility, pace, emphasis, naturalness, speaker consistency and correct words.

### Speed changes pace, not prosody

Changing speech rate mainly changes pace; it does not fix flat prosody. This was measured on one 116-word excerpt read by a small local non-autoregressive model, the kind `tools/timing/kokoro-narrate.py` drives:

| Variant | Pace | Word errors | F0 spread | F0 p5–p95 |
|---|---|---|---|---|
| Paragraph chunks, speed 0.95 | 184 wpm | 0 real errors (all differences were number formatting) | 2.86 st | 9.1 st |
| Sentence chunks, speed 0.90 | 165 wpm | 0 real errors | 3.00 st | 9.5 st |
| Sentence chunks, speed 0.82 | 148 wpm | 0 real errors | 3.01 st | 9.5 st |
| Six human reference narrators | 142–215 wpm | n/a | 4.3–5.7 st | 13–20 st |

The local voice moved its pitch about 40–50% less than every human reference, at every speed. Sentence chunking and a slower rate changed the pace and the gaps; they did not add expressiveness. That measured flatness matched what a listener described as "a little off in parts". The flatness belongs to the model. Fix it by changing the performance (a recorded human take or a different model), not by tuning speed.

### Measure expressiveness as F0 spread

F0 spread is a proxy for monotony, not a naturalness score. It is cheap to measure and makes "it sounds flat" a number you can compare between candidates:

```python
# f0_spread.py — run with: uv run --with librosa --with numpy python3 f0_spread.py take.wav
import sys, numpy as np, librosa
y, sr = librosa.load(sys.argv[1], sr=16000, mono=True)
f0, voiced, _ = librosa.pyin(y, fmin=60, fmax=400, sr=sr)
f0 = f0[voiced & np.isfinite(f0)]
st = 12 * np.log2(f0 / np.median(f0))
print(f"median F0 {np.median(f0):.0f} Hz, F0 sd {st.std():.2f} st, "
      f"p5-p95 {np.percentile(st, 95) - np.percentile(st, 5):.1f} st")
```

On the kit's 15-second known-answer narration (macOS `say`), this printed `median F0 183 Hz, F0 sd 3.91 st, p5-p95 12.8 st`. Compare candidates on the same text, the same excerpt length and with no music underneath; a music bed makes pitch tracks noisy. Measure per paragraph as well as overall: the median F0 per paragraph tells you whether the voice stays the same speaker.

### Expressive models have different failure modes

A more expressive model can introduce speaker drift, missing clauses or inserted words. One 0.5B open model tested on the same excerpt reached 5.18 semitones of F0 spread, inside the human range. Its full-length stress test (1,950 words, rendered paragraph by paragraph with the default voice) showed the cost:

- **Speaker drift.** Median F0 per paragraph ranged from 81 to 235 Hz, which sounds like different people from paragraph to paragraph. The flat local model stayed between 188 and 209 Hz on the same script. Models with an unpinned default voice need a fixed reference clip before they can narrate.
- **Dropped and inserted words.** A round-trip transcription found 2 dropped clauses, 3 dropped single words and 1 inserted word in about 1,950 words. Proper names were mangled, as with most TTS.
- **Ignored controls.** Its speed flag had no effect; pace had to be changed afterwards with an audio tempo filter.

A practical adoption gate for a candidate model, used as a proposal rather than a proven standard: per-paragraph median F0 varies by less than about 15 Hz, and fewer than about 1 omission per 1,000 words survives the round-trip check, and a human prefers it when listening to the same paragraph against the current voice.

Autoregressive models in general (the kind that generate audio token by token) can drift in pace or pitch, repeat, or hallucinate across long passages. Generate sentence or paragraph chunks with a fixed reference voice and seed, and join them with 0.4–0.8 s gaps. Non-autoregressive models are steadier over long text but usually flatter.

### Compare before committing

Compare short samples of the same paragraph and listen before synthesizing a long script. Keep these fields in the production log for every take that reaches the edit: model name and version, voice name or reference clip hash, speed, language, pronunciation map hash, chunking settings, sample rate and the output file hash. `kokoro-narrate.py` in plan mode writes most of these into `audio/identity.json`.

A human recording is not free of work either. Expect to remove breaths and mouth noise, remove room tone, and level the take. A clean 12-minute read typically takes 40–60 minutes including retakes, then about 30 minutes of editing in a quiet room.

## Synthesize in sentence chunks

Sentence-by-sentence synthesis simplifies retakes and gives exact scene boundaries. It can also make rhythm mechanical or change the voice between chunks. The kit's narrator handles the common case:

```bash
# Plain-text script to one WAV (model files in ~/.local/share/kokoro unless --model-dir says otherwise)
uv run tools/timing/kokoro-narrate.py "$PROD/source/script.txt" "$PROD/audio/narration-raw.wav" \
  --voice af_heart --lang en-us --speed 0.89 --say "$PROD/source/say.json"

# Preview only the first two paragraphs while choosing a voice
uv run tools/timing/kokoro-narrate.py "$PROD/source/script.txt" "$PROD/audio/preview.wav" --limit 2

# Structured beat plan to a production folder: timing.json, timing.js, captions.srt, audio/identity.json
uv run tools/timing/kokoro-narrate.py plan.json "$PROD" --timing-js examples/my-film/timing.js --fps 30
```

What it does, and why:

| Behaviour | Value | Reason |
|---|---|---|
| Split on sentence punctuation | one sentence per synthesis call | Short calls are stable, retakes are local, and each chunk boundary is an exact time |
| Merge fragments | sentences under 4 words join the previous one | "Fast." alone is synthesized with odd stress and a full stop's worth of silence |
| Sentence gap | 0.35 s (`--sent-gap`) | Enough for a breath without sounding like a list |
| Paragraph gap | 0.75 s (`--gap`) | A clear change of idea; 0.8–0.9 s also works for calm delivery |
| Lead silence | 0.4 s before the first word | The first syllable is not clipped by a player or fade-in |
| Output | 24 kHz mono WAV | The model's native rate; resample once during mastering |
| Defaults | `--voice af_heart`, `--lang en-us`, `--speed 0.89` | A calm default; record whatever you actually use |

The tool needs the model files `kokoro-v1.0.onnx` and `voices-v1.0.bin` in `--model-dir` (default `~/.local/share/kokoro`) and refuses to overwrite unless `--force`. It is a smoke-test and animatic path. It does not make a flat voice expressive.

If you build your own chunker, two details matter. First, scene `start` and `end` should be the cumulative sum of chunk durations plus gaps, so scene boundaries are exact rather than estimated from punctuation. Second, trim exterior silence conservatively. One working setting trimmed at an amplitude threshold of 0.006 with 45 ms kept before the first sound and 90 ms after the last, then inserted 0.20 s gaps (0.34 s after selected scenes). Retain consonant attacks and natural breath. A waveform threshold alone can cut a quiet syllable such as a final "s" or an initial "h".

## Master the voice

Master the voice track once, before alignment and before the final mix. Timing data refers to this mastered file.

```bash
ffmpeg -hide_banner -n -i "$PROD/audio/narration-raw.wav" \
  -af "highpass=f=72,equalizer=f=230:t=q:w=0.8:g=-1.5,acompressor=threshold=0.16:ratio=2.2:attack=15:release=120:makeup=1.2,loudnorm=I=-16:TP=-1.5:LRA=9" \
  -ar 48000 "$PROD/audio/narration.wav"
```

| Stage | Setting | Why |
|---|---|---|
| High-pass | 72 Hz | Removes rumble and handling noise below the voice's fundamental |
| Low-mid cut | −1.5 dB at 230 Hz, Q 0.8 | Reduces boxy or muddy build-up without thinning the voice |
| Light compression | threshold 0.16, ratio 2.2:1, attack 15 ms, release 120 ms, makeup 1.2 | Evens loud and soft words while keeping the attack of consonants |
| Loudness | `loudnorm=I=-16:TP=-1.5:LRA=9` | Voice at −16 LUFS with true-peak headroom; LRA 9 keeps some natural dynamics |
| Resample | 48 kHz | The rate used by the renderer and most video delivery |

On the kit's known-answer narration this chain moved the take from −16.7 LUFS, −2.2 dB peak to −16.0 LUFS, −1.5 dB true peak. Measure your own result with `ffmpeg -hide_banner -nostats -i narration.wav -af ebur128=peak=true -f null -` and listen to the whole track: compression can raise breaths and room noise, and a loudness filter cannot repair clipping or a missing word.

`-n` refuses to overwrite. Keep the raw take; it is the source if mastering needs to change.

## Verify words before aligning them

Listen against the approved script. ASR round-trip comparison is a useful additional screen for omissions: transcribe the synthesized take, normalize punctuation and compare token sequences. The kit implements this:

```bash
uv run tools/verify/verify-narration.py "$PROD/source/script.txt" "$PROD/audio/narration.wav" \
  --min-run 3 --json "$PROD/qa/narration.words.json"
```

It runs local `whisper-cli` (install with `brew install whisper-cpp` on macOS) with the model at `~/.cache/whisper/ggml-large-v3-turbo-q5_0.bin` unless `--model` points elsewhere, then reports every run of 3 or more consecutive script words missing from the audio. Exit 0 is PASS, 1 is FAIL. On the kit's known-answer fixture:

```text
narration.wav       PASS: script 40 words, heard 42, match 0.951
narration-cut.wav   FAIL: script 40 words, heard 32, match 0.806
                      missing at word 24: fps sound is scheduled at the same times as the picture
```

Why a run of three: single-word differences are usually number formatting, contractions or a mis-heard short word, and flagging all of them trains people to ignore the report. A dropped clause almost always removes three or more consecutive words. Lower `--min-run` to 2 for short, dense scripts where a two-word omission changes meaning.

Limits to state in the receipt:

- The recognizer can itself drop or invent words. Treat a flagged run as "probable", listen to it, and re-synthesize only the affected sentence.
- A pass does not prove correct pronunciation, stress or expressive delivery.
- Single dropped words and one inserted word fall below the run threshold. If the model is known to insert words, read the heard text in the JSON report too.
- Pronunciation substitutions appear as replacements (see the map section above).

Keep these artifacts separately:

- The approved display script and the pronunciation map.
- The raw voice take.
- The trimmed and mastered voice used in the edit.
- The round-trip report.
- Raw ASR/alignment output.
- Corrected timing data with uncertainty labels.

Timing must refer to the actual mastered edit track. A retake with the same filename can have different pause lengths. Record its hash (`uv run tools/timing/audio-identity.py "$PROD/audio/narration.wav" "$PROD/analysis/voice-identity"`) and regenerate dependent timings when it changes.

## Time the words

Every timing source in this kit is ASR plus script matching, not phoneme-level forced alignment. That is good enough for phrase captions and visual cues, and needs listening for word-by-word highlighting.

```bash
uv run --python 3.12 tools/timing/align-words.py "$PROD/source/script.txt" "$PROD/audio/narration.wav" \
  "$PROD/analysis/words.json" --backend whisper-cli --window 30
```

How the default backend works and what each guard is for:

1. `whisper-cli` produces heard words with timestamps.
2. The known script words are matched to the heard words with a sequence matcher. A match is only accepted within `--window` seconds after its cue start, so a repeated phrase cannot match the wrong occurrence.
3. Unmatched script words are interpolated between matched neighbours and labelled `"src": "interp"`; matched words carry `"src": "asr"`. Never remove the label. A caption built on interpolated words is an estimate. The output also carries `matched`, `total` and a `timing_note` reminding the reader that boundaries are estimates.
4. A phrase-initial word that the recognizer stretched back over preceding silence is trimmed (the same `fixFirstWord` rule the browser loader applies, with a 0.45 s maximum).
5. Lines longer than 14 words, or with an inter-word gap above 2.5 s, are split so a highlight layout never collapses or runs backward.

`--offset` subtracts a constant from every timestamp when the audio has a lead-in that the page timeline does not. On one 62-second user-recorded explainer, this approach matched 133 of 134 words; the one remaining word was interpolated and labelled. On the kit's 15-second known-answer narration it matched 35 of 40 words. The five interpolated words (`renders`, `repeatable.`, `renderer`, `fps.`, `Captions`) include the pronunciation-map phrase, where spoken and written text differ, and words at sentence edges. A short take with a substitution can easily have 10% interpolated words; that is a reason to listen to those spans, not to hide the label.

After alignment, assert strict order and bounds before any scene reads the file:

```python
import json, sys
words = [w for line in json.load(open(sys.argv[1]))["lines"] for w in line["words"]]
dur = float(sys.argv[2])
for a, b in zip(words, words[1:]):
    assert a["start"] <= b["start"], f"backward: {a} -> {b}"
for w in words:
    assert 0 <= w["start"] < w["end"] <= dur, f"out of bounds: {w}"
interp = sum(w.get("src") == "interp" for w in words)
print(f"{len(words)} words, {interp} interpolated")
```

Run it as `python3 check_words.py "$PROD/analysis/words.json" 36` with the track duration in seconds. Report the interpolated count in the receipt. See [chapter 4](04-music-audio-and-timing.md) for the full alignment backends and their limits on sung material.

## Build semantic cues

Prefer a specific word or phrase as the trigger for a major visual change. For “the result is verified,” show the result on “result” and the evidence or check on “verified.” Do not make scene changes solely because a sentence index increased. A recurring rejection of early drafts was "visuals driven by scene number rather than spoken meaning".

A practical pattern is a lookup by line and word: `cue(i, 'verified')` returns the start time of the first matching word in line `i`. Scenes then refer to words, not seconds, and a retake only requires regenerating the words file.

If synthesis is chunked, exact chunk boundaries can define scene intervals. Word timings still need alignment or manual review. A cumulative duration table is often more dependable than guessing scene lengths from punctuation:

```json
{
  "scenes": [
    {"index":0,"start":0,"end":4.8,"text":"A job arrives."},
    {"index":1,"start":4.8,"end":10.6,"text":"Now watch the queue grow."}
  ],
  "words": [
    {"w":"A","start":0.18,"end":0.3,"source":"manual"},
    {"w":"job","start":0.31,"end":0.65,"source":"asr"},
    {"w":"arrives","start":0.66,"end":1.29,"source":"interpolated"}
  ]
}
```

This is a suggested schema. The `source` field is required in spirit: `manual`, `asr` or `interpolated`. A confident-looking JSON file is not stronger evidence than the method that created it.

Pacing for picture changes depends on the style. One measured hand-drawn explainer reference changed shot every 1.85 s on average (81 shots in 150 s); a first pilot in that style averaged 3.35 s and felt slow by comparison. Measure your own reference before choosing a rate.

## Caption phrases, not arbitrary token buckets

A caption is a readable phrase held long enough to understand. Group by meaning, breath and layout. A fixed maximum of five words created one-word cues such as “done.” for 0.20 s and “running.” for 0.22 s in a real sidecar file. Rebalance adjacent cues instead.

Use complete phrases that accumulate and hold. Emphasis can change colour or weight while the phrase stays in place. Replacing a fragment every few syllables forces the viewer to continually relocate the text. In review, "short fragments constantly replacing each other" was one of the clearest reasons a draft was rejected; complete phrases with stable lines and heavier emphasis words were judged better.

Author a caption record with an explicit display interval and line break:

```json
{
  "start": 4.8,
  "end": 7.9,
  "lines": ["Watch the queue", "grow behind one worker."],
  "emphasis": ["queue", "grow"]
}
```

Display times and spoken word times serve different purposes. A full phrase may become visible slightly before its last word is spoken and remain after it. If individual words highlight, their active intervals should still follow the measured voice; a highlight must never run ahead of the voice.

### Reading floor

Use a reading floor of `0.5 s + 0.3 s per word` as an internal planning check. It catches captions that flash past. One layout checker flagged a 7-word phrase held 1.71 s against its 1.95 s floor. It is not a universal accessibility rule and should not override the audience, sentence complexity or listening context; dense technical terms need longer.

When a caption is under its floor: first extend its hold into the following pause, then merge it with a neighbour, then shorten the wording. Do not speed up the voice to fit a caption.

### Balanced wrapping, no orphan word

Balanced two-line wrapping is easier to read than a long line plus a single orphan word. Choose the break that minimizes the width difference between lines, never leaving one word alone on the last line. Isolated last words were a specific defect in one vertical short and were fixed by balanced wrapping.

A small lint for caption records catches the mechanical failures before render:

```python
import json, sys
caps = json.load(open(sys.argv[1]))
prev_end = 0.0
for i, c in enumerate(caps):
    words = sum(len(l.split()) for l in c["lines"])
    hold = c["end"] - c["start"]
    floor = 0.5 + 0.3 * words
    if hold <= 0: print(f"#{i}: non-positive duration")
    if c["start"] < prev_end: print(f"#{i}: overlaps previous cue")
    if hold < floor: print(f"#{i}: {words} words held {hold:.2f} s < floor {floor:.2f} s")
    if len(c["lines"]) > 1 and len(c["lines"][-1].split()) == 1: print(f"#{i}: orphan last word")
    if words == 1 and hold < 0.6: print(f"#{i}: one-word flash")
    prev_end = c["end"]
```

A clean lint is not a readability review; watch the captions in motion at destination size.

## Measure text and reserve a region

Define a caption rectangle as part of the composition. For vertical video, keep essential content away from likely interface overlays, then test on the actual destination UI. No universal safe rectangle covers every platform, device and overlay mode. Platform safe zones in particular were never tested against real UI in the productions this kit comes from; treat any published template as a starting guess.

A worked example: one vertical short was designed in a 540×960 coordinate space and drawn to a 1080×1920 canvas with `ctx.setTransform(2, 0, 0, 2, 0, 0)`. Its caption region was x 32–508 and y 570–765 in design units. A checker sampled caption bounds at 1,028 frames and found 0 violations. The film was also reviewed at 360×640, roughly phone size, for readability.

Use the final font and measure each line before drawing. Wrapping must account for the weight used by emphasized words. Test the longest phrase and words with wide glyphs. Use weights the font actually ships: on macOS a system font asked for weight 600 may render at 700 bold, widening lines past the measured layout.

At every sampled frame, verify:

```text
left >= safe.left
right <= safe.right
top >= safe.top
bottom <= safe.bottom
```

If the phrase does not fit at the minimum approved size, reword or rebalance it. Do not shrink until it technically fits and becomes unreadable on a phone. Keep stable caption baselines and avoid having the hero object pass through the text region. A closing prompt that collides with the caption band is a common late defect: reserve both regions at design time.

Canvas text bounds need explicit layout logic. A browser's DOM inspector cannot see painted words, and DOM-based linters report canvas films as having zero text, zero contrast checks or a "dead stretch" while words are clearly visible. `measureText()` gives width and can provide actual glyph bounds (`actualBoundingBoxLeft/Right/Ascent/Descent`), but shadows, strokes, rotation and effects extend visible bounds further. Include that padding in collision tests.

To check the encoded result rather than the layout math, crop the caption band from an encoded frame at the middle of each scene and count text-coloured pixels. One pipeline required more than 100 pixels with `min(R,G,B) < 110` (dark text) in a crop at 56% of each scene. It is crude, but it proves the caption reached the file.

## Sidecar captions need their own review

Burned-in captions and SRT/VTT are separate deliverables. A polished burn-in does not fix a poorly grouped sidecar file. In one production the burned-in captions were regrouped into phrases and fixed, while the SRT generated by a different script still held one-word cues of 0.2 s. Generate both from the same caption records, or lint both.

Check timing order, overlaps, empty cues, one-word tails, punctuation and final cue duration. Confirm the exported text equals the approved display script, allowing intentional display conventions.

For SRT, use increasing cue numbers and `HH:MM:SS,mmm` timestamps. A cue should have a positive duration and remain inside the delivered clip. If exporting only a segment, subtract the segment start from sidecar timestamps and remove or trim cues outside it.

```text
1
00:00:04,800 --> 00:00:07,900
Watch the queue
grow behind one worker.
```

Lines inside one cue break where the burn-in breaks. Keep at most two lines per cue.

## Mix voice with restraint

Narration should stay intelligible without forcing the viewer to raise volume. Use effects to mark a meaningful event, not every moving element.

### Loudness targets

| Signal | Working target | Why |
|---|---|---|
| Voice before mixing | −16 to −18 LUFS integrated | Leaves room for a bed and effects without pushing the voice into a limiter |
| Music bed | 18–22 LU under the voice (about −36 to −40 LUFS when the voice is −18) | Accessibility guidance asks for background at least 20 dB under speech |
| Ducking while speaking | a further 4–6 dB, attack 50–100 ms, release 600–1000 ms | The bed steps back on speech and recovers in pauses without pumping |
| Bed at transitions | up 3–6 dB in intro, section breaks and outro | The only places music should be noticeable |
| Web master | −14 LUFS integrated (−13 to −15 acceptable) | Common web normalization reference |
| True peak | −1.5 dBTP or lower | Headroom for lossy encoding, which raises peaks |
| Loudness range for narration | under about 7 LU | Comfortable on phone speakers |

Large platforms generally turn loud audio down to their reference but do not turn quiet audio up. A master at −23 LUFS plays quiet; mastering hotter than −14 gains nothing. These are production choices, not a promise about every platform. Use the destination's requirements when supplied, and measure the final encode.

### Ducking an external bed

This recipe was tested on a narration track with a stand-in bed. Measure both inputs first with `ebur128`, then set the bed gain as `(voice_LUFS − 18) − bed_LUFS` to put it 18 LU under the voice:

```bash
ffmpeg -hide_banner -n -i "$PROD/audio/narration.wav" -i "$PROD/audio/bed.wav" -filter_complex \
  "[0:a]asplit=2[v][vsc];[1:a]volume=-20dB[m];\
   [m][vsc]sidechaincompress=threshold=0.02:ratio=4:attack=60:release=700:makeup=1[md];\
   [v][md]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84:level=disabled[mix]" \
  -map "[mix]" "$PROD/audio/premaster.wav"
```

Two details matter. `amix ... normalize=0` stops ffmpeg from halving each input. `alimiter` has automatic output levelling enabled by default, which pushes the result back to 0 dBFS; with `level=disabled` the same chain measured −1.5 dB peak instead of 0.0 dB. Then normalize the premaster to the delivery target with a two-pass `loudnorm` as shown in [chapter 9](09-encode-and-deliver.md). On one 3-minute test the premaster measured −20.6 LUFS and the final −14.0 LUFS, −1.5 dBTP, LRA 2.9 LU; `loudnorm` reported dynamic mode because pure linear gain could not meet the peak ceiling, which was harmless for narration.

### Effects ducking in the kit

In this kit, `--voice` mixes narration with the optional page score and asks the sound kit for its voiceover mode: beds and music are dropped, sounds marked minor play at about 60%, and everything sits about 4 dB lower so narration stays on top. Mark incidental sounds with `k.minor(() => ...)` or `{ minor: true }` so the mode can reduce them. This is a useful default, not adaptive dialogue ducking: effects do not dip around individual words. For an external effects or music track, use the sidechain recipe above.

The renderer normalizes voice mixes in one pass (`loudnorm=I=-14:TP=-1.5:LRA=11`). For a critical master, prepare and measure a controlled mix first, render with `--audio mix.wav` and no `--voice`, and audition the result. Do not normalize silence or overcompress to conceal a poor recording.

### Should there be music at all?

Measurements of popular narrated explainers found both patterns: some carry a constant scored bed roughly 15–30 dB under speech peaks; some of the fastest-growing hand-drawn explainers run with almost no bed and real digital silence between sentences. Learning research on narration leans slightly against music under explanation. A sparse, melody-free bed at the intro, a few chapter transitions and the outro is a reasonable default to test. Check on a phone speaker with captions off: if you can hear melody over consonants, the bed is too loud.

Keep a licence record for every music and effects file (source URL, date, licence text). Generated music carries its own terms and, on some platforms, disclosure duties when it is the main focus of the video; see [chapter 9](09-encode-and-deliver.md).

## Review with and without sound

Watch the encoded film once on mute: the core message and visual evidence should remain understandable. Then watch with sound: listen for cut syllables, missing words, uncomfortable gaps, caption lag, effects masking consonants and an abrupt ending.

A written quality bar that worked for short vertical explainers: useful on mute; readable at 360×640; no clipped text, captions colliding with art, empty gaps, long motionless holds or abrupt syllable cuts; reviewed from encoded samples and motion sequences, not only scene-centre stills.

A few spot checks cannot prove every spoken word is correct. Document what was reviewed, which interpolated spans remain, which round-trip runs were flagged and how they were resolved, and who approved delivery. If no one has listened, write "not listened" in the receipt; a transcript, waveform or loudness number is not a listening review. Continue with [building scenes](06-building-scenes.md).
