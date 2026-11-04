# 10. Failure patterns and how to diagnose them

This chapter turns recurring production mistakes into checks. Diagnose the layer that failed before changing unrelated code. Save a small regression case when a defect was subtle enough to escape review once.

Every row below happened in a real code-driven video production, or is the direct consequence of one that did. The numbers in the rows are observations from those productions, given so you can recognize the scale of the effect; they are not universal thresholds. Each row names how to prove the repair, because a fix that has not been checked is a guess.

The tables are grouped by layer: direction, audio and timing, narration and captions, scenes and typography, rendering and capture, encoding and delivery, verification, tooling, and team process. Start with the layer where the symptom appeared, then follow the "why" column one layer back.

## Direction and references

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Beautiful but meaningless motion | The engine was built before the subject and shot map | Write the visual sentence for each beat; approve a hero frame and pilot |
| "It does not look like anything" after every technical gate passed | The film was built engine-first, so no frame was ever composed to carry the story | Write 8–12 key moments first, make a target still for each, review them as a strip, then build to match them |
| Wrong reference style | A similar title, creator or genre was studied instead of the named clip | Confirm the exact file/version and save the comparison frames |
| Several films studied against the wrong reference | The named reference was never downloaded; a sibling video stood in for it | Download the exact named reference before any study; record its identifier in the study |
| Claims about how a reference was built | Implementation was inferred from frames and presented as fact | Record separately what the creator credits, what is visible, and what you infer |
| Same look as the last film | Scene art was reused along with rendering plumbing | Reuse infrastructure; design this film's subject, material and composition separately; state the new visual idea before writing scene code |
| Rejected direction comes back in a new renderer | The metaphor, silhouette and palette were carried over when the engine changed | A rejection applies to what is on screen; replace the premise, not the shader pipeline |
| “More energy” becomes debris and flashes | A vague review note was translated into effects | Identify whether pace, contrast, voice or story progression is weak; change that cause |
| Many cuts, little progression | Shot count substitutes for visible consequence | Track what changes and remains changed; make returns accumulate meaning |
| Pilot fails however good each screen is | Cut density was a feeling, not a target; a 26-second pilot held two screens while the reference switched every 2–4 s | Measure the reference's cut rate from a 1 fps contact sheet; state the pilot's rate beside it |
| Dark style looks muddy or washed out | Palette constants were accepted without viewing exports | Measure and inspect comparable encoded reference/candidate frames |
| Dark frames twice as bright as the reference | Background mixes in linear RGB lift sRGB blacks (a linear 0.11 becomes about 94/255) | Measure median luma and % above 128 against the reference; recalibrate the darkest mixes |
| Rainbow frame | Several accent colours on screen at once | One accent per world, plus one rare alarm colour spent once |
| Detailed scene has no focal point | Every layer competes at once | Establish one hero, reduce accent usage and restore calm ground (60–80% of the frame) |
| Gag covers the word being sung or spoken | A visual joke was placed without checking the text region at that time | Readability outranks the gag; check the text rectangle at the exact word time |
| Ending does not land | The last scene shows an object, not a consequence of the premise | Test the ending against the opening premise; show the change the film promised |

No numerical look gate can establish that a story is compelling. Use it to locate a mismatch, then make a directional judgment.

## Audio and timing

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Wrong take used in export | Filename or default path stood in for identity | Hash selected audio, record the mux source and compare the delivered mix |
| Promised silence or drop never occurs | The generation prompt was treated as an arrangement map | Measure the actual take; mark intended events located or absent |
| A "2-beat silence" is really a 4-bar drum dropout | Scored directions in generated music are weak hints | Scan the mix at 20 ms RMS and per-stem per-bar RMS; design to what is there |
| Whole film drifts off beat | Nominal BPM was assumed constant | Use detected events, inspect residuals and fit constant tempo only when justified |
| Fixed grid matches only a fraction of kicks | A track prompted at one tempo drifted (one moved from 129.1 to 132 BPM; a fixed grid matched 29% of kicks) | Track real beats; check drift before fitting one tempo |
| Beat-tracker tempo reads about 1% low | Quantized inter-beat intervals bias the median | Cut on per-beat event times, never on the median BPM |
| Chorus cut is one or two beats early | Downbeat phase heuristic chose the wrong beat one (one cut landed 1.012 s early, mid-word) | Assert every section downbeat within ±120 ms of the section start and after the previous line's last word; fail loudly |
| Silence measured shorter than it is | Edge detection lost half an RMS window at each side (0.906 s read for a true 0.952 s gap) | Push each edge out half a window; verify on a known-answer track |
| Structural boundaries appear as troughs | A sign error inverted the novelty kernel | Test the analyzer on synthetic audio with known sections |
| Section detector returns one 92-second block | Novelty segmentation failed on the track | Build the song map from stems plus word times |
| Words appear in an instrumental gap | ASR hallucination or cue interpolation crossed silence | Constrain alignment to the real passage, label uncertainty and listen |
| Recognizer "hears" lyrics over the intro | Prompting the recognizer with the lyric text bleeds into silence | Reject matches outside cue windows; listen to the first seconds |
| First word spans a long silence | ASR stretched the onset backward | Correct the first audible onset (cap the first word at about 0.45 s); preserve silence as silence |
| Sustained word highlights late | Even word distribution ignored held vowels | Separate onset from active duration; verify against the take |
| Repeated chorus matches wrong occurrence | Text matching searched the full song | Match within measured section windows |
| Word times run backward | Large unmatched phrase was interpolated across bad anchors (a 48-word paragraph over 33 s) | Split lines over 14 words or 6.5 s into sentences; assert strict time order |
| Hook steals the ad-lib after a break | One written line was aligned across an 8.6 s instrumental gap | Split any line at an inter-word gap over 2.5 s; promote heard ad-libs to their own lines |
| Embedded lyric cue lasts 20+ seconds | Exported cue ends run to the next section across a break | Treat embedded cues as unverified hints; clamp each line's window before distributing words |
| Gang vocals collapse in forced alignment | Stacked shouted voices defeat acoustic alignment | Clamp windows to two bars per line; snap shouts to the 16th-note grid |
| Many words under 100 ms | Heuristic word placement (syllable weight plus vocal energy) is not alignment | Label it heuristic; listen to the kinetic-type passages |
| Single-line karaoke shrinks to unreadable type | A whole paragraph was given one line, and fit-to-width shrank it | Split long lines before layout; set a minimum type size |

Embedded subtitle times, ASR timestamps and interpolated words must retain their provenance. A confident-looking JSON file is not stronger evidence than the method that created it.

## Narration and captions

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Voice is flat despite slower speed | Prosody was confused with pace | Measure F0 spread (a local model measured 2.9–3.0 semitones vs 4.3–5.7 for human narrators); change the performance, not the speed |
| TTS drops clauses or changes speaker | Synthesis quality was inferred from completion | Round-trip text check plus listening; regenerate only the affected passage |
| Expressive model sounds like different people per paragraph | Default voice not pinned between calls (median F0 ranged 81–235 Hz) | Use a fixed reference clip and seed; check per-paragraph median F0 |
| Expressive model drops words | Autoregressive synthesis skipped 2 clauses and 3 words, inserted 1, in about 1,950 words | `verify-narration.py` on every take; read the heard text for insertions |
| Speed flag has no effect | Some models ignore it | Measure words per minute on the output; change pace with a tempo filter if needed |
| Numbers and names mispronounced | The synthesizer read the display text | Pronunciation map (`--say`); test each name in isolation |
| One-word fragments sound odd | Very short sentences were synthesized alone | Merge fragments under 4 words into the previous sentence |
| Quiet syllable cut off | Silence trimming used only an amplitude threshold | Keep 45 ms before and 90 ms after detected sound; listen at every join |
| Timing no longer matches after a retake | The new take reused the filename | Hash the mastered take; regenerate all timing when the hash changes |
| Narration verifier passes a wrong word | Single-word differences fall below the 3-word run threshold | Listen to flagged and interpolated spans; lower `--min-run` for dense scripts |
| Verifier flags a correct passage | A pronunciation substitution counts as replaced words | Confirm by listening; record the substitution as the reason |
| One-word caption tails flicker | Fixed token grouping ignored phrase structure | Rebalance adjacent cues and give the phrase a readable hold |
| Caption replaced every few syllables | Fragments were displayed instead of phrases | Complete phrases that accumulate and hold; change emphasis, not position |
| Caption gone before it can be read | No reading floor (one 7-word phrase held 1.71 s against a 1.95 s floor) | Check `0.5 s + 0.3 s per word`; extend into the pause or merge |
| Lone last word on its own line | Greedy line wrapping | Balanced two-line wrap; lint for orphans |
| Highlight runs ahead of the voice | Display times used for word activation | Use measured word times for highlights, phrase times for display |
| Caption collides with closing prompt | Caption region was added after scene design | Reserve and test bounds at every relevant frame |
| Burn-in fixed, SRT still broken | Sidecar generated by a different script with 5-word buckets ("done." for 0.2 s) | Generate both from the same caption records, or lint both |
| Segment SRT is offset | Sidecar times were not shifted by the segment start | Subtract `FROM`; drop or trim cues outside the clip |
| Narration masked by effects | Every motion got a sound | Effects only for meaningful events; minor sounds reduced; listen on a phone speaker |
| Final film plays quiet | Mastered to −23 LUFS; platforms turn loud audio down but not quiet audio up | Master to about −14 LUFS, −1.5 dBTP; verify the MP4 |
| Limited mix comes out at 0 dBFS | `alimiter` levels its output back to full scale by default | Add `level=disabled`; measure true peak after the chain |

## Scene and typography defects

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Frame changes after seeking | Mutable state, per-frame random calls or live clocks | Use absolute-time formulas, seeded immutable parameters and seek-hash checks |
| Earlier scene ghosts into later scene | Scene was not cleared, state leaked, shader path failed | Reset baseline, balance state stack and inspect browser/shader errors |
| Previous scenes accumulate under a new one | A shader referenced an undeclared constant, failed to compile, and the background never cleared | Treat any shader compile error as fatal; check the console on the first frame of every scene |
| Post stage crashes on one scene | A scene returned an undefined value where the engine destructures a pair | Return complete objects from scene hooks; type-check the scene interface |
| Label fits at first, clips later | Fallback font or emphasis weight changed width | Await exact fonts; measure with final weight and test longest phrases |
| Semi-bold system font overflows safe zone | `600` weight in `Arial` snaps to `700` Bold on macOS, widening lines | Use weights the font actually ships (`400` or `700`) and audit `actualBoundingBox*` across all frames |
| Row fitted to width still runs off frame | Fit used one global width, ignoring left, right or centred alignment | Measure the room the row actually has for its alignment; test right-aligned rows |
| Rows fitted correctly now collide | Two rows share a baseline side by side | Stack rows vertically |
| Row grows off-screen as words are added | Width was fitted to words sung so far | Fit to the full eventual text |
| Counter-scaled label clips at overview zoom | Zooming out (`z <= 0.30`) enlarges counter-scaled text in world units near a viewport clip edge | Widen overview zoom/centre and inspect frame `#0` and `#N-1` against the clip rect |
| 3D text plane clips the frame edges | Text sized in world units ignored the camera frustum | Size from visible width `2·d·tan(fov/2)·aspect`; test while the camera moves |
| Continuous pan triggers `cut-harshness.py` SLAM spike | Camera move started at `beat[i].start - preRoll` while `i` switched at `beat[i].start`, jumping 25% in one frame | Start interpolation at `beat[i].start` and fade beat-specific overlays over 0.2 s |
| Return/feedback loop hides forward route | Loop polyline shared a segment with the main route | Offset return loops onto a parallel track or 45-degree bypass |
| Type glows into a white blob | Bloom/post-processing includes text | Push only accent pixels into HDR; keep white type below the bloom threshold |
| Particles near the lens become a blob | Additive points grow without limit near the camera | Cap point size; keep emitters out of the near field |
| Opaque panel hides its own words | Chrome layer composited above the type layer | Put opaque props beneath the type; erase chrome rather than painting over it |
| Destruction effect finishes before it is seen | Eased progress spent most of its change in a few frames | Use linear progress for effects that should be watched |
| White-paper look becomes cream/dark | Tone mapping or copied palette was inappropriate | Skip filmic tone mapping on paper; roll off only highlights; calibrate after export |
| Impact flash turns the accent the wrong colour | A full RGB negative inverts hue | Invert luma only, keeping the accent's hue |
| Mirrored image has backward digits | Whole source plate was flipped | Separate text/clock/diagram layers or repaint the details unmirrored |
| Paper motion reads as random jitter | Point positions are randomized each frame | Use spatial seeded wobble; quantize boil to about 8 fps |
| A cut feels like a camera glitch | Near-identical framings jump or interpolation crosses a boundary | Inspect contiguous frames and actual rendered transforms around the cut |
| Camera sweeps between shots at a cut | Fractional cut time rounded to the previous frame | First new-shot frame is `ceil(cut × fps)`; disable shutter blur at the discontinuity |
| Keys ignore the requested interpolation | Script-inserted keys kept the application's default curve | Set interpolation on the key points explicitly; audit the baked path |
| Fast macro shot jitters | Rapid control curves drive global position or scale | Smooth fast controls before applying them to the camera |
| Frame blending makes a jump worse | Unrelated shots were averaged | Fix the shot boundary; prevent blur samples crossing cuts |
| Small fast debris strobes | Motion blur covered only camera and hero | Blur all fast movers or remove them; check three consecutive frames |

A still at the middle of a scene cannot prove entry, exit or temporal readability. Save boundary frames and a motion probe for transitions that have failed before.

## Rendering and capture

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Last pictures are missing | Audio ended first under `-shortest` | Require exact frame count; pad/trim audio deliberately |
| Multi-worker render dies with `websocket closed` | ffmpeg exited early under `-shortest` and closed the pipe | Remove `-shortest`; assert the exact frame count |
| “Render complete” but missing images | Exit status or file presence was the only evidence | Verify frame count, decode and source-bound completion records |
| 3D renderer exits 0 after a script error | Some offline renderers return success after an exception | Check a completion marker and the output frame count |
| Resume reuses stale chunks | Cached output lacks render identity | Include revision, asset hashes, settings and frame interval in chunk intent |
| Parallel capture scrambles frames | Workers returned out of order | Index frames explicitly, reorder with bounded buffers and apply backpressure |
| JPEG transport truncates frames | WebSocket continuation frames (messages over 128 KB) were ignored | Reassemble `FIN=0` + opcode `0x00` fragments; test with a high-detail frame |
| Memory grows until the render dies | Reorder buffer unbounded, no acknowledgement window | Cap in-flight frames per worker; spool overflow to disk |
| Render estimate wildly wrong | ETA taken from GPU-only frame time | Quote from end-to-end throughput on the heaviest section |
| Throughput collapses on one machine | Chrome fell back to software rendering | Check `UNMASKED_RENDERER_WEBGL`; fix the launch |
| More workers, slower render | Workers compete for one GPU and encoder | Measure 1, 2, 3 workers on a representative segment |
| Deterministic scene, inconsistent screenshots | Screenshot captured stale compositor paint | Wait for fonts and paint after drawing; test repeated timestamps through the capture path |
| Every still renders at `t = 0` | A mistyped flag was silently ignored | Reject unknown flags; name stills by the time drawn |
| `--samples` has no effect | The page has no sub-frame hook | Define `window.__still(t, samples, shutter)`; check a blurred frame |
| Manifest step fails after a long render | A multi-gigabyte file (2.9 GB) was read into one buffer | Hash by streaming; keep manifest generation separate from rendering |
| Manifest binds a render to newer code | Repaired after the source changed | Record the revision from the render intent; refuse dirty trees |
| A command silently does nothing useful | Guessed flag was ignored or default asset used | Reject unknown flags; inspect actual CLI help and write output metadata |
| Browser preview works, export fails | Assets or animation depend on live playback | Gate readiness, use one clock and exercise the export path early |

When changing performance plumbing, retain a known design frame and a short encoded reference. Compare against them after the change. Faster output is not useful if text, colour or timing regresses.

## Encoding and delivery

| Failure | Why it happens | Repair and proof |
|---|---|---|
| MP4 plays oddly or audio is unsupported | Container extension was mistaken for codec | Probe streams; use the agreed AAC review profile |
| Opus inside an MP4 | `-c:a copy` from an `.m4a` that carried Opus | Re-encode audio to AAC once; the verifier fails Opus in MP4 |
| Colours differ across players | Matrix conversion, range and tags disagree | Convert deliberately, set metadata and probe the encoded stream |
| Tags missing despite `-color_*` flags | Output flags alone did not reach the stream (transfer and primaries probed `unknown`) | Convert with `scale=out_color_matrix=bt709` and stamp with `setparams`; probe |
| Slight hue shift on every frame | RGB-to-YUV conversion defaulted to BT.601 while players assume BT.709 | Specify `out_color_matrix=bt709` |
| Crushed blacks, clipped whites | Full-range `yuvj420p` from JPEG frames, tagged as if limited | Convert to `out_range=tv`; the verifier fails `yuvj420p` |
| Red/copper edges smear despite high quality | Chroma subsampling removes colour resolution (red SSIM 0.693 vs green 0.977) | Compare per RGB channel against same-frame source; test a 4:4:4 master |
| Increasing bit depth does not fix colour edges | Bit depth was used to address subsampling (10-bit 4:2:0 reached only 0.722) | Test chroma format separately from quantization depth |
| Banding expected, none present | Artefact predicted without testing | Amplify the shadows and look before spending effort |
| File is enormous | Fine grain/noise dominates compression (41 s at about 1 GB) | Coarser 2×2 grain at lower strength; compare final-size frames and quality settings |
| Quality complaint means a full re-render | Frames were not kept | Keep frames or a lossless intermediate; re-encode instead |
| Review copy damaged by repeated transcodes | Each review file derived from the last | Derive every copy from the master |
| Muxed audio is a lossy derivative | A preview MP3 was used as the mux source | Mux from the selected original or approved PCM mix |
| Segment audio trimmed twice | An already trimmed file was passed with a nonzero `--from` | Supply page-timed audio; document segment-relative files |
| Render or upload reported as "released" | A completed upload was taken as publication | Record actual publication status and URL separately |

## Verification mistakes

| Failure | Why it happens | Repair and proof |
|---|---|---|
| “All checks passed” hides warnings | The summary line was reported instead of the rows | Record the report and every warning disposition |
| Canvas is invisible to DOM layout checks | Linters see zero text, zero contrast checks or a "dead stretch" on a canvas film | Treat zero coverage as a gap; add geometry assertions and encoded-frame inspection |
| The verifier repeats the implementation's mistake | A camera audit called the same analytic function as the scene code | Check actual output or baked data; keep the real failed boundary as the regression |
| AI review accepted without checking its claims | A write-on word was called clipped; a description referred to another version | Reopen the encoded file at the timestamp; verify before fixing |
| Technical validation called creative approval | Frame count, decode and sync were treated as quality evidence | Use precise status language; keep technical, agent and human records separate |
| Audio is never heard | Waveform, transcript and loudness stood in for listening | Leave listening approval pending until someone has heard the output |
| The wrong comparison source is used | Frames offset, voice-only reference against a full mix, untrimmed against a segment | Confirm both sides represent the same interval and processing stage |
| Per-channel comparison scores a lossless encode poorly | Frames paired by mismatched time bases, or the wrong matrix on decode | Calibrate: a lossless encode must score near 1.0 before trusting the tool |
| Cut count far below the real pace | Scene-change scores miss cuts on dark, uniform grounds (19 found in 305 s) | Judge pace from a 1 fps contact sheet |
| Detector output empty | `showinfo` or detectors log at info level and `-v error` hid them | Use `-nostats` and filter output; confirm a known event is reported |
| Viewer glitch list fixed one timestamp at a time | Reports were not classified | Measure each report; cluster into classes; fix the class |
| Unblurred debris approved because it was "documented" | A named limitation was treated as accepted | Fix it, or get the viewer's explicit acceptance before the long render |
| Pacing judged from a stitched preview | Partial excerpts jumped mid-shot | Review contiguous excerpts; label discontinuous previews |
| Stutter blamed on the file | Playback competed with a running render for the GPU | Re-watch when the machine is idle |
| Liked pilot treated as acceptance of the full film | Acceptance was not tied to a version | Record the exact version and scope of each verdict |

## Tooling and environment

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Scans "found nothing" | macOS has no `timeout` command; each prefixed command exited 127 with empty stdout | Check exit codes; install a timeout tool or use the language's own timeout |
| Beat tracker returns an array where a number was expected | A library update changed the tempo return type | Coerce explicitly (`float(np.atleast_1d(x)[0])`); pin versions |
| Python ASR bindings fail to install | Native dependencies did not build on the machine | Use the `whisper-cli` backend; record the working path |
| Analysis script refuses to run | Python version above what a dependency supports | Select the documented version (`uv run --python 3.12`) |
| Image generation stops partway | Provider rate limits (one stopped after 14 images) | Plan quotas; make generation rerunnable and skip existing outputs |
| Batch image tool ignores the prompt | An argument placed after an option was consumed as that option's value | Check the CLI's argument order; inspect the first output before the batch |
| Hardcoded paths break on another machine | Absolute user paths, a fixed ffmpeg path or a scratch virtualenv | Run the handoff from a clean checkout on another account or machine |

## Team and process

| Failure | Why it happens | Repair and proof |
|---|---|---|
| Third large file from an agent never arrives | One agent was asked to stream three 600-line files in a turn; the last write dropped on a broken pipe | One or two scene files per agent; confirm each file on disk |
| Parallel agents change the shared API | Primitives, timeline and data were not locked before fan-out | Lock shared primitives, timeline and data first; one writer per file |
| Fan-out output looks fine in prose, fails in the build | No mechanical check after agents finished | Typecheck, a whole-film contact sheet and a look audit before the full render |
| Named limitation shipped as a defect | A review wrote it down and approved anyway | Fix it, or get it accepted by the person who will watch, by name, before the long render |
| Feedback cannot be acted on | Notes say "make it better" | Timestamp, what to keep, one change, how to tell it worked |
| Only copy of a render lost | It lived in a tool's output or scratch folder | Copy into `renders/<pass>/` in the same turn; log the path |
| README describes an old render | Status not updated when a new render replaced it | Update status with each render; name the current file |

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
