# 9. Encode and deliver

Make encoding a deliberate profile, then verify the result. A “high quality” preset is not a complete delivery specification. Resolution, frame rate, colour conversion, pixel format, bitrate/quality, audio, duration and playback compatibility all matter.

## Choose master and review roles

| Artifact | Purpose | Typical choice |
|---|---|---|
| Lossless source/proof | Diagnose whether encoding changed the image | PNG sequence or lossless video for a short representative segment |
| High-fidelity master | Preserve sensitive material and saturated edges | Deliberate 4:4:4 or other agreed mezzanine profile |
| Web review/delivery | Broad practical playback and manageable size | H.264, `yuv420p`, AAC, limited-range BT.709 |

The included renderer implements the web-review profile with H.264 CRF 18 by default. It captures a single frame sample at each output timestamp and pipes PNGs; it does not retain a lossless image sequence. To investigate chroma problems, add a small source-frame capture to your production or use another engine that retains those frames. Do not upscale or convert an already damaged 4:2:0 file and call it a restored master.

## Colour conversion and metadata are separate

RGB canvas pixels need a defined conversion to YCbCr. Metadata tells a decoder how to interpret the encoded values; tags alone do not perform the conversion.

The included renderer uses:

```text
scale=out_color_matrix=bt709:out_range=tv,
format=yuv420p,
setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv
```

It also sets corresponding output metadata. Probe the encoded stream afterward. Look for `color_space=bt709`, `color_transfer=bt709`, `color_primaries=bt709` and `color_range=tv`, as well as the intended pixel format.

This is the kit's practical SDR profile. It is not a general HDR, wide-gamut or colour-managed grading pipeline. Imported assets with different transfer functions, WebGL tone mapping and HDR render targets require an explicit end-to-end colour decision. A final `setparams` cannot repair an earlier incorrect transform.

Full-range JPEG-style formats such as `yuvj420p` need conscious handling. Do not suppress warnings or retag a full-range signal as limited without converting the values. Check a dark gradient, a light ground and saturated edges in the actual player where delivery will be reviewed.

## H.264 review from an image sequence

For a production that has exact numbered PNG frames beginning at `00000.png` and a timeline-zero approved mix, this is a starting profile for a 12-second, 30 fps clip:

```bash
ffmpeg -hide_banner -y -framerate 30 -start_number 0 -i "$PROD/frames/%05d.png" -i "$PROD/source/approved-mix.wav" -filter_complex "[0:v]scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv[v];[1:a]apad=whole_dur=12,atrim=end=12,asetpts=PTS-STARTPTS[a]" -map "[v]" -map "[a]" -frames:v 360 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$PROD/renders/master/film.mp4"
```

Change the duration and exact integer frame count together. This command assumes audio already has the intended timeline origin and mix; it does not normalize it. It explicitly fits audio instead of relying on `-shortest`.

CRF is a quality-control setting, not a fixed bitrate. Lower values generally cost more bytes; content complexity also matters. Fine grain, noisy materials and rapid full-frame changes can dramatically increase file size. Adjust design noise or texture first when it has no visual value.

`+faststart` moves MP4 metadata for progressive playback; it does not change visual fidelity. `-c:v copy` avoids another video encode when only changing an audio track or container, provided the existing stream is appropriate.

## Why chroma can fail while luma looks fine

4:2:0 reduces colour resolution. Thin saturated red, cyan or blue details can soften or bleed while brightness detail remains sharp. A higher bitrate or 10-bit depth may not restore colour detail discarded by subsampling.

Use a short saturated-edge test and [per-channel verification](08-verification.md). If needed, encode a 4:4:4 candidate from the original source, for example with `libx264 -pix_fmt yuv444p` and a deliberate quality setting. Keep the matrix/range conversion consistent. Then compare and test playback; many delivery routes expect 4:2:0, so a 4:4:4 master and 4:2:0 review can serve different roles.

Do not infer a codec's availability from a name in this guide. Check `ffmpeg -encoders` on the target machine. Do not choose HEVC, 10-bit or a mezzanine codec merely because it sounds higher quality; use it when the content and delivery requirement justify it.

## Fit audio without losing the tail

Audio and video durations should agree within the chosen tolerance, usually at most a frame for this kit. AAC can add encoder delay or packet-duration rounding, so inspect stream durations and synchronization rather than assuming container duration tells the whole story.

Avoid blindly using `-shortest`: if the audio stream ends slightly early, it can terminate video output before all planned frames are encoded. Set an exact video frame count and pad/trim audio deliberately.

If an `.m4a` carries Opus, do not blindly copy its audio stream into the final MP4. The kit's review profile uses AAC. Inspect the actual source codec and encode the chosen source once for delivery. Preserve the original file and the approved PCM mix separately.

For a segment starting at `FROM`, both picture and sound must refer to the same source interval. The included renderer trims external audio by `--from`. For a separate mux path, explicitly trim audio to `[FROM, TO)` and reset timestamps. Document whether any supplied audio is already segment-relative.

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

These filter options were checked against the installed ffmpeg help. The [official filter reference](https://ffmpeg.org/ffmpeg-filters.html#loudnorm) is the canonical documentation. Linear mode may fall back to dynamic processing when its constraints cannot be satisfied. Measure the result and listen; normalization cannot repair clipping already present in the source or restore missing words.

The final AAC encode can alter true peak. Re-run the verifier on the MP4, not only the WAV. Use the destination's supplied loudness specification where available; -14 LUFS is a working web-master choice in these examples, not a universal platform rule.

## Create a smaller review copy deliberately

Derive a review file from the best available master. Choose dimensions, codec, pixel format and quality; do not repeatedly transcode review copies. Retain a clear filename relationship to the master and verify decode, duration, tags and audio after the transcode.

If review colour is sensitive, compare decoded master and review frames at the same timestamps. A smaller file is useful only when it preserves the details the reviewer is judging.

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
  "command": "exact command used",
  "reviews": {"framesInspected": false, "listened": false, "accepted": false}
}
```

Use actual values; do not leave example hashes in a receipt. Stream hashes for large files rather than reading multi-gigabyte files into memory. Save unresolved warnings and the reviewer's timestamped notes beside the artifact. A durable handoff should stand on its own without the originating agent session.
