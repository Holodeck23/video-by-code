#!/usr/bin/env bash
# Usage: bash verify.sh out.mp4 [expected_seconds] [expected_fps]
set -euo pipefail
f="$1"; want_s="${2:-}"; want_fps="${3:-}"
echo "== streams"; ffprobe -v error -show_entries stream=index,codec_type,codec_name,width,height,r_frame_rate,pix_fmt,nb_frames,duration -of compact=p=0 "$f"
echo "== full decode (any output below is an error)"; ffmpeg -v error -i "$f" -f null - && echo "decode ok"
if [[ -n "$want_s" && -n "$want_fps" ]]; then
  n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f")
  exp=$(python3 -c "print(round($want_s*$want_fps))"); echo "== frames: got $n, expected $exp"; [[ "$n" == "$exp" ]] || { echo "FRAME COUNT MISMATCH"; exit 1; }
fi
sheet="${f%.*}-sheet.jpg"
ffmpeg -v error -y -i "$f" -vf "fps=2,scale=480:-1,tile=4x2:padding=4" -frames:v 1 "$sheet" && echo "== contact sheet: $sheet"
