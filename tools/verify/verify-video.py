#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy"]
# ///
"""Verify an encoded video file before anyone watches it.

Checks (each row is PASS, WARN, FAIL or INFO):
  dims, fps, frame count, duration     against --width/--height/--fps/--expect-seconds
  pix_fmt                              yuv420p (yuvj420p = full-range JPEG levels, FAIL)
  colour tags                          color_space, color_transfer, color_primaries = bt709
  audio codec                          aac in .mp4/.m4v/.mov (Opus or PCM in MP4 = FAIL)
  audio vs video duration              within one frame
  full decode                          ffmpeg -xerror; any decoder error = FAIL
  black / freeze intervals             blackdetect and freezedetect summaries (WARN)
  loudness                             ebur128 integrated LUFS and true peak
  audio sync (with --audio-source)     cross-correlation at 7 points, +/-100 ms lag scan,
                                       |lag| < one frame and correlation > 0.90

Decode, detectors and loudness run in one ffmpeg pass.
Writes <video-stem>.verify.json beside the video (or --json PATH).

Usage:
  uv run tools/verify/verify-video.py out.mp4 --expect-seconds 12 --fps 30 \
      --width 1920 --height 1080 [--audio-source mix.wav] [--lufs -14] [--allow-silent]
Exit: 0 = no FAIL rows, 1 = at least one FAIL, 2 = usage or tool error.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

import numpy as np

MP4_LIKE = {".mp4", ".m4v", ".mov"}
SR = 16000  # sample rate used for the sync check


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(path: Path) -> dict:
    p = run(["ffprobe", "-v", "error", "-count_packets", "-show_streams", "-show_format",
             "-of", "json", str(path)])
    if p.returncode != 0:
        raise SystemExit(f"ffprobe failed: {p.stderr.strip()}")
    return json.loads(p.stdout)


class Report:
    def __init__(self) -> None:
        self.rows: list[dict] = []

    def add(self, check: str, status: str, got: object, want: object = "", note: str = "") -> None:
        self.rows.append({"check": check, "status": status, "got": got, "want": want, "note": note})

    def failed(self) -> bool:
        return any(r["status"] == "FAIL" for r in self.rows)

    def print_table(self) -> None:
        w = max(len(r["check"]) for r in self.rows)
        print(f"{'CHECK':{w}s}  STATUS  {'GOT':28s}  WANT")
        print("-" * (w + 60))
        for r in self.rows:
            got = str(r["got"])[:28]
            line = f"{r['check']:{w}s}  {r['status']:6s}  {got:28s}  {r['want']}"
            print(line + (f"  ({r['note']})" if r["note"] else ""))


def frac(s: str) -> Fraction:
    try:
        return Fraction(s)
    except (ValueError, ZeroDivisionError):
        return Fraction(0)


def check_streams(rep: Report, info: dict, a: argparse.Namespace, suffix: str) -> tuple[dict, dict | None, float]:
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    au = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    if v is None:
        rep.add("video stream", "FAIL", "none", "1 video stream")
        return {}, au, 30.0
    w, h = v.get("width"), v.get("height")
    if a.width and a.height:
        rep.add("dimensions", "PASS" if (w, h) == (a.width, a.height) else "FAIL", f"{w}x{h}", f"{a.width}x{a.height}")
    else:
        rep.add("dimensions", "INFO", f"{w}x{h}")
    rfr, afr = frac(v.get("r_frame_rate", "0/1")), frac(v.get("avg_frame_rate", "0/1"))
    fps = float(rfr) or 30.0
    if a.fps:
        ok = abs(float(rfr) - a.fps) < 1e-3 and abs(float(afr) - a.fps) < 1e-3
        rep.add("fps", "PASS" if ok else "FAIL", f"r={v.get('r_frame_rate')} avg={v.get('avg_frame_rate')}", a.fps,
                "" if ok else "variable or wrong frame rate")
        fps = a.fps
    else:
        rep.add("fps", "PASS" if rfr == afr else "WARN", f"r={v.get('r_frame_rate')} avg={v.get('avg_frame_rate')}",
                "r == avg", "" if rfr == afr else "variable frame rate")
    n = int(v.get("nb_read_packets") or v.get("nb_frames") or 0)
    vdur = float(v.get("duration") or info["format"].get("duration") or 0)
    if a.expect_seconds:
        want_n = round(a.expect_seconds * fps)
        rep.add("frame count", "PASS" if n == want_n else "FAIL", n, want_n,
                "" if n == want_n else f"{n - want_n:+d} frames; check -shortest and the renderer's -frames:v")
        ok = abs(vdur - a.expect_seconds) <= 0.5 / fps
        rep.add("video duration", "PASS" if ok else "FAIL", f"{vdur:.3f} s", f"{a.expect_seconds:.3f} s +/- half frame")
    else:
        rep.add("frame count", "INFO", n)
        rep.add("video duration", "INFO", f"{vdur:.3f} s")
    pf = v.get("pix_fmt")
    pf_ok = pf == "yuv420p" or (a.allow_444 and pf in {"yuv444p", "yuv444p10le", "yuv420p10le"})
    note = ""
    if pf and pf.startswith("yuvj"):
        note = "full-range JPEG levels; encode with -pix_fmt yuv420p"
    rep.add("pix_fmt", "PASS" if pf_ok else "FAIL", pf, "yuv420p", note)
    tags = {k: v.get(k, "unknown") for k in ("color_space", "color_transfer", "color_primaries")}
    tag_ok = all(x == "bt709" for x in tags.values())
    rep.add("colour tags", "PASS" if tag_ok else "FAIL", "/".join(tags.values()), "bt709/bt709/bt709",
            "" if tag_ok else "add -vf setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv")
    rng = v.get("color_range", "unknown")
    rep.add("colour range", "PASS" if rng == "tv" else "FAIL", rng, "tv")
    if au is None:
        rep.add("audio stream", "PASS" if a.allow_silent else "FAIL", "none", "1 audio stream",
                "--allow-silent given" if a.allow_silent else "pass --allow-silent for a silent film")
    else:
        codec = au.get("codec_name")
        if suffix in MP4_LIKE:
            rep.add("audio codec", "PASS" if codec == "aac" else "FAIL", codec, "aac",
                    "" if codec == "aac" else "re-encode with -c:a aac -b:a 192k, not -c:a copy")
        else:
            rep.add("audio codec", "INFO", codec)
        adur = float(au.get("duration") or 0)
        diff = abs(adur - vdur)
        rep.add("audio vs video", "PASS" if diff <= 1.0 / fps + 1e-6 else "FAIL", f"{adur:.3f} vs {vdur:.3f} s",
                f"<= {1000 / fps:.1f} ms apart", f"{diff * 1000:.1f} ms")
    return v, au, fps


def parse_intervals(log: str, key: str) -> list[tuple[float, float]]:
    if key == "black":
        return [(float(s), float(e)) for s, e in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", log)]
    starts = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", log)]
    return [(s, ends[i] if i < len(ends) else float("nan")) for i, s in enumerate(starts)]


def analyse_pass(rep: Report, path: Path, has_audio: bool, a: argparse.Namespace, vdur: float) -> dict:
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-loglevel", "level+info", "-xerror", "-i", str(path),
           "-map", "0:v:0", "-vf", f"blackdetect=d={a.black_min}:pix_th=0.10,freezedetect=n=0.001:d={a.freeze_min}"]
    if has_audio:
        cmd += ["-map", "0:a:0", "-af", "ebur128=peak=true:framelog=quiet"]
    cmd += ["-f", "null", "-"]
    p = run(cmd)
    log = p.stderr
    errors = [ln for ln in log.splitlines() if "[error]" in ln or "[fatal]" in ln]
    ok = p.returncode == 0 and not errors
    rep.add("full decode", "PASS" if ok else "FAIL", "clean" if ok else f"{len(errors)} error lines", "no errors",
            "" if ok else (errors[0][:80] if errors else f"exit {p.returncode}"))
    out: dict = {"decode_errors": errors[:20]}
    for key, label in (("black", "black intervals"), ("freeze", "frozen intervals")):
        iv = parse_intervals(log, key)
        out[key] = iv
        total = sum(e - s for s, e in iv if e == e)
        txt = ", ".join(f"{s:.2f}-{e:.2f}" for s, e in iv[:4]) + (" ..." if len(iv) > 4 else "")
        rep.add(label, "WARN" if iv else "PASS", f"{len(iv)} ({total:.2f} s)", "none", txt)
    if has_audio:
        mi = re.search(r"Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+|-inf) LUFS", log)
        mp = re.search(r"True peak:\s*\n\s*Peak:\s*(-?[\d.]+|-inf) dBFS", log)
        lufs = float(mi.group(1)) if mi else None
        tp = float(mp.group(1)) if mp else None
        out["integrated_lufs"], out["true_peak_dbtp"] = lufs, tp
        if lufs is None:
            rep.add("loudness", "FAIL", "unmeasured", "")
        elif a.lufs is not None:
            st = "PASS" if abs(lufs - a.lufs) <= a.lufs_tol else "FAIL"
            rep.add("loudness", st, f"{lufs:.1f} LUFS", f"{a.lufs:.1f} +/- {a.lufs_tol}")
        else:
            st = "PASS" if -15.0 <= lufs <= -13.0 else "WARN"
            rep.add("loudness", st, f"{lufs:.1f} LUFS", "-14 +/- 1 (web upload)", "pass --lufs to gate")
        if tp is not None:
            st = "PASS" if tp <= a.tp_max else "FAIL"
            rep.add("true peak", st, f"{tp:.1f} dBTP", f"<= {a.tp_max:.1f}", "" if st == "PASS" else "clips after lossy encode")
    return out


def pcm(path: Path) -> np.ndarray:
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a:0", "-ac", "1", "-ar", str(SR),
                        "-f", "f32le", "-"], capture_output=True)
    if p.returncode != 0:
        raise SystemExit(f"could not decode audio from {path}: {p.stderr.decode()[:200]}")
    return np.frombuffer(p.stdout, np.float32).astype(np.float64)


def best_lag(ref: np.ndarray, seg: np.ndarray, max_lag: int) -> tuple[int, float]:
    """seg = encoded[center-max_lag : center+n+max_lag]; returns (lag samples, normalised correlation)."""
    n = len(ref)
    size = 1 << int(np.ceil(np.log2(len(seg) + n)))
    corr = np.fft.irfft(np.fft.rfft(seg, size) * np.conj(np.fft.rfft(ref, size)), size)[: len(seg) - n + 1]
    csum = np.concatenate([[0.0], np.cumsum(seg * seg)])
    energy = np.sqrt(np.maximum(csum[n:] - csum[:-n], 1e-20)) * max(np.linalg.norm(ref), 1e-10)
    norm = corr / energy
    i = int(np.argmax(norm))
    return i - max_lag, float(norm[i])


def sync_check(rep: Report, video: Path, source: Path, fps: float) -> list[dict]:
    src, enc = pcm(source), pcm(video)
    dur = min(len(src), len(enc)) / SR
    n, max_lag = int(0.4 * SR), int(0.1 * SR)
    usable = dur - 0.4 - 0.2
    if usable <= 0:
        rep.add("audio sync", "FAIL", f"{dur:.2f} s audio", ">= 0.6 s", "too short to correlate")
        return []
    points = [0.1 + usable * (i + 0.5) / 7 for i in range(7)]
    res, worst = [], 0.0
    for t in points:
        c = int(t * SR)
        ref = src[c:c + n]
        lo = max(0, c - max_lag)
        seg = enc[lo:c + n + max_lag]
        if np.linalg.norm(ref) < 1e-4:
            res.append({"time": round(t, 3), "lag_ms": None, "corr": None, "note": "silent in source"})
            continue
        lag, cr = best_lag(ref, seg, c - lo)
        lag_ms = lag * 1000 / SR
        res.append({"time": round(t, 3), "lag_ms": round(lag_ms, 2), "corr": round(cr, 4)})
        worst = max(worst, abs(lag_ms))
    measured = [r for r in res if r["corr"] is not None]
    if not measured:
        rep.add("audio sync", "WARN", "source silent", "", "nothing to correlate")
        return res
    frame_ms = 1000 / fps
    low = min(r["corr"] for r in measured)
    ok = worst < frame_ms and low > 0.90
    rep.add("audio sync", "PASS" if ok else "FAIL", f"lag<={worst:.1f} ms corr>={low:.3f}",
            f"< {frame_ms:.1f} ms, corr > 0.90", ", ".join(f"{r['time']:.1f}s:{r['lag_ms']}ms" for r in measured[:7]))
    return res


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("--expect-seconds", type=float)
    ap.add_argument("--fps", type=float)
    ap.add_argument("--width", type=int)
    ap.add_argument("--height", type=int)
    ap.add_argument("--audio-source", type=Path, help="the WAV that was muxed; enables the sync check")
    ap.add_argument("--lufs", type=float, help="gate integrated loudness at this target (default: warn outside -15..-13)")
    ap.add_argument("--lufs-tol", type=float, default=1.0)
    ap.add_argument("--tp-max", type=float, default=-1.0, help="true peak ceiling in dBTP (default -1.0)")
    ap.add_argument("--black-min", type=float, default=0.1, help="shortest black interval reported (s)")
    ap.add_argument("--freeze-min", type=float, default=0.5, help="shortest frozen interval reported (s)")
    ap.add_argument("--allow-silent", action="store_true", help="a missing audio stream is not a failure")
    ap.add_argument("--allow-444", action="store_true", help="accept yuv444p / 10-bit masters")
    ap.add_argument("--json", type=Path, help="report path (default <video-stem>.verify.json)")
    a = ap.parse_args()
    if not a.video.is_file():
        print(f"no such file: {a.video}", file=sys.stderr)
        return 2
    rep = Report()
    info = probe(a.video)
    v, au, fps = check_streams(rep, info, a, a.video.suffix.lower())
    vdur = float(v.get("duration") or info["format"].get("duration") or 0) if v else 0.0
    extra = analyse_pass(rep, a.video, au is not None, a, vdur) if v else {}
    sync: list[dict] = []
    if a.audio_source:
        if au is None:
            rep.add("audio sync", "FAIL", "no audio stream", "")
        else:
            sync = sync_check(rep, a.video, a.audio_source, fps)
    rep.print_table()
    status = "FAIL" if rep.failed() else "PASS"
    print(f"\n{status}: {sum(r['status'] == 'FAIL' for r in rep.rows)} fail, "
          f"{sum(r['status'] == 'WARN' for r in rep.rows)} warn, {len(rep.rows)} checks")
    out = a.json or a.video.with_name(a.video.stem + ".verify.json")
    out.write_text(json.dumps({"video": a.video.name, "status": status, "checks": rep.rows,
                               "analysis": extra, "audio_sync": sync}, indent=2))
    print(f"report: {out}")
    return 1 if rep.failed() else 0


if __name__ == "__main__":
    sys.exit(main())
