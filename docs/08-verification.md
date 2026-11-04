# 8. Verify the encoded film

A render is not verified because the command finished. Verify the actual delivery file, then inspect and listen to it. Keep machine findings, human review and creative acceptance as separate states.

## Use a layered check

| Layer | Questions | Evidence |
|---|---|---|
| Source | Is this the approved audio, script and code revision? | Hashes and render intent |
| Runtime | Does the page load, seek and draw reliably? | Browser errors, readiness and determinism test |
| Container | Correct size, fps, frame count, codecs, duration and colour? | Probe report |
| Decode | Can the whole file be decoded without error? | Full decode result |
| Timing | Is the audio aligned, and do visible events match the words? | Correlation plus listening and cue review |
| Image | Are type, colour, composition, cuts and motion correct? | Stills, contact sheets and motion probes |
| Editorial | Is the message clear and compelling? | Human notes and acceptance |

Each layer finds different defects. A checksum proves identity, not quality. A frame count proves coverage, not camera continuity. An audio correlation score proves a relationship between tracks, not that a caption highlights the right syllable.

## Run the included video verifier

From the kit root, using the production folder established in [chapter 7](07-rendering.md):

```bash
uv run tools/verify/verify-video.py "$PROD/renders/proof/narrated.mp4" --expect-seconds 36 --fps 30 --width 1920 --height 1080 --json "$PROD/qa/narrated.verify.json"
uv run tools/verify/verify-video.py "$PROD/renders/proof/vertical.mp4" --expect-seconds 12 --fps 30 --width 1080 --height 1920 --json "$PROD/qa/vertical.verify.json"
```

The tool checks dimensions and frame rates when expected values are provided; frame count and duration; pixel format; BT.709 tags and limited range; audio codec and duration; full decode; black and frozen intervals; loudness and true peak. It writes a JSON report and prints PASS/WARN/FAIL/INFO rows.

For a deliberately silent film, pass `--allow-silent`. To require a specific integrated loudness, pass `--lufs -14 --lufs-tol 1`. Without `--lufs`, values outside the tool's working range warn rather than fail. The default true-peak maximum is -1 dBTP; change it only to match an agreed specification. For a deliberate 4:4:4 or supported 10-bit master, use `--allow-444` and record why it differs from the web-review profile.

The verifier returns zero when no FAIL rows exist. WARN rows still require explanation. A designed still hold may trigger frozen-frame detection; a black pause may be intentional. Conversely, a subtle unwanted hold may not meet a detector's threshold. Review the intervals rather than simply raising the threshold until the report turns green.

## Count pictures and decode all of them

For 36 seconds at 30 fps, require 1,080 output pictures; for 12 seconds, require 360. For arbitrary frame rates and intervals, use the same rounding policy as the renderer and a frame-aligned duration. Avoid ambiguities at half-frame boundaries between languages.

For an explicit decoded frame count:

```bash
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,r_frame_rate,avg_frame_rate,duration -of json "$PROD/renders/proof/narrated.mp4"
```

For an independent full decode:

```bash
ffmpeg -hide_banner -v error -xerror -i "$PROD/renders/proof/narrated.mp4" -f null -
```

Some container fields count packets or report stored metadata. A full decode adds important evidence, but still does not establish visual correctness. Check that the final intended frame is present, especially after changing audio fitting or removing `-shortest`.

## Check audio synchronization correctly

The verifier's `--audio-source` option compares the encoded audio with a reference PCM track at seven points, scanning approximately ±100 ms. It expects correlation above 0.90 and lag below one output frame.

Use the actual timeline-zero mix that was sent to the encoder:

```bash
uv run tools/verify/verify-video.py "$PROD/renders/master/film.mp4" --expect-seconds 36 --fps 30 --audio-source "$PROD/source/approved-mix.wav" --json "$PROD/qa/master.verify.json"
```

Do not compare a voice-only track with a loud effects/music mix and infer an export defect from the lower correlation. Do not compare a 7.2–14.4 second segment with an untrimmed reference; prepare an identically trimmed reference first. Normalization, denoising or dynamics processing can also affect comparison.

Silence has nothing to correlate. Repetitive clicks can produce ambiguous lags. Seven checkpoints are a useful screen, not proof of every sample. Review visual word timing independently: a perfectly synchronized mix can still drive incorrectly authored captions.

## Inspect representative frames

Make a whole-film contact sheet:

```bash
uv run tools/verify/contact-sheet.py "$PROD/renders/proof/narrated.mp4" "$PROD/qa/narrated-sheet.jpg" --n 24 --cols 6
```

For a dense sequence, sample more frequently in a short interval:

```bash
uv run tools/verify/contact-sheet.py "$PROD/renders/proof/narrated.mp4" "$PROD/qa/transition-sheet.jpg" --from 6.8 --to 7.6 --every 0.1 --cols 4
```

Look for clipped labels, unwanted text fragments, empty regions, stale scene elements, overbright effects and repetitive layouts. Open individual final-size frames for dense text. A sheet reduces detail and can hide a small clipping error.

Sample the first and last visible frames, each scene's meaningful state, every long label and both sides of each cut. Uniform samples alone can miss a short broken scene.

## Quantify the look without confusing it with taste

```bash
uv run tools/verify/measure-look.py "$PROD/renders/proof/narrated.mp4" --samples 12 --json "$PROD/qa/look.json"
uv run tools/verify/measure-look.py "$PROD/qa/stills" --compare "$PROD/references/stills" --json "$PROD/qa/look-comparison.json"
```

The tool measures median luma, the percentage of pixels above a luma threshold, common quantized ground colours and the average colour of highly saturated pixels. Its comparison checks against a reference range with explicit tolerances.

This can catch a supposedly dark treatment becoming washed out or an accent drifting from green to cyan. It cannot tell whether a hero object reads, a composition is elegant or the narrative progresses. Group comparable light and dark scenes separately; averaging them can conceal a large mismatch. The tool rescales inputs to a fixed analysis raster, so its colour statistics are diagnostic rather than a full perceptual comparison of geometry or portrait layout.

Calibrate targets from the actual selected reference. Do not impose one film's brightness numbers on every style. A white-paper explainer and a dark lyric film should not share the same luma target.

## Audit cuts and flashes

```bash
uv run tools/verify/cut-harshness.py "$PROD/renders/proof/narrated.mp4" --top 20 --json "$PROD/qa/cuts.json"
```

The tool computes mean frame-to-frame luma changes and ranks spikes relative to the film's baseline. It helps locate hard cuts, brightness flashes and debris strobes that can feel like glitches.

A deliberate cut can correctly trigger it. A large change can be narratively appropriate. Inspect flagged timestamps with short continuous playback, and compare against the intended shot map. A mostly static film has a tiny baseline, so small changes can appear proportionally large; the tool's floor limits that effect.

Do not smooth every flag with frame blending. That can create double images or worsen a brightness jump. Fix framing, camera continuity, transition design or the flashing object that caused the problem.

## Check the colour channels after encoding

Thin saturated edges can be damaged by chroma subsampling while overall decode and luminance checks pass. Compare a review encode against the same-frame lossless source:

```bash
uv run tools/verify/channel-ssim.py "$PROD/qa/source-frames" "$PROD/renders/proof/colour-test.mp4" --json "$PROD/qa/channels.json"
```

Use exactly the same frame sequence, order, timing and dimensions. Number image files with zero padding. JPEG source frames are already lossy and cannot establish lossless fidelity. A lossless video can also serve as the source.

The tool reports per-channel SSIM and PSNR and flags channels below a minimum or lagging the best channel. It is a diagnostic for encoding damage, not a creative score. A temporal misalignment can make every channel look poor. See [chapter 9](09-encode-and-deliver.md) for master and review choices.

## Watch motion and listen

At minimum, review the encoded beginning, representative dense section, every transition family and ending. For delivery approval, watch the whole film with sound. Confirm:

- The focal subject remains clear during movement.
- Captions can be read at the expected screen size.
- No scene relies on a missed word or imaginary musical event.
- Camera motion and cuts do not create accidental jumps.
- Voice is intelligible and effects remain subordinate.
- The ending finishes its thought and does not cut off a syllable or sound tail.

If an agent has only inspected stills or run tools, say so. Do not write “watched,” “listened,” “natural voice,” or “approved” without that evidence.

## Save a reviewable receipt

Place reports beside the render's production record. Include the file hash, code revision, selected audio hash, exact command, expected frame count, tool versions, checks run, warnings explained and unresolved questions. Label the state precisely: rendered; decode verified; images inspected; listened; human accepted. The next reviewer should be able to reproduce a finding from its timestamp and file, without reading a chat history.
