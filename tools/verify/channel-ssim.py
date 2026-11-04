#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy>=1.24"]
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
Frames are paired by decode order (never by timestamp, so container time bases cannot
misalign them). Up to --samples frames spread across the film are compared (default 48).
YUV inputs are converted to RGB with their tagged matrix (BT.709 assumed for untagged HD,
BT.601 for untagged SD); the encode is scaled to the source size if they differ.
SSIM is the standard 8x8-window form computed per channel in numpy.

Verdict:
  FAIL  a channel trails the best channel by more than --max-lag (default 0.05 SSIM),
        or any channel is below --min-ssim (default 0.90)
  PASS  otherwise
On a lagging channel it prints the 4:4:4 master commands to try.

Usage:
  uv run tools/verify/channel-ssim.py frames/ out.mp4 [--max-lag 0.05] [--min-ssim 0.90] [--samples 48] [--json PATH]
  uv run tools/verify/channel-ssim.py master-ffv1.mkv review.mp4
Exit: 0 = PASS, 1 = FAIL, 2 = usage or tool error.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

VF444 = ("scale=out_color_matrix=bt709:out_range=tv,format={pix},"
         "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv")
IMG = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}
C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2


def probe(path: Path) -> dict:
    p = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries",
                        "stream=width,height,r_frame_rate,pix_fmt,color_space,color_range,nb_read_frames",
                        "-of", "json", str(path)], capture_output=True, text=True)
    if p.returncode != 0 or not json.loads(p.stdout or "{}").get("streams"):
        raise SystemExit(f"ffprobe failed on {path}: {p.stderr.strip()}")
    return json.loads(p.stdout)["streams"][0]


def to_rgb_filter(meta: dict, size: tuple[int, int] | None) -> str:
    pix = meta.get("pix_fmt", "")
    parts = []
    if pix.startswith("yuv") or pix.startswith("nv"):
        cs = meta.get("color_space") or "unknown"
        if cs in ("unknown", "reserved"):
            cs = "bt709" if int(meta.get("height", 0)) >= 720 else "bt601"
        matrix = {"bt709": "bt709", "smpte170m": "bt601", "bt470bg": "bt601", "bt601": "bt601",
                  "bt2020nc": "bt2020", "bt2020c": "bt2020"}.get(cs, "bt709")
        rng = "pc" if pix.startswith("yuvj") or meta.get("color_range") == "pc" else "tv"
        parts.append(f"scale=in_color_matrix={matrix}:in_range={rng}:out_range=pc")
    if size:
        parts.append(f"scale={size[0]}:{size[1]}:flags=bicubic")
    parts.append("format=rgb24")
    return ",".join(parts)


def frames(inputs: list[str], vf: str, w: int, h: int, keep: set[int]):
    """Yield (index, HxWx3 uint8) for decode-order indices in `keep`."""
    cmd = ["ffmpeg", "-v", "error", *inputs, "-vf", vf, "-fps_mode", "passthrough",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    n, size = 0, w * h * 3
    try:
        while True:
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            if n in keep:
                yield n, np.frombuffer(buf, np.uint8).reshape(h, w, 3)
            n += 1
    finally:
        p.stdout.close()
        p.wait()


def box(a: np.ndarray, k: int = 8) -> np.ndarray:
    c = np.cumsum(np.cumsum(np.pad(a, ((1, 0), (1, 0))), 0), 1)
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def ssim(x: np.ndarray, y: np.ndarray) -> float:
    x, y = x.astype(np.float64), y.astype(np.float64)
    mx, my = box(x), box(y)
    vx, vy, cxy = box(x * x) - mx * mx, box(y * y) - my * my, box(x * y) - mx * my
    m = ((2 * mx * my + C1) * (2 * cxy + C2)) / ((mx * mx + my * my + C1) * (vx + vy + C2))
    return float(m.mean())


def psnr(x: np.ndarray, y: np.ndarray) -> float:
    mse = float(np.mean((x.astype(np.float64) - y.astype(np.float64)) ** 2))
    return float("inf") if mse == 0 else 10 * np.log10(255 * 255 / mse)


def source_inputs(src: Path) -> tuple[list[str], dict]:
    src = src.resolve()
    if src.is_dir():
        exts = {x.suffix.lower() for x in src.iterdir() if x.suffix.lower() in IMG}
        if not exts:
            raise SystemExit(f"no image frames in {src}")
        ext = sorted(exts)[0]
        files = sorted(x for x in src.iterdir() if x.suffix.lower() == ext)
        meta = probe(files[0])
        meta["nb_read_frames"] = len(files)
        return ["-framerate", "30", "-pattern_type", "glob", "-i", str(src / f"*{ext}")], meta
    if not src.is_file():
        raise SystemExit(f"no such source: {src}")
    return ["-i", str(src)], probe(src)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", type=Path, help="frame directory or lossless video")
    ap.add_argument("encoded", type=Path)
    ap.add_argument("--max-lag", type=float, default=0.05, help="largest SSIM gap between channels")
    ap.add_argument("--min-ssim", type=float, default=0.90, help="lowest SSIM any channel may have")
    ap.add_argument("--samples", type=int, default=48, help="frames compared, spread evenly (0 = all)")
    ap.add_argument("--json", type=Path, help="report path (default <encoded-stem>.channels.json)")
    a = ap.parse_args()
    if not a.encoded.is_file():
        print(f"no such file: {a.encoded}", file=sys.stderr)
        return 2
    enc = probe(a.encoded)
    src_in, src = source_inputs(a.source)
    ns, ne = int(src.get("nb_read_frames") or 0), int(enc.get("nb_read_frames") or 0)
    count_ok = ns > 0 and ns == ne
    if not count_ok:
        print(f"FAIL: source has {ns} frames, encode has {ne}; comparing the common prefix only")
    n = min(ns, ne)
    if n == 0:
        print("no frames to compare", file=sys.stderr)
        return 2
    keep = set(range(n)) if a.samples <= 0 or a.samples >= n else {round(i * (n - 1) / (a.samples - 1)) for i in range(a.samples)}
    W, H = int(src["width"]), int(src["height"])
    resize = None if (int(enc["width"]), int(enc["height"])) == (W, H) else (W, H)
    if resize:
        print(f"note: encode {enc['width']}x{enc['height']} scaled to source {W}x{H}")
    if (enc.get("color_space") or "unknown") == "unknown" and enc.get("pix_fmt", "").startswith("yuv"):
        print("note: encode has no colour matrix tag; assumed " + ("BT.709" if int(enc["height"]) >= 720 else "BT.601"))
    per_frame = []
    sums = np.zeros(3)
    se = frames(["-i", str(a.encoded.resolve())], to_rgb_filter(enc, resize), W, H, keep)
    ss = frames(src_in, to_rgb_filter(src, None), W, H, keep)
    for (i, fe), (_, fs) in zip(se, ss):
        s = [ssim(fs[..., c], fe[..., c]) for c in range(3)]
        p = [psnr(fs[..., c], fe[..., c]) for c in range(3)]
        per_frame.append((i, *s))
        sums += np.array(p)
    if not per_frame:
        print("decode produced no comparable frames", file=sys.stderr)
        return 2
    arr = np.array([r[1:] for r in per_frame])
    ssim_ch = dict(zip("RGB", arr.mean(0)))
    psnr_ch = dict(zip("RGB", sums / len(per_frame)))
    best = max(ssim_ch.values())
    print(f"{a.encoded.name} vs {a.source.name}: {len(per_frame)} of {n} frames compared,"
          f" encode pix_fmt {enc.get('pix_fmt')}\n")
    print(f"{'CHANNEL':8s} {'SSIM':>7s} {'GAP':>7s} {'PSNR dB':>8s} {'WORST FRAME':>12s}")
    rows = []
    for i, ch in enumerate("RGB"):
        worst = min(per_frame, key=lambda r: r[i + 1])
        gap = best - ssim_ch[ch]
        pv = psnr_ch[ch]
        rows.append({"channel": ch, "ssim": round(float(ssim_ch[ch]), 4), "gap": round(float(gap), 4),
                     "psnr_db": None if pv == float("inf") else round(float(pv), 2),
                     "worst_frame": worst[0], "worst_ssim": round(float(worst[i + 1]), 4)})
        ptxt = "inf" if pv == float("inf") else f"{pv:.2f}"
        print(f"{ch:8s} {ssim_ch[ch]:7.4f} {gap:7.4f} {ptxt:>8s} {'#%d %.3f' % (worst[0], worst[i + 1]):>12s}")
    lagging = [r["channel"] for r in rows if r["gap"] > a.max_lag]
    low = [r["channel"] for r in rows if r["ssim"] < a.min_ssim]
    fail = bool(lagging or low or not count_ok)
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
    elif not count_ok:
        print("FAIL: frame counts differ; matching the common prefix does not verify the full encode")
    else:
        print(f"PASS: all channels >= {a.min_ssim} and within {a.max_lag} of each other")
    out = a.json or a.encoded.with_name(a.encoded.stem + ".channels.json")
    out.write_text(json.dumps({"encoded": a.encoded.name, "source": a.source.name, "frames_compared": len(per_frame),
                               "source_frames": ns, "encoded_frames": ne, "channels": rows,
                               "status": "FAIL" if fail else "PASS"}, indent=2))
    print(f"report: {out}")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
