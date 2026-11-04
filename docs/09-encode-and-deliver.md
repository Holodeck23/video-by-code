# 9. Encode and deliver

Make encoding a deliberate profile, then verify the result. A “high quality” preset is not a complete delivery specification. Resolution, frame rate, colour conversion, pixel format, bitrate/quality, audio, duration and playback compatibility all matter.

## The frames are the master

Treat the rendered frame sequence as the deliverable and every video file as a lossy projection of it. Keeping the frames, or a lossless intermediate, means a quality complaint can be answered by re-encoding in minutes rather than re-rendering in hours. It also gives the per-channel check in [chapter 8](08-verification.md) a source to compare against.

The included renderer pipes frames straight into the encoder and does not retain them. Three ways to keep a source:

- **Extend your production renderer** to also write numbered PNGs (`00000.png`, `00001.png`, ...). Budget the disk: tens of gigabytes for a few minutes at 1080p60.
- **Render a lossless intermediate** for the part you need to judge, then derive every delivery file from it.
- **For a short test segment**, render stills at exact frame times and number them. This was run on the kit's narrated example for 60 frames starting at frame 210:

```bash
T=$(python3 -c "print(','.join(f'{(210+n)/30:.6f}' for n in range(60)))")
node starter/render.mjs examples/narrated-explainer.html --stills "$T" --outdir "$PROD/qa/source-frames"
python3 - "$PROD/qa/source-frames" <<'EOF'
import sys, re
from pathlib import Path
d = Path(sys.argv[1])
files = sorted(d.glob("still-*s.png"), key=lambda p: float(re.search(r"still-([\d.]+)s", p.name).group(1)))
for i, p in enumerate(files):
    p.rename(d / f"{i:05d}.png")
print(f"{len(files)} frames renamed")
EOF
```

Sort by the numeric time, not the filename: `still-10.00s.png` sorts before `still-2.00s.png` as text.

Do not upscale or convert an already damaged 4:2:0 file and call it a restored master. Once chroma detail is discarded, no later encode recovers it.

## Choose master, review and upload roles

| Artifact | Purpose | Typical choice |
|---|---|---|
| Lossless source/proof | Diagnose whether encoding changed the image | PNG sequence or lossless video for a short representative segment |
| High-fidelity master | Preserve sensitive material and saturated edges; source for every derivative | 4:4:4 H.264 or 10-bit 4:4:4 HEVC at a low CRF, or another agreed mezzanine profile |
| Upload file | What the platform receives and re-encodes | Usually the master if the destination accepts it; otherwise 4:2:0 at CRF 18 |
| Web review | Broad practical playback and manageable size for people giving notes | H.264, `yuv420p`, AAC, limited-range BT.709, CRF around 24 |

The included renderer implements the 4:2:0 web profile with H.264 CRF 18 by default (`--crf` changes it). Many delivery routes expect 4:2:0, so a 4:4:4 master and 4:2:0 review copy serve different roles. Expect some players to refuse 4:4:4 files; keep them for archive and upload, not casual viewing.

### Starting points, not rules

CRF 18 for masters and uploads and CRF 24 for review copies were useful starting points in the productions behind this kit. They are not universal settings. CRF is a quality target, not a bitrate: file size depends on content.

What sizes looked like in practice:

| Content | Settings | Size |
|---|---|---|
| 41-second 1080p pilot, strong per-pixel animated grain | CRF 18 | about 1 GB |
| Same pilot after switching to 2×2-pixel grain at lower strength | CRF 18 master / review derivative | about 399 MB / 216 MB |
| 3.1-minute 1080p60 film with grain | CRF 18, `-tune grain`, preset medium | 923.8 MB |
| 4.3-minute 1080p60 film with grain | CRF 18, `-tune grain`, preset medium | 1.2 GB |
| 34-second 1080×1920 60 fps short, DOM/CSS composition | framework "high" quality | 11.4 MB |
| 34-second 1080×1920 60 fps short, full-canvas texture | framework "high" quality | 155–235 MB |
| 12-second 1080p30 synthetic test pattern | 4:4:4 CRF 16 / 4:2:0 CRF 24 from that master / 10-bit 4:4:4 HEVC CRF 16 | 17.4 MB / 8.4 MB / 28.4 MB |

The grain and pilot figures come from different passes, not a controlled benchmark. They show the scale of the effect: per-pixel noise defeats compression. Tune grain and texture first (coarser cells, lower strength, static texture where it has no visual value), inspect the result in motion, and only then trade image quality for size. The kit's `H.grain` defaults to `cell: 2` for this reason.

## Colour conversion and metadata are separate

RGB canvas pixels need a defined conversion to YCbCr. Metadata tells a decoder how to interpret the encoded values; tags alone do not perform the conversion. Without an explicit matrix, ffmpeg's RGB-to-YUV conversion defaults to BT.601, while players assume BT.709 for HD; the result is a subtle hue and saturation shift.

The included renderers use:

```text
scale=out_color_matrix=bt709:out_range=tv,
format=yuv420p,
setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv
```

`scale` converts with the BT.709 matrix into limited ("tv") range. `format` fixes the pixel format. `setparams` stamps the frames with primaries, transfer, matrix and range so the encoder writes them into the stream. The renderers also set the matching `-color_*` output options.

### Tags that actually land

Output options alone are not enough. This was checked with ffmpeg 9.0.2, encoding the same PNG source three ways and probing the stream (`pix_fmt, color_range, color_space, color_transfer, color_primaries`):

| Method | Probed result |
|---|---|
| `-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv` only | `yuv420p, tv, bt709, unknown, unknown` |
| `scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=...` | `yuv420p, tv, bt709, bt709, bt709` |
| JPEG frames piped as MJPEG with no conversion | `yuvj444p, pc, bt470bg, unknown, unknown` |

The flags-only encode left transfer and primaries unknown. Earlier productions hit the same thing: of four finished renders probed, three were untagged, partly `unknown` or full-range `yuvj420p` (one despite passing `-color_*` flags), and only the one using `setparams` probed `bt709/bt709/bt709`. Probe the encoded stream afterward:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=pix_fmt,color_range,color_space,color_transfer,color_primaries -of default=nw=1 "$PROD/renders/master/film.mp4"
```

Look for `color_space=bt709`, `color_transfer=bt709`, `color_primaries=bt709` and `color_range=tv`, as well as the intended pixel format.

### The full-range trap

JPEG frames decode to full-range "J" formats such as `yuvj420p` or `yuvj444p`. If they reach the encoder without an explicit conversion, the output is full range with BT.601 tags. One vertical short shipped as `yuvj420p` tagged BT.709: tagged for one interpretation, encoded for another. Players that assume limited range then crush blacks and clip whites. The verifier fails `yuvj420p` outright.

Do not suppress warnings or retag a full-range signal as limited without converting the values. Convert with `scale=...:out_range=tv`. Check a dark gradient, a light ground and saturated edges in the actual player where delivery will be reviewed.

This is the kit's practical SDR profile. It is not a general HDR, wide-gamut or colour-managed grading pipeline. Imported assets with different transfer functions, WebGL tone mapping and HDR render targets require an explicit end-to-end colour decision. A final `setparams` cannot repair an earlier incorrect transform.

## Master, review and upload commands

All three commands below were run on a 12-second 1080p30 numbered PNG sequence and an 11.9-second mix, and each produced exactly 360 frames with BT.709 tags.

**4:4:4 H.264 master from frames** (profile High 4:4:4 Predictive):

```bash
ffmpeg -hide_banner -n -framerate 30 -start_number 0 -i "$PROD/frames/%05d.png" -i "$PROD/source/approved-mix.wav" \
  -filter_complex "[0:v]scale=out_color_matrix=bt709:out_range=tv,format=yuv444p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv[v];[1:a]apad=whole_dur=12,atrim=end=12,asetpts=PTS-STARTPTS[a]" \
  -map "[v]" -map "[a]" -frames:v 360 -c:v libx264 -preset slow -crf 16 \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$PROD/renders/master/film-444.mp4"
```

**10-bit 4:4:4 HEVC master** (smaller per quality on hard material; check playback support):

```bash
ffmpeg -hide_banner -n -framerate 30 -start_number 0 -i "$PROD/frames/%05d.png" -i "$PROD/source/approved-mix.wav" \
  -filter_complex "[0:v]scale=out_color_matrix=bt709:out_range=tv,format=yuv444p10le,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv[v];[1:a]apad=whole_dur=12,atrim=end=12,asetpts=PTS-STARTPTS[a]" \
  -map "[v]" -map "[a]" -frames:v 360 -c:v libx265 -crf 16 -tag:v hvc1 \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$PROD/renders/master/film-444-10bit.mp4"
```

`-tag:v hvc1` lets Apple players recognize HEVC in MP4.

**4:2:0 review copy derived from the master**:

```bash
ffmpeg -hide_banner -n -i "$PROD/renders/master/film-444.mp4" \
  -vf "scale=in_color_matrix=bt709:in_range=tv:out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv" \
  -c:v libx264 -preset medium -crf 24 -c:a copy -movflags +faststart "$PROD/renders/review/film-review.mp4"
```

State the input matrix and range explicitly when going YUV to YUV; `-c:a copy` is safe here only because the master's audio is already AAC.

**4:2:0 upload file from frames** (when the destination does not take the master):

```bash
ffmpeg -hide_banner -n -framerate 30 -start_number 0 -i "$PROD/frames/%05d.png" -i "$PROD/source/approved-mix.wav" \
  -filter_complex "[0:v]scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv[v];[1:a]apad=whole_dur=12,atrim=end=12,asetpts=PTS-STARTPTS[a]" \
  -map "[v]" -map "[a]" -frames:v 360 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$PROD/renders/master/film.mp4"
```

Change the duration and exact integer frame count together. These commands assume audio already has the intended timeline origin and mix; they do not normalize it. They explicitly fit audio instead of relying on `-shortest`. `-n` refuses to overwrite an existing file.

Verify each one. A master needs `--allow-444`:

```bash
uv run tools/verify/verify-video.py "$PROD/renders/master/film-444.mp4" --expect-seconds 12 --fps 30 --allow-444 --json "$PROD/qa/master.verify.json"
uv run tools/verify/verify-video.py "$PROD/renders/review/film-review.mp4" --expect-seconds 12 --fps 30 --width 1920 --height 1080 --json "$PROD/qa/review.verify.json"
```

### Encoder options worth knowing

- `-tune grain` keeps x264 from smoothing away film grain; use it when grain is part of the look, and expect larger files.
- `-x264-params aq-mode=3` biases bits toward dark, flat areas and helped dark-ground films avoid blocky shadows.
- `-preset slow` costs time for a smaller file at the same CRF; `veryfast` is fine for throwaway previews.
- `+faststart` moves MP4 metadata for progressive playback; it does not change visual fidelity.
- `-c:v copy` avoids another video encode when only changing an audio track or container, provided the existing stream is appropriate.

Do not infer a codec's availability from a name in this guide. Check `ffmpeg -encoders` on the target machine. Do not choose HEVC, 10-bit or a mezzanine codec merely because it sounds higher quality; use it when the content and delivery requirement justify it.

## Why chroma can fail while luma looks fine

4:2:0 stores colour at half resolution horizontally and vertically. Thin saturated red, cyan or blue details can soften or bleed while brightness detail remains sharp. A higher bitrate or 10-bit depth may not restore colour detail discarded by subsampling.

The measured case: copper detail on dark blue, H.264 4:2:0 at about 4.9 Mbit/s, compared with lossless frames. Red SSIM 0.693 against green 0.977 and blue 0.963. Re-encoded as 10-bit 4:2:0, red reached only 0.722. A 4:4:4 encode at the same file size reached 0.984. Every whole-file check had passed. Spending more bits on the wrong chroma format did not recover the detail.

Use a short saturated-edge test and [per-channel verification](08-verification.md). If a channel lags, encode a 4:4:4 candidate from the original source with the master command above, keep the matrix and range conversion consistent, compare again and test playback.

Material most at risk: saturated single-hue palettes (copper, red, magenta, cyan) on dark grounds; thin coloured lines and small coloured type; neon glows. Material least at risk: neutral greys, paper-white grounds with black ink, broad colour fields.

## Fit audio without losing the tail

Audio and video durations should agree within the chosen tolerance, usually at most a frame for this kit. AAC can add encoder delay or packet-duration rounding, so inspect stream durations and synchronization rather than assuming container duration tells the whole story.

Avoid blindly using `-shortest`: if the audio stream ends slightly early, it terminates video output before all planned frames are encoded. A test with a 12-second 30 fps picture and an 11.9-second tone: `-shortest` produced 357 frames; `apad=whole_dur=12,atrim=end=12` with `-frames:v 360` produced 360 frames and 12.000 s of audio. In a real re-encode, `-shortest` silently trimmed four frames and clipped the film's closing beat. In a multi-worker renderer, it let ffmpeg exit early, so the workers failed with `websocket closed` and the render died. Set an exact video frame count and pad/trim audio deliberately.

For a segment starting at `FROM`, both picture and sound must refer to the same source interval. The included renderer trims external audio by `--from`. For a separate mux path, explicitly trim audio to `[FROM, TO)` and reset timestamps (`atrim=start=FROM:end=TO,asetpts=PTS-STARTPTS`). Document whether any supplied audio is already segment-relative.

## Choose the audio source and codec deliberately

The extension does not tell you the codec. Some exporters write Opus audio into an `.m4a` file. Copying that stream with `-c:a copy` into an MP4 succeeds: in a test, ffmpeg exited 0 and the MP4 carried Opus. The kit's verifier then failed it (`audio codec FAIL opus ... re-encode with -c:a aac -b:a 192k, not -c:a copy`), and `audio-identity.py` warns about it when the source is first pinned. Many players and upload paths expect AAC in MP4.

```bash
ffprobe -v error -select_streams a -show_entries stream=codec_name,sample_rate,channels -of csv=p=0 "$PROD/audio/song.m4a"
```

Rules:

- Inspect the actual source codec, then encode the chosen source to AAC once for delivery.
- Mux from the selected original or the approved PCM mix, not from a browser playback derivative (for example an MP3 made so the preview could play). Each lossy generation compounds. One production muxed a derived MP3 instead of the selected original, and the logs did not record how the MP3 was made.
- Preserve the original file and the approved PCM mix separately, with hashes.
- If compatibility requires a transcode, derive it from the original and record the conversion.

## Prepare a controlled loudness master

Measure first:

```bash
ffmpeg -hide_banner -i "$PROD/source/approved-mix.wav" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null -
```

For a two-pass normalization, pass the measured integrated loudness, true peak, loudness range, threshold and target offset into a second `loudnorm` run. The following Python example performs those two steps without asking a human to copy numbers incorrectly. Run it only when this normalization is an approved production step; keep the pre-normalized mix.

```python
import json, re, subprocess
from pathlib import Path

source = Path("/absolute/production/source/approved-mix.wav")
target = source.with_name("normalized-mix.wav")
base = "loudnorm=I=-14:TP=-1.5:LRA=11"
p = subprocess.run(
    ["ffmpeg", "-hide_banner", "-i", str(source), "-af",
     base + ":print_format=json", "-f", "null", "-"],
    capture_output=True, text=True, check=True)
blocks = re.findall(r'\{\s*"input_i".*?\}', p.stderr, re.S)
if not blocks:
    raise RuntimeError("No loudnorm measurement found")
m = json.loads(blocks[-1])
if m["input_i"] == "-inf":
    raise RuntimeError("Silent source: nothing to normalize")
second = base + ":linear=true:" + ":".join([
    "measured_I=" + m["input_i"],
    "measured_TP=" + m["input_tp"],
    "measured_LRA=" + m["input_lra"],
    "measured_thresh=" + m["input_thresh"],
    "offset=" + m["target_offset"],
])
subprocess.run(["ffmpeg", "-hide_banner", "-n", "-i", str(source),
                "-af", second, "-ar", "48000", "-c:a", "pcm_s24le",
                str(target)], check=True)
```

These filter options were checked against the installed ffmpeg help. The [official filter reference](https://ffmpeg.org/ffmpeg-filters.html#loudnorm) is the canonical documentation. Linear mode may fall back to dynamic processing when its constraints cannot be satisfied; one narration master reported dynamic mode and still landed at −14.0 LUFS, −1.5 dBTP. Measure the result and listen; normalization cannot repair clipping already present in the source or restore missing words.

Working targets used in this kit (see [chapter 5](05-narration-and-captions.md) for the voice and bed levels underneath):

| Measure | Target |
|---|---|
| Integrated loudness, web master | −14 LUFS (−13 to −15 acceptable) |
| True peak | −1.5 dBTP or lower; the verifier fails above −1.0 by default |
| Loudness range, narration-led film | under about 7 LU; music-led films can be wider |

The final AAC encode can alter true peak. Re-run the verifier on the MP4, not only the WAV. Use the destination's supplied loudness specification where available; −14 LUFS is a working web-master choice in these examples, not a universal platform rule.

## Vertical deliverables

A vertical film is designed as vertical, not cropped from landscape. The kit's vertical example is a 1080×1920 canvas; the renderer reads the canvas size, so no flag changes orientation.

- Keep both dimensions even for 4:2:0.
- Reserve caption and interface regions at design time (see [chapter 5](05-narration-and-captions.md)); platform overlays cover the bottom and right edges, and their exact position varies by app and device.
- Check readability at phone size, for example a 360×640 preview, before export.
- 30 fps is enough for most graphic work; 60 fps costs twice the frames and roughly twice the render time and file size.
- Verify with the vertical dimensions: `--width 1080 --height 1920`.

## Create a smaller review copy deliberately

Derive a review file from the best available master. Choose dimensions, codec, pixel format and quality; do not repeatedly transcode review copies. Retain a clear filename relationship to the master (`film-444.mp4` and `film-review.mp4`, not `final2.mp4`) and verify decode, duration, tags and audio after the transcode.

If review colour is sensitive, compare decoded master and review frames at the same timestamps. A smaller file is useful only when it preserves the details the reviewer is judging.

## Disclosure, rights and the upload itself

- **AI-content disclosure.** Large platforms ask creators to disclose realistic altered or synthetic content. On YouTube's current policy, AI-generated music is listed as needing disclosure when the music is the main focus of the video; cloning your own voice for a voice-over is listed as exempt; a generic synthetic narration voice is not named either way. Read the platform's current disclosure page at upload time, decide, and record the decision with the release notes.
- **Music and effects rights.** Keep a proof file per track: source URL, date, licence text and a screenshot. Content-matching systems cannot read licences. A content claim is not a strike, and a correct licence usually clears it, but only if you can show the proof.
- **Upload unlisted first.** Wait for the platform's copyright and processing checks before making the video public.
- **Publication is a separate state.** A finished render or a completed upload is not evidence of a public release. Record the actual publication status and URL beside the release materials.

## Deliver a reproducible package

Include the agreed video, captions if required, an identifying thumbnail or contact sheet, and a concise receipt. The source package should include code, dependency lockfiles, configuration, scripts and enough instructions to rerun, while source media remains in its approved production storage.

Record:

```json
{
  "state": "decode verified; awaiting human acceptance",
  "video": "film.mp4",
  "videoSha256": "computed hash",
  "codeRevision": "actual commit or source snapshot identifier",
  "audioSha256": "computed selected-take or approved-mix hash",
  "range": {"from": 0, "to": 12, "fps": 30, "frames": 360},
  "profile": "H.264 yuv420p BT.709 limited / AAC",
  "master": "film-444.mp4 (H.264 yuv444p CRF 16)",
  "command": "exact command used",
  "reviews": {"framesInspected": false, "listened": false, "accepted": false}
}
```

Use actual values; do not leave example hashes in a receipt. Stream hashes for large files rather than reading multi-gigabyte files into memory (see [chapter 7](07-rendering.md)). Save unresolved warnings and the reviewer's timestamped notes beside the artifact. A durable handoff should stand on its own without the originating agent session.
