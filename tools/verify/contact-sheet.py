#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""Tile evenly spaced frames of a video into one labelled JPEG.

Each tile is labelled with its timestamp (m:ss.mmm) and frame number. Labels are drawn
with Pillow because many ffmpeg builds ship without the drawtext filter.
Frames are pulled one seek at a time (fast on long films), snapped to exact frame indices.

Usage:
  uv run tools/verify/contact-sheet.py VIDEO OUT.jpg [--n 36 | --every 5] [--cols 6]
                                       [--from 0] [--to DUR] [--tile-width 320]
  --n N       N frames spread from --from to the last frame before --to (default 36)
  --every S   one frame every S seconds instead of --n
Exit: 0 = sheet written, 1 = a frame could not be decoded, 2 = usage error.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

MAX_TILES = 400


def probe(path: Path) -> tuple[int, int, float, float, int]:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height,r_frame_rate,duration,nb_frames:format=duration",
                          "-of", "json", str(path)], capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit(f"ffprobe failed: {out.stderr.strip()}")
    j = json.loads(out.stdout)
    s = j["streams"][0]
    fps = float(Fraction(s["r_frame_rate"]))
    dur = float(s.get("duration") or j["format"]["duration"])
    nb = int(s.get("nb_frames") or round(dur * fps))
    return s["width"], s["height"], fps, dur, nb


def grab(path: Path, frame: int, fps: float, w: int, h: int) -> Image.Image | None:
    # Seek a quarter frame early: ffmpeg drops frames with pts < seek point, so frame k survives.
    t = max(0.0, (frame - 0.25) / fps)
    p = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.6f}", "-i", str(path), "-frames:v", "1",
                        "-vf", f"scale={w}:{h}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                       capture_output=True)
    if p.returncode != 0 or len(p.stdout) < w * h * 3:
        return None
    return Image.frombytes("RGB", (w, h), p.stdout[: w * h * 3])


def stamp(t: float) -> str:
    m, s = divmod(t, 60)
    return f"{int(m)}:{s:06.3f}"


def font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow < 10.1
        return ImageFont.load_default()


def pick_frames(a: argparse.Namespace, fps: float, nb: int) -> list[int]:
    first = max(0, round(a.start * fps))
    last = nb - 1 if a.to is None else min(nb - 1, round(a.to * fps) - 1)
    if last < first:
        raise SystemExit(f"empty range: frames {first}..{last}")
    if a.every:
        step = a.every * fps
        frames = [round(first + i * step) for i in range(int((last - first) / step) + 1)]
    else:
        n = max(1, a.n)
        frames = [first] if n == 1 else [round(first + i * (last - first) / (n - 1)) for i in range(n)]
    frames = sorted(set(frames))
    if len(frames) > MAX_TILES:
        raise SystemExit(f"{len(frames)} tiles requested; max {MAX_TILES}. Raise --every or narrow --from/--to.")
    return frames


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("out", type=Path)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--n", type=int, default=36)
    g.add_argument("--every", type=float)
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--from", dest="start", type=float, default=0.0)
    ap.add_argument("--to", type=float)
    ap.add_argument("--tile-width", type=int, default=320)
    a = ap.parse_args()
    if not a.video.is_file():
        print(f"no such file: {a.video}", file=sys.stderr)
        return 2
    vw, vh, fps, dur, nb = probe(a.video)
    tw = a.tile_width
    th = round(tw * vh / vw / 2) * 2
    frames = pick_frames(a, fps, nb)
    cols = max(1, min(a.cols, len(frames)))
    rows = -(-len(frames) // cols)
    pad, label_h, head_h = 4, max(16, tw // 14), 28
    f_label, f_head = font(label_h - 4), font(16)
    sheet = Image.new("RGB", (cols * (tw + pad) + pad, head_h + rows * (th + label_h + pad) + pad), (18, 18, 20))
    d = ImageDraw.Draw(sheet)
    span = f"{stamp(frames[0] / fps)} - {stamp(frames[-1] / fps)}"
    d.text((pad + 2, 6), f"{a.video.name}  {vw}x{vh}  {fps:g} fps  {dur:.3f} s  {nb} frames  |  "
                         f"{len(frames)} tiles {span}", fill=(230, 230, 230), font=f_head)
    missing = []
    for i, fr in enumerate(frames):
        x = pad + (i % cols) * (tw + pad)
        y = head_h + (i // cols) * (th + label_h + pad)
        img = grab(a.video, fr, fps, tw, th)
        if img is None:
            missing.append(fr)
            d.rectangle([x, y, x + tw - 1, y + th - 1], fill=(120, 0, 0))
        else:
            sheet.paste(img, (x, y))
        d.rectangle([x, y + th, x + tw - 1, y + th + label_h - 1], fill=(0, 0, 0))
        d.text((x + 4, y + th + 1), f"{stamp(fr / fps)}  #{fr}", fill=(255, 255, 255), font=f_label)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out, quality=88)
    print(f"{a.out}  {len(frames)} tiles, {cols}x{rows}, {sheet.width}x{sheet.height}")
    if missing:
        print(f"could not decode frames: {missing}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
