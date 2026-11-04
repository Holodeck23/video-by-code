#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Per-channel R/G/B SSIM and PSNR of an encode against its lossless source.

Whole-frame checks (decode, frame count, hashes) all pass on an encode whose chroma
subsampling has smeared a saturated colour. This tool compares the encode with the source
frames channel by channel in RGB, so one channel falling behind the others shows up.
In past work, copper-on-blue material encoded as yuv420p measured SSIM R 0.693 against
G 0.977 and B 0.963; a 4:4:4 master brought R to 0.984, while a 10-bit 4:2:0 encode
stayed at 0.722, so subsampling was the cause, not bitrate.

SOURCE is a directory of numbered PNG/JPG frames (sorted by name, read at the encode's
frame rate) or a lossless video (ffv1, png, qtrle, prores 4444, x264 -qp 0 4:4:4).
Frames are paired in order; the encode is scaled to the source size if they differ.

Verdict:
  FAIL  a channel trails the best channel by more than --max-lag (default 0.05 SSIM),
        or any channel is below --min-ssim (default 0.90)
  PASS  otherwise
On a lagging channel it prints the 4:4:4 master commands to try.

Usage:
  uv run tools/verify/channel-ssim.py frames/ out.mp4 [--max-lag 0.05] [--min-ssim 0.90] [--json PATH]
  uv run tools/verify/channel-ssim.py master-ffv1.mkv review.mp4
Exit: 0 = PASS, 1 = FAIL, 2 = usage or tool error.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

VF444 = ("scale=out_color_matrix=bt709:out_range=tv,format={pix},"
         "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv")
IMG = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}


def probe(path: Path) -> dict:
    p = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height,r_frame_rate,pix_fmt,color_space", "-of", "json", str(path)],
                       capture_output=True, text=True)
    if p.returncode != 0:
        raise SystemExit(f"ffprobe failed on {path}: {p.stderr.strip()}")
    return json.loads(p.stdout)["streams"][0]


def source_args(src: Path, rate: str) -> tuple[list[str], dict]:
    src = src.resolve()
    if src.is_dir():
        exts = {x.suffix.lower() for x in src.iterdir() if x.suffix.lower() in IMG}
        if not exts:
            raise SystemExit(f"no image frames in {src}")
        ext = sorted(exts)[0]
        first = sorted(x for x in src.iterdir() if x.suffix.lower() == ext)[0]
        return ["-framerate", rate, "-pattern_type", "glob", "-i", str(src / f"*{ext}")], probe(first)
    if not src.is_file():
        raise SystemExit(f"no such source: {src}")
    return ["-i", str(src)], probe(src)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", type=Path, help="frame directory or lossless video")
    ap.add_argument("encoded", type=Path)
    ap.add_argument("--max-lag", type=float, default=0.05, help="largest SSIM gap between channels")
    ap.add_argument("--min-ssim", type=float, default=0.90, help="lowest SSIM any channel may have")
    ap.add_argument("--json", type=Path, help="report path (default <encoded-stem>.channels.json)")
    a = ap.parse_args()
    if not a.encoded.is_file():
        print(f"no such file: {a.encoded}", file=sys.stderr)
        return 2
    enc = probe(a.encoded)
    src_in, src = source_args(a.source, enc["r_frame_rate"])
    scale = ""
    if (enc["width"], enc["height"]) != (src["width"], src["height"]):
        scale = f"scale={src['width']}:{src['height']}:flags=bicubic,"
        print(f"note: encode {enc['width']}x{enc['height']} scaled to source {src['width']}x{src['height']}")
    if enc.get("color_space", "unknown") in ("unknown", None) and enc.get("pix_fmt", "").startswith("yuv"):
        print("note: encode has no colour matrix tag; decoding assumes BT.601, as many players do")
    with tempfile.TemporaryDirectory() as tmp:
        graph = (f"[0:v]{scale}format=gbrp,split[e1][e2];[1:v]format=gbrp,split[s1][s2];"
                 "[e1][s1]ssim=stats_file=ssim.log:shortest=1;[e2][s2]psnr=shortest=1")
        # ffmpeg runs inside tmp so the stats file name needs no filtergraph escaping
        cmd = ["ffmpeg", "-hide_banner", "-nostats", "-i", str(a.encoded.resolve()), *src_in,
               "-lavfi", graph, "-f", "null", "-"]
        p = subprocess.run(cmd, capture_output=True, text=True, cwd=tmp)
        log = p.stderr
        ms = re.search(r"SSIM R:([\d.]+) \(([\d.inf]+)\) G:([\d.]+) \(([\d.inf]+)\) B:([\d.]+) \(([\d.inf]+)\) All:([\d.]+)", log)
        mp = re.search(r"PSNR r:([\d.inf]+) g:([\d.inf]+) b:([\d.inf]+) average:([\d.inf]+)", log)
        if p.returncode != 0 or not ms:
            print("ffmpeg comparison failed:\n" + log[-800:], file=sys.stderr)
            return 2
        per_frame = []
        stats = Path(tmp) / "ssim.log"
        if stats.exists():
            for line in stats.read_text().splitlines():
                m = re.search(r"n:(\d+) R:([\d.]+) G:([\d.]+) B:([\d.]+)", line)
                if m:
                    per_frame.append((int(m.group(1)) - 1, *(float(x) for x in m.groups()[1:])))
    ssim = {"R": float(ms.group(1)), "G": float(ms.group(3)), "B": float(ms.group(5))}
    psnr = {c: f"{float(mp.group(i + 1)):.2f}" for i, c in enumerate("RGB")} if mp else {}
    best = max(ssim.values())
    print(f"{a.encoded.name} vs {a.source.name}: {len(per_frame)} frames compared,"
          f" encode pix_fmt {enc.get('pix_fmt')}\n")
    print(f"{'CHANNEL':8s} {'SSIM':>7s} {'GAP':>7s} {'PSNR dB':>8s} {'WORST FRAME':>12s}")
    rows = []
    for i, ch in enumerate("RGB"):
        worst = min(per_frame, key=lambda r: r[i + 1]) if per_frame else None
        gap = best - ssim[ch]
        rows.append({"channel": ch, "ssim": ssim[ch], "gap": round(gap, 4), "psnr_db": psnr.get(ch),
                     "worst_frame": worst[0] if worst else None, "worst_ssim": worst[i + 1] if worst else None})
        wtxt = f"#{worst[0]} {worst[i + 1]:.3f}" if worst else "-"
        print(f"{ch:8s} {ssim[ch]:7.4f} {gap:7.4f} {psnr.get(ch, '-'):>8s} {wtxt:>12s}")
    lagging = [r["channel"] for r in rows if r["gap"] > a.max_lag]
    low = [r["channel"] for r in rows if r["ssim"] < a.min_ssim]
    fail = bool(lagging or low)
    print()
    if lagging:
        print(f"FAIL: channel {', '.join(lagging)} trails the best channel by more than {a.max_lag} SSIM."
              " That pattern is chroma subsampling damage on saturated single-hue detail.")
        print("Try a 4:4:4 master and compare again:")
        for codec, pix, extra, name in (("libx264", "yuv444p", "", "master-444.mp4"),
                                         ("libx265", "yuv444p10le", " -tag:v hvc1", "master-444-10bit.mp4")):
            print(f"  ffmpeg -framerate 30 -i frames/%05d.png -vf {VF444.format(pix=pix)} "
                  f"-c:v {codec} -crf 16{extra} {name}")
        print("Keep a 4:2:0 copy only for platforms that need it, and check it with this tool.")
    elif low:
        print(f"FAIL: channel {', '.join(low)} below {a.min_ssim} SSIM; lower the CRF or raise the bitrate.")
    else:
        print(f"PASS: all channels >= {a.min_ssim} and within {a.max_lag} of each other")
    out = a.json or a.encoded.with_name(a.encoded.stem + ".channels.json")
    out.write_text(json.dumps({"encoded": a.encoded.name, "source": a.source.name, "frames": len(per_frame),
                               "channels": rows, "ssim_all": float(ms.group(7)),
                               "status": "FAIL" if fail else "PASS"}, indent=2))
    print(f"report: {out}")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
