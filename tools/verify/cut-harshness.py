#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Find the frame changes a viewer feels as a slam: hard cuts and brightness flashes.

Decodes the video once as small greyscale frames (192x108, Rec.709 luma) and computes, for
every frame, the mean absolute luma difference to the previous frame (0-255). The film
mean of that series is the baseline. Every local spike is ranked by its ratio to the
baseline; spikes above --ratio (default 10x) are flagged with timestamps. The signed change
in mean frame brightness is shown beside each spike, so a white flash (large positive then
large negative) reads differently from a cut between two scenes of equal brightness.

In past films a smooth baseline sat near 1.8 and the cuts viewers reported as glitches sat
at 29 to 90, i.e. 16x to 50x the baseline.

Usage:
  uv run tools/verify/cut-harshness.py VIDEO [--ratio 10] [--top 15] [--floor 0.5]
                                       [--from S --to S] [--json PATH]
  --floor   lowest baseline used, so a mostly static film does not turn every
            small movement into a huge ratio (default 0.5 luma levels)
Exit: 0 = no spike above --ratio, 1 = at least one flagged, 2 = usage or decode error.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

import numpy as np

W, H = 192, 108


def fps_of(path: Path) -> float:
    p = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=r_frame_rate", "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    if p.returncode != 0 or not p.stdout.strip():
        raise SystemExit(f"ffprobe failed on {path}: {p.stderr.strip()}")
    return float(Fraction(p.stdout.strip().split(",")[0]))


def luma_series(path: Path, start: float, end: float | None) -> tuple[np.ndarray, np.ndarray]:
    """Returns (diff[i] = mean |Y_i - Y_{i-1}|, mean luma per frame). diff[0] = 0."""
    cmd = ["ffmpeg", "-v", "error"]
    if start:
        cmd += ["-ss", f"{start:.3f}"]
    cmd += ["-i", str(path)]
    if end is not None:
        cmd += ["-t", f"{end - start:.3f}"]
    cmd += ["-vf", f"scale={W}:{H}:flags=area","-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    size = W * H * 3
    weights = np.array([0.2126, 0.7152, 0.0722], np.float32)
    diffs, means, prev = [], [], None
    assert proc.stdout is not None
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        y = np.frombuffer(buf, np.uint8).reshape(-1, 3).astype(np.float32) @ weights
        means.append(float(y.mean()))
        diffs.append(0.0 if prev is None else float(np.abs(y - prev).mean()))
        prev = y
    err = proc.stderr.read().decode() if proc.stderr else ""
    if proc.wait() != 0 or not means:
        raise SystemExit(f"decode failed: {err.strip()[:300]}")
    return np.array(diffs), np.array(means)


def stamp(t: float) -> str:
    m, s = divmod(t, 60)
    return f"{int(m)}:{s:06.3f}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("--ratio", type=float, default=10.0, help="flag spikes above this multiple of the mean")
    ap.add_argument("--top", type=int, default=15, help="spikes listed (default 15)")
    ap.add_argument("--floor", type=float, default=0.5, help="minimum baseline in luma levels")
    ap.add_argument("--from", dest="start", type=float, default=0.0)
    ap.add_argument("--to", type=float)
    ap.add_argument("--json", type=Path, help="report path (default <video-stem>.cuts.json)")
    a = ap.parse_args()
    if not a.video.is_file():
        print(f"no such file: {a.video}", file=sys.stderr)
        return 2
    fps = fps_of(a.video)
    diff, mean = luma_series(a.video, a.start, a.to)
    n = len(diff)
    film_mean = float(diff[1:].mean()) if n > 1 else 0.0
    base = max(film_mean, a.floor)
    # local maxima: a 1-frame flash makes two spikes (in and out); both are listed
    peaks = [i for i in range(1, n) if diff[i] >= (diff[i - 1] if i > 1 else 0)
             and (i == n - 1 or diff[i] > diff[i + 1]) and diff[i] / base >= 2.0]
    peaks.sort(key=lambda i: diff[i], reverse=True)
    rows = []
    for i in peaks:
        t = a.start + i / fps
        r = diff[i] / base
        rows.append({"frame": int(round(a.start * fps)) + i, "time": round(t, 3), "luma_diff": round(float(diff[i]), 2),
                     "ratio": round(float(r), 1), "brightness_change": round(float(mean[i] - mean[i - 1]), 1),
                     "flag": bool(r > a.ratio)})
    flagged = [r for r in rows if r["flag"]]
    print(f"{a.video.name}: {n} frames at {fps:g} fps, film mean luma diff {film_mean:.2f}"
          f" (baseline {base:.2f}), median {float(np.median(diff[1:])) if n > 1 else 0:.2f}")
    print(f"\n{'RANK':>4s}  {'TIME':>9s}  {'FRAME':>6s}  {'DIFF':>6s}  {'RATIO':>6s}  {'dBRIGHT':>7s}  FLAG")
    for k, r in enumerate(rows[: a.top], 1):
        flag = "SLAM" if r["flag"] else ""
        print(f"{k:4d}  {stamp(r['time']):>9s}  {r['frame']:6d}  {r['luma_diff']:6.1f}  {r['ratio']:5.1f}x"
              f"  {r['brightness_change']:+7.1f}  {flag}")
    if not rows:
        print("  (no spike above 2x the mean)")
    if flagged:
        print(f"\nFAIL: {len(flagged)} spike(s) above {a.ratio:g}x the mean: "
              + ", ".join(f"{stamp(r['time'])} ({r['ratio']}x)" for r in flagged[:10]))
        print("Soften with a 2 to 4 frame ease on brightness, a cut on a beat, or a darker incoming frame.")
    else:
        print(f"\nPASS: no spike above {a.ratio:g}x the mean")
    out = a.json or a.video.with_name(a.video.stem + ".cuts.json")
    out.write_text(json.dumps({"video": a.video.name, "fps": fps, "frames": n, "film_mean": film_mean,
                               "baseline": base, "ratio_threshold": a.ratio, "spikes": rows,
                               "per_frame_diff": [round(float(x), 3) for x in diff]}, indent=1))
    print(f"report: {out}")
    return 1 if flagged else 0


if __name__ == "__main__":
    sys.exit(main())
