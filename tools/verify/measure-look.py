#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Put numbers on a look: brightness, hot pixels, ground colours and the accent colour.

Per frame (each frame is scaled to 480x270 first, so results compare across sizes):
  median    median Rec.709 luma, 0-255
  %>128     share of pixels whose luma is above 128
  ground    the three most common colours after quantising each channel to 16 levels
  accent    mean colour of the 400 most saturated pixels (max(rgb) - min(rgb))

Inputs may be image files, directories of images, or videos. A video gives --samples
evenly spaced frames (default 8). With --compare REF, the same numbers are measured on the
reference set and the candidate's mean is checked against the reference range:
  median   within [ref min - --tol-median, ref max + --tol-median]
  %>128    within [ref min - --tol-hot,    ref max + --tol-hot]
  accent   RGB distance to the reference mean accent <= --tol-accent
  ground   RGB distance from the top ground colour to the nearest reference ground <= --tol-ground

Usage:
  uv run tools/verify/measure-look.py FRAME.png [DIR ...] [VIDEO.mp4 ...] [--samples 8]
  uv run tools/verify/measure-look.py renders/out.mp4 --compare refs/stills/ [--json look.json]
Exit: 0 = measured (and, with --compare, inside the reference range), 1 = outside the range,
      2 = usage error or nothing decodable.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

W, H = 480, 270
IMG = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}
VID = {".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi"}


def decode(path: Path, t: float | None = None) -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error"]
    if t is not None:
        cmd += ["-ss", f"{t:.3f}"]
    cmd += ["-i", str(path), "-frames:v", "1", "-vf", f"scale={W}:{H}:flags=area",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.run(cmd, capture_output=True)
    if p.returncode != 0 or len(p.stdout) < W * H * 3:
        raise ValueError(f"could not decode {path}" + (f" at {t:.2f}s" if t is not None else ""))
    return np.frombuffer(p.stdout[: W * H * 3], np.uint8).reshape(H, W, 3)


def duration(path: Path) -> float:
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                        str(path)], capture_output=True, text=True)
    return float(p.stdout.strip() or 0)


def frames(inputs: list[Path], samples: int) -> list[tuple[str, np.ndarray]]:
    out: list[tuple[str, np.ndarray]] = []
    for p in inputs:
        if p.is_dir():
            kids = sorted(x for x in p.iterdir() if x.suffix.lower() in IMG | VID)
            out += frames(kids, samples)
        elif p.suffix.lower() in VID:
            d = duration(p)
            for i in range(samples):
                t = d * (i + 0.5) / samples
                out.append((f"{p.name}@{t:.1f}s", decode(p, t)))
        elif p.is_file():
            out.append((p.name, decode(p)))
        else:
            raise SystemExit(f"no such file: {p}")
    return out


def hexc(c) -> str:
    return "#{:02X}{:02X}{:02X}".format(*(int(round(x)) for x in c))


def measure(name: str, rgb: np.ndarray) -> dict:
    f = rgb.reshape(-1, 3).astype(np.float64)
    luma = f @ np.array([0.2126, 0.7152, 0.0722])
    q = (rgb.reshape(-1, 3) >> 4) << 4
    keys = (q[:, 0].astype(np.int32) << 16) | (q[:, 1].astype(np.int32) << 8) | q[:, 2]
    vals, counts = np.unique(keys, return_counts=True)
    top = np.argsort(counts)[::-1][:3]
    ground = [{"hex": "#{:06X}".format(int(vals[i])), "pct": round(counts[i] / len(keys) * 100, 1),
               "rgb": [int(vals[i]) >> 16, (int(vals[i]) >> 8) & 255, int(vals[i]) & 255]} for i in top]
    sat = f.max(1) - f.min(1)
    acc = f[np.argsort(sat)[::-1][:400]].mean(0)
    return {"frame": name, "median": float(np.median(luma)), "pct_gt_128": float((luma > 128).mean() * 100),
            "ground": ground, "accent": hexc(acc), "accent_rgb": [round(x, 1) for x in acc]}


def table(rows: list[dict], title: str) -> None:
    print(f"\n{title}")
    print(f"{'FRAME':28s} {'MEDIAN':>6s} {'%>128':>6s}  {'ACCENT':7s}  GROUND (top 3, quantised)")
    for r in rows:
        g = ", ".join(f"{x['hex']} {x['pct']}%" for x in r["ground"])
        print(f"{r['frame'][:28]:28s} {r['median']:6.1f} {r['pct_gt_128']:5.1f}%  {r['accent']}  {g}")


def summary(rows: list[dict]) -> dict:
    med = [r["median"] for r in rows]
    hot = [r["pct_gt_128"] for r in rows]
    acc = np.mean([r["accent_rgb"] for r in rows], 0)
    return {"n": len(rows), "median_mean": float(np.mean(med)), "median_min": min(med), "median_max": max(med),
            "hot_mean": float(np.mean(hot)), "hot_min": min(hot), "hot_max": max(hot),
            "accent_mean": hexc(acc), "accent_rgb": acc.tolist(),
            "grounds": [g["rgb"] for r in rows for g in r["ground"][:1]]}


def compare(cand: dict, ref: dict, a: argparse.Namespace) -> list[dict]:
    res = []

    def row(metric: str, got: str, want: str, ok: bool) -> None:
        res.append({"metric": metric, "candidate": got, "reference": want, "status": "PASS" if ok else "OUT"})

    lo, hi = ref["median_min"] - a.tol_median, ref["median_max"] + a.tol_median
    row("median luma", f"{cand['median_mean']:.1f}", f"{ref['median_min']:.1f}-{ref['median_max']:.1f}",
        lo <= cand["median_mean"] <= hi)
    lo, hi = ref["hot_min"] - a.tol_hot, ref["hot_max"] + a.tol_hot
    row("% luma > 128", f"{cand['hot_mean']:.1f}%", f"{ref['hot_min']:.1f}-{ref['hot_max']:.1f}%",
        lo <= cand["hot_mean"] <= hi)
    d = float(np.linalg.norm(np.array(cand["accent_rgb"]) - np.array(ref["accent_rgb"])))
    row("accent", f"{cand['accent_mean']} (d={d:.0f})", ref["accent_mean"], d <= a.tol_accent)
    cg = np.array(cand["grounds"], float)
    rg = np.array(ref["grounds"], float)
    worst = float(max(np.min(np.linalg.norm(rg - c, axis=1)) for c in cg))
    row("ground", f"{hexc(cg.mean(0))} (d={worst:.0f})", hexc(rg.mean(0)), worst <= a.tol_ground)
    return res


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="+", type=Path, help="images, directories of images, or videos")
    ap.add_argument("--compare", type=Path, help="reference image, directory or video")
    ap.add_argument("--samples", type=int, default=8, help="frames taken from each video (default 8)")
    ap.add_argument("--tol-median", type=float, default=5.0)
    ap.add_argument("--tol-hot", type=float, default=1.5, help="percentage points")
    ap.add_argument("--tol-accent", type=float, default=60.0, help="RGB distance, 0-441")
    ap.add_argument("--tol-ground", type=float, default=40.0, help="RGB distance, 0-441")
    ap.add_argument("--json", type=Path, help="write all measurements here")
    a = ap.parse_args()
    try:
        cand = [measure(n, f) for n, f in frames(a.inputs, a.samples)]
    except ValueError as e:
        print(e, file=sys.stderr)
        return 2
    if not cand:
        print("no frames found", file=sys.stderr)
        return 2
    table(cand, "CANDIDATE")
    report: dict = {"candidate": cand, "candidate_summary": summary(cand)}
    status = 0
    if a.compare:
        ref = [measure(n, f) for n, f in frames([a.compare], a.samples)]
        if not ref:
            print("no reference frames found", file=sys.stderr)
            return 2
        table(ref, "REFERENCE")
        rows = compare(report["candidate_summary"], summary(ref), a)
        print(f"\n{'METRIC':14s} {'CANDIDATE':22s} {'REFERENCE':22s} STATUS")
        for r in rows:
            print(f"{r['metric']:14s} {r['candidate']:22s} {r['reference']:22s} {r['status']}")
        n_out = sum(r["status"] == "OUT" for r in rows)
        print(f"\n{'PASS' if not n_out else 'OUT'}: {n_out} of {len(rows)} metrics outside the reference range")
        report.update(reference=ref, reference_summary=summary(ref), comparison=rows)
        status = 1 if n_out else 0
    if a.json:
        a.json.write_text(json.dumps(report, indent=2))
        print(f"report: {a.json}")
    return status


if __name__ == "__main__":
    sys.exit(main())
