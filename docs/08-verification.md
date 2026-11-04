# 8. Verify the encoded film

A render is not verified because the command finished. Verify the actual delivery file, then inspect and listen to it. Keep machine findings, human review and creative acceptance as separate states.

Every check in this chapter answers one narrow question. A pass on one says nothing about the others. The skill is choosing the check that matches the claim you want to make, running it on the file you will deliver, and writing down exactly what it proved.

## The gate ladder

Run the gates in order. Each one is cheaper than the next, and a failure early saves the cost of everything after it.

| Gate | Question | Tool or method | A pass does not prove |
|---|---|---|---|
| 1. Identity | Is this the approved audio, script and code revision? | Hashes, render intent, `audio-identity.py` | That the approved inputs are good |
| 2. Runtime | Does the page load, seek and draw reliably? | Browser errors, readiness, `determinism.mjs` | That frames look right |
| 3. Container | Size, fps, codecs, pixel format, colour tags, durations? | `verify-video.py`, `ffprobe` | That every frame decodes |
| 4. Decode | Can the whole file be decoded without error? | `ffmpeg -xerror -f null` | Anything visual |
| 5. Coverage | Exactly the intended number of pictures, first and last present? | `-count_frames`, boundary stills | Continuity between them |
| 6. Timing | Audio aligned with the encoded picture; cues on the right words? | Cross-correlation, word-time review | That captions highlight the right syllable |
| 7. Image | Type, layout, colour and look correct? | Contact sheets, stills, `measure-look.py` | Motion quality or taste |
| 8. Cuts and motion | No unintended slams, flashes, strobing or camera jumps? | `cut-harshness.py`, three-frame strobe check, motion probes | Editorial rightness of a cut |
| 9. Encode damage | Did compression smear colour edges? | `channel-ssim.py` against lossless source | Anything about the source itself |
| 10. Watched and listened | Does it play well at speed, with sound, at destination size? | A person watching the encoded file | Acceptance by the owner |
| 11. Accepted | Does the person responsible accept this version? | A recorded, named verdict | Acceptance of any other version |

Record which gates ran. Skipped gates are written as skipped, not omitted.

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

The tool checks dimensions and frame rates when expected values are provided; frame count and duration; pixel format; BT.709 tags and limited range; audio codec and duration; full decode; black and frozen intervals; loudness and true peak. Decode, detectors and loudness run in one ffmpeg pass. It writes a JSON report (default `<video-stem>.verify.json` beside the video) and prints PASS/WARN/FAIL/INFO rows. The vertical example produced:

```text
CHECK             STATUS  GOT                           WANT
dimensions        PASS    1080x1920                     1080x1920
fps               PASS    r=30/1 avg=30/1               30.0
frame count       PASS    360                           360
video duration    PASS    12.000 s                      12.000 s +/- half frame
pix_fmt           PASS    yuv420p                       yuv420p
colour tags       PASS    bt709/bt709/bt709             bt709/bt709/bt709
colour range      PASS    tv                            tv
audio codec       PASS    aac                           aac
audio vs video    PASS    12.000 vs 12.000 s            <= 33.3 ms apart  (0.0 ms)
full decode       PASS    clean                         no errors
black intervals   PASS    0 (0.00 s)                    none
frozen intervals  PASS    0 (0.00 s)                    none
loudness          WARN    -31.5 LUFS                    -14 +/- 1 (web upload)  (pass --lufs to gate)
true peak         PASS    -12.6 dBTP                    <= -1.0

PASS: 0 fail, 1 warn, 14 checks
```

The overall line says PASS while the loudness row warns: an effects-only sketch is far quieter than a web master. That is exactly the kind of warning that disappears when someone reports "all checks passed".

What fails, and why each rule exists:

| Row | FAIL condition | Why |
|---|---|---|
| `pix_fmt` | anything but `yuv420p` (unless `--allow-444`); `yuvj420p` always fails | `yuvj420p` is full-range JPEG levels; players that assume limited range show crushed blacks and clipped whites |
| colour tags | `color_space`, `color_transfer` or `color_primaries` not `bt709` | Untagged HD is guessed differently by different players |
| audio codec | not AAC in `.mp4`/`.m4v`/`.mov`; Opus or PCM in MP4 fails | Copying an `.m4a`'s audio stream can silently put Opus into an MP4; many players and platforms then misbehave |
| audio vs video | streams differ by more than one frame | A short audio stream is the signature of `-shortest` or bad fitting |
| full decode | any decoder error | A truncated or corrupt stream can still have plausible metadata |

For a deliberately silent film, pass `--allow-silent`. To require a specific integrated loudness, pass `--lufs -14 --lufs-tol 1`. Without `--lufs`, values outside −15 to −13 LUFS warn rather than fail. The default true-peak maximum is −1 dBTP (`--tp-max`); change it only to match an agreed specification. For a deliberate 4:4:4 or supported 10-bit master, use `--allow-444` and record why it differs from the web-review profile. `--black-min` and `--freeze-min` set the shortest black or frozen interval reported, in seconds.

The verifier returns zero when no FAIL rows exist, 1 with any FAIL and 2 on a usage or tool error. WARN rows still require explanation. A designed still hold may trigger frozen-frame detection; a black pause may be intentional. Conversely, a subtle unwanted hold may not meet a detector's threshold. Review the intervals rather than simply raising the threshold until the report turns green.

For a quick shell-only check without Python, `bash starter/verify.sh FILE.mp4 12 30 audio` runs a full decode, checks BT.709 tags and limited range, requires `round(seconds × fps)` decoded frames and an AAC track within one frame of the video.

## Count pictures and decode all of them

For 36 seconds at 30 fps, require 1,080 output pictures; for 12 seconds, require 360; for a 260-second film at 60 fps, 15,600. For arbitrary frame rates and intervals, use the same rounding policy as the renderer and a frame-aligned duration. Avoid ambiguities at half-frame boundaries between languages: JavaScript `Math.round` and Python `round` disagree at exact halves, and one pipeline used `ceil(duration × fps)` instead. State the rule in the receipt.

For an explicit decoded frame count:

```bash
ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames,r_frame_rate,avg_frame_rate,duration -of json "$PROD/renders/proof/narrated.mp4"
```

For an independent full decode:

```bash
ffmpeg -hide_banner -v error -xerror -i "$PROD/renders/proof/narrated.mp4" -f null -
```

Some container fields count packets or report stored metadata. A full decode adds important evidence, but still does not establish visual correctness. Check that the final intended frame is present, especially after changing audio fitting or removing `-shortest`: render a still at the last frame time and compare it with the last decoded frame.

Small duration differences between streams are normal. One 260-second 60 fps film probed 260.000 s of video against 260.013 s of audio: frame rounding, within one frame. A difference larger than one frame (16.7 ms at 60 fps, 33.3 ms at 30 fps) needs an explanation.

## Black and frozen intervals

The verifier summarizes these. To see every interval yourself:

```bash
ffmpeg -hide_banner -nostats -i "$PROD/renders/proof/narrated.mp4" \
  -vf "blackdetect=d=0.1:pix_th=0.10,freezedetect=n=0.003:d=0.5" -an -f null - 2>&1 | grep -E "black_|freeze_"
```

`blackdetect` reports `black_start`, `black_end` and `black_duration` for runs of near-black frames at least `d` seconds long. `freezedetect` reports `freeze_start`, `freeze_duration` and `freeze_end` when frames stay within noise tolerance `n` for at least `d` seconds. Compare each interval with the shot map: an intended title hold is fine; a frozen frame in the middle of a camera move is a capture or seek bug.

Do not combine `showinfo` or detector logging with `-v error`. These filters log at `info` level, so `-v error` suppresses all their output, and an empty result reads as "no black frames" or "no cuts". Use `-nostats` and filter the output instead.

## Check audio synchronization correctly

The verifier's `--audio-source` option compares the encoded audio with a reference PCM track at seven points, scanning lags of approximately ±100 ms. It expects correlation above 0.90 and absolute lag below one output frame.

Use the actual timeline-zero mix that was sent to the encoder:

```bash
uv run tools/verify/verify-video.py "$PROD/renders/master/film.mp4" --expect-seconds 36 --fps 30 --audio-source "$PROD/source/approved-mix.wav" --json "$PROD/qa/master.verify.json"
```

Why several points: a single correlation at the start proves only that the start lines up. Drift (a sample-rate mismatch, a dropped audio packet, an accumulated rounding error) shows up as a lag that grows across the film. Seven points spread over the duration catch both an offset and a drift. On one 55-second narrated film the seven-point check (at 1, 9, 17, 25, 34, 43 and 51 s) measured lag 0.0 ms and correlation about 0.9999 at every point.

Do not compare a voice-only track with a loud effects/music mix and infer an export defect from the lower correlation. Do not compare a 7.2–14.4 second segment with an untrimmed reference; prepare an identically trimmed reference first. Normalization, denoising or dynamics processing can also affect comparison.

Silence has nothing to correlate. Repetitive clicks can produce ambiguous lags. Seven checkpoints are a useful screen, not proof of every sample. Review visual word timing independently: a perfectly synchronized mix can still drive incorrectly authored captions. If sync was checked against word times rather than by ear, say so.

## Inspect representative frames

Make a whole-film contact sheet:

```bash
uv run tools/verify/contact-sheet.py "$PROD/renders/proof/narrated.mp4" "$PROD/qa/narrated-sheet.jpg" --n 24 --cols 6
```

For a dense sequence, sample more frequently in a short interval:

```bash
uv run tools/verify/contact-sheet.py "$PROD/renders/proof/narrated.mp4" "$PROD/qa/transition-sheet.jpg" --from 6.8 --to 7.6 --every 0.1 --cols 4
```

Each tile is labelled with its timestamp (`m:ss.mmm`) and frame number, so a note can cite an exact frame. The default is 36 tiles, which works well as a whole-film board for films of a few minutes. `--tile-width` sets tile size (default 320 px).

Look for clipped labels, unwanted text fragments, empty regions, stale scene elements, overbright effects and repetitive layouts. Open individual final-size frames for dense text. A sheet reduces detail and can hide a small clipping error.

Sample the first and last visible frames, each scene's meaningful state, every long label and both sides of each cut. Uniform samples alone can miss a short broken scene. For cuts, the multi-worker renderer's `--cuts` mode renders four frames around every boundary: 0.1 s before, one frame before, one frame after and 0.1 s after. That set shows whether the outgoing shot finished, whether the incoming shot starts clean and whether anything leaks across.

Do not count cuts with a scene-change score. On a dark-ground film with sub-plates switching every 2–4 seconds, `select='gt(scene,0.15)'` found only 19 changes in 305 seconds, because the near-black ground barely changes across cuts. Treat a scene-detect count as a floor, and judge pace from a 1 fps contact sheet of a 30–60 second excerpt.

## Quantify the look without confusing it with taste

```bash
uv run tools/verify/measure-look.py "$PROD/renders/proof/narrated.mp4" --samples 12 --json "$PROD/qa/look.json"
uv run tools/verify/measure-look.py "$PROD/qa/stills" --compare "$PROD/references/stills" --json "$PROD/qa/look-comparison.json"
```

The tool scales each frame to 480×270, then measures median Rec.709 luma (0–255), the percentage of pixels with luma above 128, the three most common colours after quantizing each channel to 16 levels, and the mean colour of the 400 most saturated pixels. With `--compare`, the candidate's mean must fall inside the reference range widened by `--tol-median`, `--tol-hot`, and within RGB distance `--tol-accent` and `--tol-ground`. Exit 0 means inside the range, 1 outside, 2 a usage error.

This can catch a supposedly dark treatment becoming washed out or an accent drifting from green to cyan. A worked example: a dark reference film's chorus frames measured median 18–24 with 1.8–4.6% of pixels above 128 and a blue-dominant ground. A draft frame that "felt wrong" measured median 34 with 14.3% above 128 and a green-dominant ground: roughly twice as bright, with three to eight times the hot pixels. The numbers turned "it doesn't look right" into a specific fix (background shader mixes in linear RGB were lifting the blacks). Light paper-ground scenes in the same productions measured median 229–235, which is why one luma target cannot serve both.

It cannot tell whether a hero object reads, a composition is elegant or the narrative progresses. Group comparable light and dark scenes separately; averaging them can conceal a large mismatch. The tool rescales inputs to a fixed analysis raster, so its colour statistics are diagnostic rather than a full perceptual comparison of geometry or portrait layout.

Calibrate targets from the actual selected reference, sampled from about 15 frames across it. Do not impose one film's brightness numbers on every style. A white-paper explainer and a dark lyric film should not share the same luma target. State both numbers side by side in the review note: reference range and candidate value.

## Audit cuts and flashes

```bash
uv run tools/verify/cut-harshness.py "$PROD/renders/proof/narrated.mp4" --top 20 --json "$PROD/qa/cuts.json"
```

The tool decodes the film once as small greyscale frames (192×108, Rec.709 luma), computes the mean absolute luma difference between each frame and the previous one (0–255), takes the film's mean as the baseline, and ranks every local spike by its ratio to the baseline. Spikes above `--ratio` (default 10×) are flagged with timestamps and the signed change in mean brightness, so a white flash (large positive, then large negative) reads differently from a cut between two scenes of equal brightness. `--floor` (default 0.5 luma levels) is the lowest baseline used, so a mostly static film does not turn every small movement into a huge ratio. Exit 0 means no spike above the ratio, 1 at least one flagged.

The kit's 12-second vertical example measured a film mean of 0.25, so the floor of 0.50 applied, and its largest spike was 3.0×: no flags.

Why the ratio and not the absolute number: what a viewer feels as a slam depends on how calm the rest of the film is. One five-minute film had a smooth baseline of 1.8 and 34 hard cuts that measured 29 to 90, sixteen to fifty times the baseline, each alternating an extreme warm close-up with a wide shot on near-black. A cut tens of times the baseline is a brightness slam. It can be legitimate editorially, but it must be a choice someone made, not a number nobody looked at.

The same check is available directly in ffmpeg if you want the raw series:

```bash
ffmpeg -hide_banner -nostats -i film.mp4 \
  -vf "format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=luma-diff.txt" \
  -f null -
```

Each `YAVG` value in `luma-diff.txt` is the mean luma difference for one frame pair.

### Cluster viewer reports before fixing anything

Reports that arrive as a list of timestamps usually collapse into two or three mechanical classes. In one review, seven "glitch" timestamps were four hard cuts and three strobing debris passages. The reported cuts were not even the worst ones by measurement; one was the mildest of all 34. Classify each report by measurement, confirm the classes predict the remaining reports, and fix the class rather than the individual timestamps.

### Repairing a slam

Where the slam is unintended, a three-to-four-frame cross-dissolve removes it without changing content or the edit's rhythm. If you keep frames, this is a re-encode, not a re-render. Do not smooth every flag with frame blending (`tmix` or similar): averaging unrelated shots creates double images, and on one film it made the worst cut worse, raising its delta from 90 to 120. Fix framing, camera continuity, transition design or the flashing object that caused the problem.

A deliberate cut can correctly trigger the tool. A large change can be narratively appropriate. Inspect flagged timestamps with short continuous playback, and compare against the intended shot map.

## Check for strobing: three consecutive frames

Fast small objects without motion blur strobe at 24–30 fps. Contact sheets cannot show it, because each tile is a single moment. Take three consecutive frames from the densest motion region, crop and magnify them side by side:

```bash
ffmpeg -hide_banner -v error -ss 6.0 -i "$PROD/renders/proof/film.mp4" \
  -vf "select='lt(n,3)',crop=360:360:360:780,scale=720:720:flags=neighbor,tile=3x1:padding=8" \
  -frames:v 1 "$PROD/qa/strobe-6.0s.png"
```

Adjust the crop (`width:height:x:y`) to the region. Smooth motion shows small displacements with softened leading edges. Strobing shows large displacements with perfectly crisp edges. If an object's motion was listed as "not blurred" in a code review, this is the check that tells you whether that limitation is visible.

## Check camera continuity at boundaries

A camera that jumps between two very similar framings reads as a glitch, even when every other test passes. In one pilot, camera position, aim point and lens changed at about 4.57 seconds between near-identical framings; seek determinism and a regular 24 fps timestamp check both passed, because neither looks at transitions.

- Compare camera states immediately before and after every boundary. Flag near-matching views with an abrupt change in position, focus or framing for review.
- Render paired boundary frames and a contiguous motion probe across each risky transition before the full render. A whole-film board proves coverage, not transition quality.
- Check the frame before and after each worker or chunk seam as well.
- Keep a regression case built from the actual failed poses, so the check demonstrably catches the known mistake.

The verifier must not repeat the implementation's mistake. A camera audit that calls the same analytic function as the scene code will agree with it perfectly while the rendered camera is wrong. Audit what was actually rendered or baked: in one case the faulty baked path deviated by about 5.4 metres from the intended one, and only an audit that read the baked keys found it.

## Check the colour channels after encoding

Thin saturated edges can be damaged by chroma subsampling while overall decode and luminance checks pass. Compare a review encode against the same-frame lossless source:

```bash
uv run tools/verify/channel-ssim.py "$PROD/qa/source-frames" "$PROD/renders/proof/colour-test.mp4" --json "$PROD/qa/channels.json"
```

The worked case behind this tool: a copper-on-dark-blue film encoded as H.264 `yuv420p` at about 4.9 Mbit/s. Against the surviving lossless frames, SSIM was red 0.693, green 0.977, blue 0.963. Most of that film's fine detail lived in red chroma, and 4:2:0 subsampling keeps chroma at half resolution in each direction. Every other check passed: full decode, frame count, duration, hashes. Re-encoding as 10-bit 4:2:0 moved red only to 0.722; a 4:4:4 encode at the same file size moved it to 0.984. The cause was subsampling, not bitrate or bit depth.

The tool fails when a channel trails the best channel by more than `--max-lag` (default 0.05 SSIM) or any channel falls below `--min-ssim` (default 0.90), and prints 4:4:4 master commands to try. Exit 0 is PASS, 1 FAIL, 2 a usage or tool error.

Use exactly the same frame sequence, order, timing and dimensions. The most reliable source is a directory of numbered PNG frames with zero-padded names. JPEG source frames are already lossy and cannot establish lossless fidelity. A lossless video can also serve as the source, but check that its frames pair with the encode: a container with a millisecond time base can drift against a 30 fps encode and pair frames incorrectly.

Calibrate the comparison before trusting it. Encode the same source losslessly (for example `libx264rgb -qp 0`) and run the tool on that pair; every channel should score at or near 1.0. If the lossless pair scores poorly, the comparison is wrong (pairing, matrix or tool), not the encode. A temporal misalignment can make every channel look poor. See [chapter 9](09-encode-and-deliver.md) for master and review choices.

Do not predict artefacts without testing for them. In the same film, banding was expected in the dark regions from 8-bit encoding at a low bitrate. Amplifying the shadows showed those regions were true black with no gradient, so there was nothing to band.

## Watch motion and listen

At minimum, review the encoded beginning, representative dense section, every transition family and ending. For delivery approval, watch the whole film with sound. Confirm:

- The focal subject remains clear during movement.
- Captions can be read at the expected screen size.
- No scene relies on a missed word or imaginary musical event.
- Camera motion and cuts do not create accidental jumps.
- Voice is intelligible and effects remain subordinate.
- The ending finishes its thought and does not cut off a syllable or sound tail.

Watch playback when rendering is not competing for the GPU; a stutter during a concurrent render is not evidence about the file. If a preview is assembled from partial excerpts, label it discontinuous and do not judge pacing from it: one rushed preview kept only seven frames of a shot before jumping ahead, which looked like a defect in the film.

If an agent has only inspected stills or run tools, say so. Do not write “watched,” “listened,” “natural voice,” or “approved” without that evidence.

## Check review claims before fixing them

Automated and AI reviewers make confident, specific, wrong claims. In one review a model reported a word as clipped when the frame showed a write-on animation mid-stroke, reported a phantom onset sound, and described a test as using a file version it did not use. Another reviewer's script carried hardcoded shot descriptions that contradicted the actual frames. Reopen the specified encoded file at the specified timestamp and confirm the defect exists before changing anything. Record the claim, the check and the result.

## Never claim a state not reached

Use precise state words. Each needs its own evidence, and a later state does not follow from an earlier one.

| State | Evidence required |
|---|---|
| Built | The page loads and draws without errors |
| Browser checks passed | Determinism test and design stills reviewed |
| Exported | The encoder exited 0 and the file exists at the recorded path |
| Decode verified | Full decode clean, frame count and durations match |
| Frames inspected | Named stills, sheets and boundary frames were looked at |
| Watched with sound | A person played the encoded file at speed with audio |
| Accepted | The responsible person gave a verdict on this exact version |

"All checks passed" is not a state. It hides which checks ran and which warnings were explained. A liked pilot does not accept a later full export or another direction. Technical verification, an agent's opinion of the look, and human acceptance are three separate records.

When a command produced no output, confirm it ran before reporting an empty finding. On macOS there is no `timeout` command by default: a scan prefixed with `timeout 60` exits 127 with nothing on stdout, and if stderr is hidden that reads as "nothing found". Check exit codes, and prefer tools that print a positive result line (`PASS: ...`) over silence.

## Save a reviewable receipt

Place reports beside the render's production record. Include the file hash, code revision, selected audio hash, exact command, expected frame count, tool versions, checks run, warnings explained and unresolved questions. Label the state precisely: rendered; decode verified; images inspected; listened; human accepted. The next reviewer should be able to reproduce a finding from its timestamp and file, without reading a chat history.

```json
{
  "file": "renders/master/film.mp4",
  "sha256": "computed with a streaming hash",
  "source": "commit or snapshot id actually rendered",
  "audioSha256": "hash of the muxed mix",
  "command": "exact render command",
  "gpu": "string printed by the renderer",
  "expectedFrames": 1080,
  "checks": {
    "verify-video": {"result": "PASS", "warnings": ["loudness -15.2 LUFS: accepted, matches destination spec"]},
    "cut-harshness": {"result": "1 flagged", "disposition": "0:21.400 intended cut to title card"},
    "channel-ssim": "skipped: no saturated thin-edge material",
    "watchedWithSound": false
  },
  "state": "decode verified; frames inspected; not yet watched with sound",
  "open": ["caption at 0:18 holds 1.6 s, under its 1.7 s floor"]
}
```
