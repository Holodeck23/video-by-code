# 5. Narration and captions

For a spoken film, finish the voice before polishing the animation. Voice determines duration, emphasis, breath and scene boundaries. Replacing it late can invalidate every caption and visual cue.

## Write for speech

Read the script aloud. Prefer concrete nouns and active verbs. Give each sentence a visual job. A short explainer still needs a complete arc: establish the problem, demonstrate a cause, show the change, prove the result and close with an actionable or memorable conclusion.

Budget time from a spoken take, not a word-count formula alone. A narrator needs pauses around important ideas. Fast delivery cannot rescue a script with too many claims. If a 30-second film contains a dense paragraph plus several diagrams, cut the script before shrinking the type or accelerating captions.

Maintain an approved display script and a pronunciation map. Numbers, times, abbreviations and names may need explicit spoken forms:

```json
{
  "3:07": "three oh seven",
  "2015": "twenty fifteen",
  "API": "A P I"
}
```

The pronunciation spelling is for synthesis. Captions should show the intended written form unless the director explicitly chooses otherwise.

## Choose and review the voice

Record a human take or use an approved synthesis system. Local TTS is convenient for animatics and smoke tests, but a successful waveform is not a production-quality verdict. Assess intelligibility, pace, emphasis, naturalness, speaker consistency and correct words.

Changing speech rate mainly changes pace; it may not fix flat prosody. A more expressive model can introduce speaker drift, missing clauses or inserted words. Compare short samples of the same paragraph and listen before synthesizing a long script. Keep the voice/model/version and settings in the production log.

Sentence-by-sentence synthesis can simplify retakes and establish exact scene chunks. It can also make rhythm mechanical or change the voice between chunks. Merge very short fragments when they sound unnatural. Trim exterior silence conservatively; retain consonant attacks and natural breath. A waveform threshold alone can cut a quiet syllable.

The included [narrated example](../examples/narrated-explainer.html) is a local integration proof. Its smoke-test voice generation is not a recommendation for a final narration style. The [narrated recipe](recipes/narrated-explainer.md) gives the exact runnable path.

## Verify words before aligning them

Listen against the approved script. ASR round-trip comparison is a useful additional screen for omissions: transcribe the synthesized take, normalize punctuation and compare token sequences. Flag unmatched runs and listen to them. Do not treat a match score as proof of correct pronunciation or expressive delivery.

Keep these artifacts separately:

- The approved script.
- The raw voice take.
- The trimmed or mastered voice used in the edit.
- Raw ASR/alignment output.
- Corrected timing data with uncertainty labels.

Timing must refer to the actual mastered edit track. A retake with the same filename can have different pause lengths. Record its hash and regenerate dependent timings when it changes.

## Build semantic cues

Prefer a specific word or phrase as the trigger for a major visual change. For “the result is verified,” show the result on “result” and the evidence or check on “verified.” Do not make scene changes solely because a sentence index increased.

If synthesis is chunked, exact chunk boundaries can define scene intervals. Word timings still need alignment or manual review. A cumulative duration table is often more dependable than guessing scene lengths from punctuation:

```json
{
  "scenes": [
    {"index":0,"start":0,"end":4.8,"text":"A job arrives."},
    {"index":1,"start":4.8,"end":10.6,"text":"Now watch the queue grow."}
  ],
  "words": [
    {"w":"A","start":0.18,"end":0.3,"source":"manual"},
    {"w":"job","start":0.31,"end":0.65,"source":"manual"},
    {"w":"arrives","start":0.66,"end":1.29,"source":"manual"}
  ]
}
```

This is a suggested schema. See [chapter 4](04-music-audio-and-timing.md) for validation and the limits of ASR, script matching and interpolation.

## Caption phrases, not arbitrary token buckets

A caption is a readable phrase held long enough to understand. Group by meaning, breath and layout. A fixed maximum of five words can create a one-word tail such as “running.” for 0.2 seconds. Rebalance adjacent cues instead.

Use complete phrases that accumulate and hold. Emphasis can change colour or weight while the phrase stays in place. Replacing a fragment every few syllables forces the viewer to continually relocate the text.

Author a caption record with an explicit display interval and line break:

```json
{
  "start": 4.8,
  "end": 7.9,
  "lines": ["Watch the queue", "grow behind one worker."],
  "emphasis": ["queue", "grow"]
}
```

Display times and spoken word times serve different purposes. A full phrase may become visible slightly before its last word is spoken and remain after it. If individual words highlight, their active intervals should still follow the measured voice.

Estimate reading burden as a planning aid, then inspect it in motion. A simple internal warning such as `0.5 s + 0.3 s per word` can catch very fast captions; it is not a universal accessibility rule and should not override the audience, sentence complexity or listening context.

## Measure text and reserve a region

Define a caption rectangle as part of the composition. For vertical video, keep essential content away from likely interface overlays, then test on the actual destination UI. No universal safe rectangle covers every platform, device and overlay mode.

Use the final font and measure each line before drawing. Wrapping must account for the weight used by emphasized words. Test the longest phrase and words with wide glyphs. Balanced two-line wrapping is usually easier to read than a long line plus a single orphan word.

At every sampled frame, verify:

```text
left >= safe.left
right <= safe.right
top >= safe.top
bottom <= safe.bottom
```

If the phrase does not fit at the minimum approved size, reword or rebalance it. Do not shrink until it technically fits and becomes unreadable on a phone. Keep stable caption baselines and avoid having the hero object pass through the text region.

Canvas text bounds need explicit layout logic. A browser's DOM inspector cannot see painted words. `measureText()` gives width and can provide actual glyph bounds, but shadows, strokes, rotation and effects extend visible bounds further. Include that padding in collision tests.

## Sidecar captions need their own review

Burned-in captions and SRT/VTT are separate deliverables. A polished burn-in does not fix a poorly grouped sidecar file. Check timing order, overlaps, empty cues, one-word tails, punctuation and final cue duration. Confirm the exported text equals the approved script, allowing intentional display conventions.

For SRT, use increasing cue numbers and `HH:MM:SS,mmm` timestamps. A cue should have a positive duration and remain inside the delivered clip. If exporting only a segment, subtract the segment start from sidecar timestamps and remove or trim cues outside it.

## Mix voice with restraint

Narration should stay intelligible without forcing the viewer to raise volume. Use effects to mark a meaningful event, not every moving element. In this kit, `--voice` mixes narration with the optional page score and asks the sound kit for its voiceover mode, which suppresses beds/music and reduces minor effects. This is a useful default, not adaptive dialogue ducking.

A voice-oriented working target might be around -16 LUFS for narration and -14 LUFS for a web master, with true peak headroom near -1.5 dBTP. These are production choices, not a promise about every platform. Measure the final encode and use the destination's requirements when supplied.

The renderer normalizes voice mixes in one pass. For a critical master, prepare and measure a controlled mix first; use two-pass normalization where needed and audition the result. Do not normalize silence or overcompress to conceal a poor recording.

## Review with and without sound

Watch the encoded film once on mute: the core message and visual evidence should remain understandable. Then watch with sound: listen for cut syllables, missing words, uncomfortable gaps, caption lag, effects masking consonants and an abrupt ending.

A few spot checks cannot prove every spoken word is correct. Document what was reviewed, which interpolated spans remain, and who approved delivery. Continue with [building scenes](06-building-scenes.md).
