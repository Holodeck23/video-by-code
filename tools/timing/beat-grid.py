# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["numpy>=1.24", "librosa>=0.10", "soundfile>=0.12"]
# ///
"""Beat and downbeat grid for a track, optionally a fitted constant tempo.

Usage:
  uv run tools/timing/beat-grid.py AUDIO OUT.json [--constant] [--meter 4]
        [--sections cues.json] [--words words.json] [--downbeat-offset N]
        [--tempo-hint 120] [--tolerance 0.12] [--force]

Steps:
  1. librosa onset envelope + beat tracker -> detected beats.
  2. --constant: fit one BPM and phase by linear regression (beat time = phase + k * period,
     k the integer beat index). Re-index and refit twice, drop outliers (> 1/4 beat), refit.
     Reports the RMS residual in ms. Use it for machine-made or click-tracked music, which
     does not drift; do not use it for live playing that drifts.
  3. Downbeat phase: which of the --meter beat offsets is "beat 1".
     Without --sections: the offset with the highest mean onset strength (a heuristic that
     can be wrong by one or two beats, for example on tracks with strong offbeats).
     With --sections: the offset whose downbeats sit closest to the section starts. Then
     every section start must have a downbeat within --tolerance (default 120 ms), and,
     with --words, that downbeat must not fall before the last word of the line that
     precedes the section. Any violation prints the table and exits 1 (nothing written).
     --downbeat-offset N forces the offset; the assertions still run.

--sections accepts embedded-lyrics.py output ({"sections":[{"name","start"}]}), a list of
{"name","start"} objects, or a list of numbers. --words accepts a JSON object with lines [{start,end,words:[{start,end}]}].

Output: {bpm, period, phase, constant, residual_ms, meter, downbeat_offset, downbeat_rule,
beats, downbeats, detected_beats, section_check, duration, tempo_spread}.
Exit 1 on unreadable audio, too few beats, or a failed section assertion.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import ToolError, decode, guard_outputs, main_guard, need_file, read_json, sha256, write_json  # noqa: E402

SR = 22050


def fit_constant(det, np):
    """Linear regression of detected beat times on integer beat indices."""
    ibi = np.diff(det)
    period = float(np.median(ibi))
    phase = float(det[0])
    keep = np.ones(len(det), bool)
    for _ in range(3):
        k = np.round((det - phase) / period)
        slope, icpt = np.polyfit(k[keep], det[keep], 1)
        period, phase = float(slope), float(icpt)
        res = det - (phase + np.round((det - phase) / period) * period)
        keep = np.abs(res) < period / 4
        if keep.sum() < 8:
            raise ToolError("fewer than 8 beats agree with one tempo; drop --constant")
    k = np.round((det - phase) / period)
    res = det[keep] - (phase + k[keep] * period)
    return period, phase, float(np.sqrt(np.mean(res ** 2)) * 1000), int((~keep).sum())


def load_sections(path: Path) -> list[dict]:
    d = read_json(path)
    items = d.get("sections", d) if isinstance(d, dict) else d
    out = []
    for i, s in enumerate(items):
        if isinstance(s, (int, float)):
            out.append({"name": f"s{i}", "start": float(s)})
        elif isinstance(s, dict) and "start" in s:
            out.append({"name": str(s.get("name", s.get("text", f"s{i}"))), "start": float(s["start"])})
        else:
            raise ToolError(f"{path}: section {i} has no start time")
    if not out:
        raise ToolError(f"{path}: no sections found")
    return sorted(out, key=lambda s: s["start"])


def check_offset(beats, off, meter, sections, line_ends, tol, np):
    downs = beats[off::meter]
    rows, ok = [], True
    for s in sections:
        j = int(np.argmin(np.abs(downs - s["start"])))
        db = float(downs[j])
        err = db - s["start"]
        prev_end = max([e for (st, e) in line_ends if st < s["start"] - tol] or [None], key=lambda v: v or -1)
        good_t = abs(err) <= tol
        good_w = prev_end is None or db >= prev_end
        ok &= good_t and good_w
        rows.append({"name": s["name"], "start": round(s["start"], 4), "downbeat": round(db, 4),
                     "err_ms": round(err * 1000, 1), "prev_line_end": None if prev_end is None else round(prev_end, 4),
                     "ok": bool(good_t and good_w)})
    worst = max(abs(r["err_ms"]) for r in rows)
    return ok, worst, rows


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--constant", action="store_true", help="fit one BPM + phase (machine-made music)")
    ap.add_argument("--meter", type=int, default=4, help="beats per bar (default 4)")
    ap.add_argument("--sections", type=Path, help="section starts to check downbeats against")
    ap.add_argument("--words", type=Path, help="a JSON object with lines [{start,end,words:[{start,end}]}]: downbeats must follow the previous line")
    ap.add_argument("--downbeat-offset", type=int, help="force which beat offset is beat 1")
    ap.add_argument("--tempo-hint", type=float, default=120.0, help="librosa start_bpm (default 120)")
    ap.add_argument("--tolerance", type=float, default=0.12, help="section-to-downbeat tolerance, s (default 0.12)")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    if a.meter < 1:
        raise ToolError('--meter must be positive')
    if a.downbeat_offset is not None and not 0 <= a.downbeat_offset < a.meter:
        raise ToolError('--downbeat-offset must be within 0..meter-1')
    if a.tempo_hint <= 0 or a.tolerance < 0:
        raise ToolError('--tempo-hint must be positive and --tolerance nonnegative')
    import librosa
    import numpy as np

    src = need_file(a.audio, "audio")
    guard_outputs([a.out], a.force)
    y, _ = decode(src, SR)
    dur = len(y) / SR
    hop = 512
    oenv = librosa.onset.onset_strength(y=y, sr=SR, hop_length=hop)
    _, det = librosa.beat.beat_track(onset_envelope=oenv, sr=SR, hop_length=hop, units="time",
                                     start_bpm=a.tempo_hint)
    det = np.asarray(det, float)
    if len(det) < 8:
        raise ToolError(f"only {len(det)} beats detected; is this music with a pulse?")
    if a.meter > len(det):
        raise ToolError('--meter is larger than the number of detected beats')
    ibi = np.diff(det)

    out = {"file": src.name, "sha256": sha256(src), "duration": round(dur, 4), "meter": a.meter,
           "constant": a.constant, "detected_beats": [round(float(b), 4) for b in det],
           "tempo_spread": {"ibi_min": round(float(ibi.min()), 4), "ibi_median": round(float(np.median(ibi)), 4),
                            "ibi_max": round(float(ibi.max()), 4)},
           "tool": f"librosa {librosa.__version__} beat_track"}
    if a.constant:
        period, phase, resid, dropped = fit_constant(det, np)
        phase = phase % period
        beats = phase + period * np.arange(int((dur - phase) / period) + 1)
        out.update(bpm=round(60 / period, 4), period=round(period, 6), phase=round(phase, 4),
                   residual_ms=round(resid, 2), outliers_dropped=dropped)
    else:
        beats = det
        period = float(np.median(ibi))
        out.update(bpm=round(60 / period, 4), period=round(period, 6), phase=round(float(det[0]), 4),
                   residual_ms=None)

    # Onset strength at each beat, for the heuristic.
    frames = np.clip(librosa.time_to_frames(beats, sr=SR, hop_length=hop), 0, len(oenv) - 1)
    strength = oenv[frames]
    heur = [float(np.mean(strength[o::a.meter])) for o in range(a.meter)]
    sections = load_sections(a.sections) if a.sections else []
    line_ends = []
    if a.words:
        for ln in read_json(a.words).get("lines", []):
            if ln.get("words"):
                line_ends.append((float(ln["start"]), float(ln["words"][-1]["end"])))
            else:
                line_ends.append((float(ln["start"]), float(ln["end"])))

    if sections:
        trials = {o: check_offset(beats, o, a.meter, sections, line_ends, a.tolerance, np) for o in range(a.meter)}
        off = a.downbeat_offset if a.downbeat_offset is not None else min(trials, key=lambda o: trials[o][1])
        ok, worst, rows = trials[off]
        rule = "forced" if a.downbeat_offset is not None else "closest to section starts"
        print(f"downbeat offset {off} ({rule}); heuristic would pick {int(np.argmax(heur))}")
        for r in rows:
            mark = "ok  " if r["ok"] else "FAIL"
            pe = "" if r["prev_line_end"] is None else f"  prev line ends {r['prev_line_end']:.3f}"
            print(f"  {mark} {r['name']:<14} start {r['start']:8.3f}  downbeat {r['downbeat']:8.3f}  "
                  f"{r['err_ms']:+7.1f} ms{pe}")
        if not ok:
            for o, (ok2, w2, _) in trials.items():
                print(f"  offset {o}: worst {w2:.1f} ms, {'passes' if ok2 else 'fails'}")
            raise ToolError(f"section assertion failed for downbeat offset {off}: each section start needs a "
                            f"downbeat within {a.tolerance * 1000:.0f} ms that falls after the previous line's "
                            "last word. Check the section times, the grid (--constant?) or force --downbeat-offset.")
        out["section_check"] = rows
    else:
        off = a.downbeat_offset if a.downbeat_offset is not None else int(np.argmax(heur))
        rule = "forced" if a.downbeat_offset is not None else "onset-energy heuristic (unverified)"
        out["section_check"] = None
        if a.downbeat_offset is None:
            print("warning: downbeat offset chosen by onset energy only; pass --sections to verify it")
    out.update(downbeat_offset=off, downbeat_rule=rule, offset_onset_means=[round(h, 4) for h in heur],
               beats=[round(float(b), 4) for b in beats], downbeats=[round(float(b), 4) for b in beats[off::a.meter]])
    write_json(a.out, out)
    res = f", residual {out['residual_ms']:.1f} ms rms" if a.constant else ""
    print(f"{out['bpm']:.3f} BPM{res}, {len(beats)} beats, {len(out['downbeats'])} downbeats; wrote {a.out}")
    return 0


if __name__ == "__main__":
    main_guard(main)
