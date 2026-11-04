#!/usr/bin/env bash
# Usage: bash verify.sh out.mp4 [expected_seconds] [expected_fps] [audio]
# Checks: full decode, exact frame count, BT.709 colour tags, and (if present, or if "audio" is passed)
# an AAC audio track whose length is within one frame of the video.
set -euo pipefail
f="$1"; want_s="${2:-}"; want_fps="${3:-}"; want_audio="${4:-}"
fail() { echo "FAIL: $*"; exit 1; }

echo "== streams"; ffprobe -v error -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,pix_fmt,nb_frames,duration -of compact=p=0 "$f"
echo "== full decode (any output below is an error)"; ffmpeg -v error -xerror -i "$f" -f null - && echo "decode ok"

echo "== colour tags"
tags=$(ffprobe -v error -select_streams v:0 -show_entries stream=color_space,color_transfer,color_primaries,color_range -of default=nw=1 "$f")
echo "$tags"
for k in color_space color_transfer color_primaries; do
  grep -qx "$k=bt709" <<<"$tags" || fail "$k is not bt709"
done
grep -qx "color_range=tv" <<<"$tags" || fail "color_range is not tv (limited)"

if [[ -n "$want_s" && -n "$want_fps" ]]; then
  n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f")
  exp=$(python3 -c "import math; print(math.floor($want_s*$want_fps+0.5))"); echo "== frames: got $n, expected $exp"
  [[ "$n" == "$exp" ]] || fail "frame count mismatch"
fi

acodec=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "$f")
if [[ -z "$acodec" ]]; then
  [[ -z "$want_audio" ]] || fail "no audio stream"
  echo "== audio: none"
else
  [[ "$acodec" == "aac" ]] || fail "audio codec is $acodec, expected aac"
  vd=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration -of csv=p=0 "$f")
  ad=$(ffprobe -v error -select_streams a:0 -show_entries stream=duration -of csv=p=0 "$f")
  fr=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$f")
  echo "== audio: $acodec, ${ad}s vs video ${vd}s"
  python3 -c "
v, a = float('$vd'), float('$ad'); n, d = map(float, '$fr'.split('/'))
frame = d / n
print(f'   difference {abs(a - v) * 1000:.1f} ms, one frame is {frame * 1000:.1f} ms')
raise SystemExit(0 if abs(a - v) <= frame else 1)" || fail "audio length differs from video by more than one frame"
fi

sheet="${f%.*}-sheet.jpg"
ffmpeg -v error -y -i "$f" -vf "fps=2,scale=480:-1,tile=4x2:padding=4" -frames:v 1 "$sheet" && echo "== contact sheet: $sheet"
echo "ALL CHECKS PASSED"
