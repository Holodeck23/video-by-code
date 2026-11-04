# 10. Failure patterns and how to diagnose them

This chapter turns recurring production mistakes into checks. Diagnose the layer that failed before changing unrelated code. Save a small regression case when a defect was subtle enough to escape review once.

## Direction and references

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Beautiful but meaningless motion | The engine was built before the subject and shot map | Write the visual sentence for each beat; approve a hero frame and pilot |
| Wrong reference style | A similar title, creator or genre was studied instead of the named clip | Confirm the exact file/version and save the comparison frames |
| Same look as the last film | Scene art was reused along with rendering plumbing | Reuse infrastructure; design this film's subject, material and composition separately |
| “More energy” becomes debris and flashes | A vague review note was translated into effects | Identify whether pace, contrast, voice or story progression is weak; change that cause |
| Many cuts, little progression | Shot count substitutes for visible consequence | Track what changes and remains changed; make returns accumulate meaning |
| Dark style looks muddy or washed out | Palette constants were accepted without viewing exports | Measure and inspect comparable encoded reference/candidate frames |
| Detailed scene has no focal point | Every layer competes at once | Establish one hero, reduce accent usage and restore calm ground |

No numerical look gate can establish that a story is compelling. Use it to locate a mismatch, then make a directional judgment.

## Audio and timing

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Wrong take used in export | Filename or default path stood in for identity | Hash selected audio, record the mux source and compare the delivered mix |
| Promised silence or drop never occurs | The generation prompt was treated as an arrangement map | Measure the actual take; mark intended events present or absent |
| Whole film drifts off beat | Nominal BPM was assumed constant | Use detected events, inspect residuals and fit constant tempo only when justified |
| Chorus cut is one or two beats early | Downbeat phase heuristic chose the wrong beat one | Check actual section starts, constrain offset and review the preceding vocal end |
| Words appear in an instrumental gap | ASR hallucination or cue interpolation crossed silence | Constrain alignment to the real passage, label uncertainty and listen |
| First word spans a long silence | ASR stretched the onset backward | Correct the first audible onset; preserve silence as silence |
| Sustained word highlights late | Even word distribution ignored held vowels | Separate onset from active duration; verify against the take |
| Repeated chorus matches wrong occurrence | Text matching searched the full song | Match within measured section windows |
| Word times run backward | Large unmatched phrase was interpolated across bad anchors | Split into smaller phrases and validate strict time order |
| Voice is flat despite slower speed | Prosody was confused with pace | Compare a new performance/model or recorded take; listen before scaling |
| TTS drops clauses or changes speaker | Synthesis quality was inferred from completion | Round-trip text check plus listening; regenerate only the affected passage |

Embedded subtitle times, ASR timestamps and interpolated words must retain their provenance. A confident-looking JSON file is not stronger evidence than the method that created it.

## Scene and typography defects

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Frame changes after seeking | Mutable state, per-frame random calls or live clocks | Use absolute-time formulas, seeded immutable parameters and seek-hash checks |
| Earlier scene ghosts into later scene | Scene was not cleared, state leaked, shader path failed | Reset baseline, balance state stack and inspect browser/shader errors |
| Label fits at first, clips later | Fallback font or emphasis weight changed width | Await exact fonts; measure with final weight and test longest phrases |
| Semi-bold system font overflows safe zone | `600` weight in `Arial` snaps to `700` Bold on macOS, widening lines | Use weights the font actually ships (`400` or `700`) and audit `actualBoundingBox*` across all frames |
| Counter-scaled label clips at overview zoom | Zooming out (`z <= 0.30`) enlarges counter-scaled text in world units near a viewport clip edge | Widen overview zoom/centre and inspect frame `#0` and `#N-1` against the clip rect |
| Continuous pan triggers `cut-harshness.py` SLAM spike | Camera move started at `beat[i].start - preRoll` while `i` switched at `beat[i].start`, jumping 25% in one frame | Start interpolation at `beat[i].start` and fade beat-specific overlays over 0.2 s |
| Return/feedback loop hides forward route | Loop polyline shared a segment with the main route | Offset return loops onto a parallel track or 45-degree bypass |
| Caption collides with closing prompt | Caption region was added after scene design | Reserve and test bounds at every relevant frame |
| One-word caption tails flicker | Fixed token grouping ignored phrase structure | Rebalance adjacent cues and give the phrase a readable hold |
| Type glows into a white blob | Bloom/post-processing includes text | Separate crisp overlay from bloom or constrain effect strength |
| White-paper look becomes cream/dark | Tone mapping or copied palette was inappropriate | Calibrate the chosen light-ground treatment after export |
| Mirrored image has backward digits | Whole source plate was flipped | Separate text/clock/diagram layers or repaint the details unmirrored |
| Paper motion reads as random jitter | Point positions are randomized each frame | Use spatial seeded wobble; animate only intended roughness |
| A cut feels like a camera glitch | Near-identical framings jump or interpolation crosses a boundary | Inspect contiguous frames and actual rendered transforms around the cut |
| Frame blending makes a jump worse | Unrelated shots were averaged | Fix the shot boundary; prevent blur samples crossing cuts |

A still at the middle of a scene cannot prove entry, exit or temporal readability. Save boundary frames and a motion probe for transitions that have failed before.

## Rendering and encoding

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Last pictures are missing | Audio ended first under `-shortest` | Require exact frame count; pad/trim audio deliberately |
| MP4 plays oddly or audio is unsupported | Container extension was mistaken for codec | Probe streams; use the agreed AAC review profile |
| Colours differ across players | Matrix conversion, range and tags disagree | Convert deliberately, set metadata and probe the encoded stream |
| Red/copper edges smear despite high quality | Chroma subsampling removes colour resolution | Compare per RGB channel against same-frame source; test a 4:4:4 master |
| Increasing bit depth does not fix colour edges | Bit depth was used to address subsampling | Test chroma format separately from quantization depth |
| File is enormous | Fine grain/noise dominates compression | Reduce unnecessary noise; compare final-size frames and quality settings |
| “Render complete” but missing images | Exit status or file presence was the only evidence | Verify frame count, decode and source-bound completion records |
| Resume reuses stale chunks | Cached output lacks render identity | Include revision, asset hashes, settings and frame interval in chunk intent |
| Parallel capture scrambles frames | Workers returned out of order | Index frames explicitly, reorder with bounded buffers and apply backpressure |
| JPEG transport truncates frames | WebSocket continuation frames were ignored | Use a compliant transport library or test fragmentation handling |
| A command silently does nothing useful | Guessed flag was ignored or default asset used | Reject unknown flags; inspect actual CLI help and write output metadata |
| Browser preview works, export fails | Assets or animation depend on live playback | Gate readiness, use one clock and exercise the export path early |

When changing performance plumbing, retain a known design frame and a short encoded reference. Compare against them after the change. Faster output is not useful if text, colour or timing regresses.

## Verification mistakes

**“All checks passed” hides warnings.** Record the actual report and every warning disposition. A tool can return zero while detecting black or frozen intervals that still need review.

**Canvas is invisible to DOM layout checks.** Zero contrast checks or zero inspected text nodes is a coverage gap. Add geometry assertions and encoded-frame inspection rather than celebrating a clean count.

**The verifier repeats the implementation's mistake.** A camera audit using the same faulty analytic function can agree perfectly with the scene code while the rendered camera is wrong. Check actual output or an independent representation. A regression should contain the real failed boundary, not just a new easy case.

**AI review is accepted without checking its claims.** A write-on word may be falsely called clipped; a frame description may refer to a different version. Reopen the specified encoded file and timestamp. Verify whether the claimed defect exists before fixing it.

**Technical validation is called creative approval.** Correct frame count, clean decode, audio correlation and a passed linter do not prove expressive voice, good direction or human acceptance. Use precise status language.

**Audio is never heard.** Waveform, transcript and loudness analysis cannot prove pleasant delivery or a clean edit. Leave listening approval pending until a person or an actual audio-review process has heard the relevant output.

**The wrong comparison source is used.** Per-channel metrics fail if frames are offset; correlation can fail if the reference is voice-only while the encode has music. Confirm that both sides represent the same interval and processing stage.

## Handover and storage mistakes

Do not leave the only source media, timing corrections or evidence in a tool's temporary directory. A cap or crash should cost a few minutes, not the whole production. Write durable artifacts as work lands, checkpoint complete units and name the actual saved paths.

Do not place private client transcripts or source media in a shared repository. Use synthetic examples in the kit and link production assets from their proper home. `.gitignore` does not restrict local filesystem access.

Do not leave conflicting instructions in a README and production log. Update status when a new render replaces an old one. A source revision, selected audio hash, exact command and explicit review state are more reliable than “latest” or a timestamped filename alone.

## A compact diagnosis loop

1. Identify the exact artifact and timestamp.
2. Reproduce the defect in the smallest representative clip or frame.
3. Locate the failing layer: source, timing, direction, scene, capture, encode or review.
4. Change that layer and render the same probe.
5. Compare before and after, including any adjacent boundaries.
6. Add a meaningful regression check when the failure could recur.
7. Update the receipt and state what remains unreviewed.

Then return to [the team playbook](11-team-playbook.md) for the next checkpoint, or use the appropriate [production recipe](recipes/narrated-explainer.md).
