# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["numpy>=1.24", "librosa>=0.10", "soundfile>=0.12", "matplotlib>=3.7"]
# ///
"""Offline multi-stem audio analysis for code-driven music and instrumental videos.

Combines a track-agnostic stem analyzer with lead-pitch,
vibrato, sub-bass and kick/snare transient extractor.

Usage:
  uv run --python 3.12 tools/timing/analyze-stems.py PRODUCTION_DIR --slug SLUG
        [--title TITLE] [--stem-pitch] [--force]

Optional Beat This! neural beat tracker (falls back to librosa beat_track if not installed):
  uv run --python 3.12 --with "beat_this @ git+https://github.com/CPJKU/beat_this" \\
        tools/timing/analyze-stems.py PRODUCTION_DIR --slug SLUG --stem-pitch

Reads:
  PRODUCTION_DIR/analysis/<slug>-44k.wav (or decodes --audio if supplied)
  PRODUCTION_DIR/analysis/stems/{htdemucs_6s,htdemucs_ft}/<slug>-44k/*.wav (when present)

Writes into PRODUCTION_DIR/analysis/:
  - analysis.json      (beats, downbeats, novelty sections, edge-compensated silences, metadata)
  - features.f32       (120 Hz float32-le row-major [feature][frame] curves + monotone musical time tau)
  - structure-map.png  (visual overview of per-stem energy, onsets, sections, silences and tau - t)
  - stem-features.json (when --stem-pitch is set: 100 fps guitar f0, vibrato, kick/snare hits, bass_sub, filter_cutoff)
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import ToolError, guard_outputs, main_guard, sha256, write_json  # noqa: E402

if "-h" not in sys.argv and "--help" not in sys.argv:
    import librosa
    import numpy as np
    import soundfile as sf

RATE = 120  # control-rate samples per second
SR = 22050


def load_mono(path: Path) -> np.ndarray:
    y, sr = sf.read(path, always_2d=True)
    y = y.mean(axis=1).astype(np.float32)
    return librosa.resample(y, orig_sr=sr, target_sr=SR) if sr != SR else y


def resample_curve(x: np.ndarray, src_rate: float, n: int, dst_rate: float = RATE) -> np.ndarray:
    t_src = np.arange(len(x)) / src_rate
    t_dst = np.arange(n) / dst_rate
    return np.interp(t_dst, t_src, x).astype(np.float32)


def envelope(x: np.ndarray, attack_s: float, release_s: float, rate: float = RATE) -> np.ndarray:
    """One-pole attack/release follower (fast rise, slow fall: motion with weight)."""
    a = np.exp(-1.0 / max(1.0, attack_s * rate))
    r = np.exp(-1.0 / max(1.0, release_s * rate))
    out = np.empty_like(x, dtype=np.float32)
    acc = 0.0
    for i, v in enumerate(x):
        c = a if v > acc else r
        acc = c * acc + (1.0 - c) * float(v)
        out[i] = acc
    return out


def norm01(x: np.ndarray, lo_pct: float = 2.0, hi_pct: float = 99.5) -> np.ndarray:
    lo, hi = np.percentile(x, [lo_pct, hi_pct])
    if hi <= lo + 1e-9:
        return np.zeros_like(x, dtype=np.float32)
    return np.clip((x - lo) / (hi - lo), 0.0, 1.0).astype(np.float32)


def stem_features(y: np.ndarray, n: int) -> dict[str, np.ndarray]:
    hop = 256
    fr = SR / hop
    rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=hop)[0]
    db = librosa.amplitude_to_db(rms + 1e-9, ref=1.0)
    onset = librosa.onset.onset_strength(y=y, sr=SR, hop_length=hop)
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
    cent = librosa.feature.spectral_centroid(S=S, sr=SR)[0]
    loud = resample_curve(np.clip((db + 60.0) / 60.0, 0.0, 1.0), fr, n)  # absolute: silence stays 0
    return {
        "level": loud,
        "env": envelope(loud, 0.01, 0.25),
        "onset": norm01(resample_curve(onset, fr, n)),
        "bright": norm01(resample_curve(np.log(cent + 1.0), fr, n)),
    }


def find_stems(analysis: Path, slug: str) -> dict[str, Path]:
    stems: dict[str, Path] = {}
    for model in ("htdemucs_6s", "htdemucs_ft"):
        d = analysis / "stems" / model / f"{slug}-44k"
        if d.is_dir():
            for f in sorted(d.glob("*.wav")):
                stems.setdefault(f.stem, f)  # 6-stem names (guitar, piano) win; ft fills the rest
    return stems


def detect_beats(mix_path: Path, y: np.ndarray) -> tuple[np.ndarray, np.ndarray, str]:
    try:
        from beat_this.inference import File2Beats  # type: ignore
        import torch
        dev = "mps" if hasattr(torch.backends, "mps") and torch.backends.mps.is_available() else (
            "cuda" if torch.cuda.is_available() else "cpu"
        )
        beats, downbeats = File2Beats(checkpoint_path="final0", device=dev, dbn=False)(str(mix_path))
        return np.asarray(beats, float), np.asarray(downbeats, float), f"beat_this final0 ({dev}, no DBN)"
    except Exception:
        hop = 512
        oenv = librosa.onset.onset_strength(y=y, sr=SR, hop_length=hop)
        _, det = librosa.beat.beat_track(onset_envelope=oenv, sr=SR, hop_length=hop, units="time")
        det = np.asarray(det, float)
        frames = np.clip(librosa.time_to_frames(det, sr=SR, hop_length=hop), 0, len(oenv) - 1)
        off = int(np.argmax([float(np.mean(oenv[frames[o::4]])) for o in range(min(4, len(det)))])) if len(det) >= 4 else 0
        return det, det[off::4], f"librosa {librosa.__version__} beat_track"


def sections_from_novelty(y: np.ndarray, downbeats: np.ndarray, duration: float) -> list[dict]:
    """Checkerboard novelty on a bar-synchronous self-similarity matrix; peaks snap to downbeats."""
    if len(downbeats) < 8:
        return [{"start": 0.0, "end": round(duration, 3), "strength": 1.0}]
    hop = 512
    chroma = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=hop)
    mfcc = librosa.feature.mfcc(y=y, sr=SR, n_mfcc=20, hop_length=hop)
    rms = librosa.feature.rms(y=y, hop_length=hop)
    feats = np.vstack([
        librosa.util.normalize(chroma, axis=0),
        librosa.util.normalize(mfcc[1:], axis=1),
        rms / (rms.max() + 1e-9) * 4.0,
    ])
    bars = np.concatenate([[0.0], downbeats, [duration]])
    frames = librosa.time_to_frames(bars, sr=SR, hop_length=hop)
    sync = librosa.util.sync(feats, frames, aggregate=np.median)
    X = librosa.util.normalize(sync, axis=0)
    ssm = X.T @ X
    k = 4
    g = np.outer(np.r_[-np.ones(k), np.ones(k)], np.r_[-np.ones(k), np.ones(k)])
    novelty = np.zeros(ssm.shape[0])
    padded = np.pad(ssm, k, mode="edge")
    for i in range(ssm.shape[0]):
        novelty[i] = np.sum(padded[i:i + 2 * k, i:i + 2 * k] * g)
    novelty = np.clip(novelty, 0.0, None)
    novelty /= novelty.max() + 1e-9
    peaks = librosa.util.peak_pick(novelty, pre_max=3, post_max=3, pre_avg=4, post_avg=4, delta=0.08, wait=4)
    bounds = sorted({0.0, *[float(bars[p]) for p in peaks if 0 < p < len(bars) - 1], duration})
    return [
        {
            "start": round(a, 3),
            "end": round(b, 3),
            "strength": round(float(novelty[np.searchsorted(bars, a)] if a > 0 else 1.0), 3),
        }
        for a, b in zip(bounds, bounds[1:])
    ]


def find_silences(y: np.ndarray, floor_db: float = -45.0, min_len: float = 0.35) -> list[dict]:
    """Runs quieter than floor_db, with half-window edge compensation (1024 / SR / 2)."""
    hop = 256
    rms = librosa.feature.rms(y=y, frame_length=1024, hop_length=hop)[0]
    db = librosa.amplitude_to_db(rms + 1e-9, ref=1.0)
    edge = (1024 / SR) / 2.0
    quiet = db < floor_db
    out, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = i
        elif not q and start is not None:
            a, b = start * hop / SR - edge, i * hop / SR + edge
            if b - a >= min_len:
                out.append({"start": round(max(a, 0.0), 3), "end": round(b, 3), "dur": round(b - a, 3)})
            start = None
    if start is not None:
        a, b = start * hop / SR - edge, len(quiet) * hop / SR
        if b - a >= min_len:
            out.append({"start": round(max(a, 0.0), 3), "end": round(b, 3), "dur": round(b - a, 3)})
    return out


def extract_detailed_stem_features(mix: np.ndarray, stems: dict[str, Path], duration: float) -> dict:
    """100 fps lead pitch (pyin f0), vibrato, sub-bass envelope, kick/snare transients and filter sweep."""
    fps = 100
    n_frames = int(round(duration * fps))
    hop = int(SR / fps)
    n_fft = 2048
    freqs = librosa.fft_frequencies(sr=SR, n_fft=n_fft)

    y_g = load_mono(stems["guitar"]) if "guitar" in stems else (load_mono(stems["other"]) if "other" in stems else mix)
    y_d = load_mono(stems["drums"]) if "drums" in stems else mix
    y_b = load_mono(stems["bass"]) if "bass" in stems else mix
    y_o = load_mono(stems["other"]) if "other" in stems else mix

    def fit_len(arr: np.ndarray, mode: str = "constant") -> np.ndarray:
        arr = arr[:n_frames]
        if len(arr) < n_frames:
            arr = np.pad(arr, (0, n_frames - len(arr)), mode=mode)
        return arr

    # 1. Sub-bass (35-95 Hz)
    S_b = np.abs(librosa.stft(y_b, n_fft=n_fft, hop_length=hop))
    m_sub = (freqs >= 35) & (freqs <= 95)
    bass_sub_raw = fit_len(np.mean(S_b[m_sub, :], axis=0) if np.any(m_sub) else np.zeros(S_b.shape[1]))
    bass_sub = envelope(norm01(bass_sub_raw, 5.0, 99.0), 0.015, 0.12, fps)

    # 2. Kick and snare transients
    onset_d = fit_len(librosa.onset.onset_strength(y=y_d, sr=SR, hop_length=hop))
    y_d_low = librosa.effects.preemphasis(y_d, coef=-0.95)
    kick_onset = fit_len(librosa.onset.onset_strength(y=y_d_low, sr=SR, hop_length=hop, max_size=3))
    kick_hit = envelope(norm01(kick_onset, 60.0, 99.2), 0.005, 0.14, fps)
    snare_onset = (onset_d - kick_onset * 0.7).clip(min=0.0)
    snare_hit = envelope(norm01(snare_onset, 70.0, 99.5), 0.005, 0.12, fps)

    # 3. Filter cutoff sweep
    S_o = np.abs(librosa.stft(y_o, n_fft=n_fft, hop_length=hop))
    cent_o = fit_len(librosa.feature.spectral_centroid(S=S_o, sr=SR)[0], mode="edge")
    cent_smooth = envelope(cent_o, 0.25, 0.85, fps)
    filter_norm = np.clip((cent_smooth - 380.0) / (3400.0 - 380.0), 0.0, 1.0)

    # 4. Lead / guitar pitch and vibrato
    f0, _, _ = librosa.pyin(y_g, fmin=librosa.note_to_hz("A2"), fmax=librosa.note_to_hz("E6"),
                            sr=SR, hop_length=hop, fill_na=0.0)
    f0 = fit_len(f0)
    rms_g = fit_len(librosa.feature.rms(y=y_g, hop_length=hop)[0])
    guitar_amp = envelope(norm01(rms_g, 10.0, 98.5), 0.008, 0.15, fps)
    f0_voiced = np.where(f0 > 50.0, f0, 0.0)
    df0 = np.abs(np.diff(f0_voiced, prepend=f0_voiced[0]))
    vibrato = envelope(np.clip(df0 / 18.0, 0.0, 1.0), 0.02, 0.20, fps) * (guitar_amp > 0.15).astype(np.float32)
    f0_norm = np.where(f0 > 50.0, np.clip((f0 - 110.0) / (1318.0 - 110.0), 0.0, 1.0), 0.0)

    return {
        "fps": fps,
        "duration": round(duration, 4),
        "n_frames": n_frames,
        "guitar_amp": [round(float(v), 4) for v in guitar_amp],
        "guitar_f0": [round(float(v), 2) for v in f0],
        "guitar_f0_norm": [round(float(v), 4) for v in f0_norm],
        "guitar_vibrato": [round(float(v), 4) for v in vibrato],
        "kick_hit": [round(float(v), 4) for v in kick_hit],
        "snare_hit": [round(float(v), 4) for v in snare_hit],
        "bass_sub": [round(float(v), 4) for v in bass_sub],
        "filter_cutoff": [round(float(v), 4) for v in filter_norm],
    }


def structure_map(curves, stems, beats, downbeats, sections, silences, duration, title, out: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    order = [s for s in ("drums", "bass", "guitar", "piano", "other", "vocals") if s in stems]
    rows = ["mix", *order]
    fig, axes = plt.subplots(len(rows) + 1, 1, figsize=(22, 1.3 * (len(rows) + 1)), sharex=True)
    t = np.arange(len(curves["mix.env"])) / RATE
    colors = {"mix": "#ddd", "drums": "#ff5a36", "bass": "#8a5cff", "guitar": "#ffb000",
              "piano": "#36c5ff", "other": "#3ddc97", "vocals": "#ff4fa3"}
    for ax, name in zip(axes, rows):
        ax.fill_between(t, curves[f"{name}.env"], color=colors.get(name, "#ccc"), alpha=0.85, lw=0)
        ax.plot(t, curves[f"{name}.onset"] * 0.35, color="white", lw=0.3, alpha=0.6)
        ax.set_ylabel(name, rotation=0, ha="right", va="center", color="#ccc")
        ax.set_ylim(0, 1)
    axes[-1].plot(t, curves["tau"] - t, color="#ccc", lw=1)
    axes[-1].set_ylabel("tau - t", rotation=0, ha="right", va="center", color="#ccc")
    for ax in axes:
        ax.set_facecolor("#111")
        for d in downbeats:
            ax.axvline(d, color="#333", lw=0.4)
        for s in sections[1:]:
            ax.axvline(s["start"], color="#ff2d55", lw=1.6)
        for s in silences:
            ax.axvspan(s["start"], s["end"], color="#00e5ff", alpha=0.35, lw=0)
        ax.tick_params(colors="#999")
    for s in sections:
        axes[0].text(s["start"] + 0.5, 0.92, f"{int(s['start'] // 60)}:{s['start'] % 60:04.1f}",
                     color="#ff8099", fontsize=8, va="top")
    axes[-1].set_xticks(np.arange(0, duration, 10))
    axes[-1].set_xticklabels([f"{int(x // 60)}:{int(x % 60):02d}" for x in np.arange(0, duration, 10)])
    axes[-1].set_xlim(0, duration)
    fig.patch.set_facecolor("#0a0a0a")
    fig.suptitle(f"{title}: per-stem energy (fill), onsets (white), sections (red), "
                 f"scored silences (cyan), bars (grey)", color="#eee")
    fig.tight_layout()
    fig.savefig(out, dpi=110, facecolor=fig.get_facecolor())


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("production_dir", type=Path)
    ap.add_argument("--slug", required=True, help="Filename stem, e.g. my-song")
    ap.add_argument("--audio", type=Path, help="Optional explicit audio file if <slug>-44k.wav is not present")
    ap.add_argument("--title", default=None, help="Display title for structure-map.png")
    ap.add_argument("--stem-pitch", action="store_true",
                    help="Also write analysis/stem-features.json (100 fps guitar f0, vibrato, kick/snare, bass_sub)")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    title = args.title or args.slug
    analysis = args.production_dir.resolve() / "analysis"
    analysis.mkdir(parents=True, exist_ok=True)
    mix_path = args.audio.resolve() if args.audio else analysis / f"{args.slug}-44k.wav"
    if not mix_path.is_file():
        raise ToolError(f"missing {mix_path} (run tools/timing/separate-stems.py first or pass --audio)")

    outs = [analysis / n for n in ("analysis.json", "features.f32", "structure-map.png")]
    if args.stem_pitch:
        outs.append(analysis / "stem-features.json")
    guard_outputs(outs, args.force)

    mix = load_mono(mix_path)
    duration = len(mix) / SR
    n = int(np.ceil(duration * RATE))

    beats, downbeats, beat_tool = detect_beats(mix_path, mix)
    if len(beats) < 4:
        raise ToolError(f"only {len(beats)} beats detected in {mix_path}")
    ibi = np.diff(beats)
    bpm = float(60.0 / np.median(ibi))

    stems = find_stems(analysis, args.slug)
    curves: dict[str, np.ndarray] = {}
    for name, f in [("mix", mix_path), *stems.items()]:
        for k, v in stem_features(mix if name == "mix" else load_mono(f), n).items():
            curves[f"{name}.{k}"] = v

    # Musical time tau: advances 1/s at median energy, faster when the track is loud and busy.
    drive = 0.35 + 0.65 * curves["mix.env"] + 0.5 * curves.get("drums.onset", curves["mix.onset"])
    drive = envelope(drive.astype(np.float32), 0.05, 0.6)
    tau = np.cumsum(drive / max(float(drive.mean()), 1e-9)) / RATE
    curves["tau"] = tau.astype(np.float32)

    t = np.arange(n) / RATE
    def phase(events: np.ndarray) -> np.ndarray:
        if len(events) < 2:
            return np.zeros(n, dtype=np.float32)
        idx = np.clip(np.searchsorted(events, t, side="right") - 1, 0, len(events) - 2)
        return np.clip((t - events[idx]) / np.maximum(events[idx + 1] - events[idx], 1e-6), 0, 1).astype(np.float32)

    curves["beat.phase"] = phase(beats)
    curves["bar.phase"] = phase(downbeats)

    sections = sections_from_novelty(mix, downbeats, duration)
    silences = find_silences(mix)
    names = sorted(curves)
    np.stack([curves[k] for k in names]).astype("<f4").tofile(outs[1])

    beat_s = 60.0 / bpm
    meta = {
        "track": title,
        "slug": args.slug,
        "source": {"file": mix_path.name, "sha256": sha256(mix_path)},
        "duration": round(duration, 4),
        "bpm_median": round(bpm, 3),
        "beat_seconds": round(beat_s, 6),
        "bar_seconds": round(beat_s * 4, 6),
        "tempo_spread": {"ibi_min": round(float(ibi.min()), 4), "ibi_max": round(float(ibi.max()), 4)},
        "beats": [round(float(b), 4) for b in beats],
        "downbeats": [round(float(d), 4) for d in downbeats],
        "sections_proposed": sections,
        "silences": silences,
        "stems": {k: str(v.relative_to(analysis)) for k, v in stems.items()},
        "features": {
            "file": outs[1].name,
            "rate": RATE,
            "frames": n,
            "dtype": "float32-le",
            "layout": "[feature][frame]",
            "names": names,
        },
        "tools": {"beats": beat_tool, "features": f"librosa {librosa.__version__}"},
        "note": "Sections are machine proposals from novelty; confirm by ear before they drive the edit.",
    }
    write_json(outs[0], meta)
    structure_map(curves, stems, beats, downbeats, sections, silences, duration, title, outs[2])

    if args.stem_pitch:
        detailed = extract_detailed_stem_features(mix, stems, duration)
        write_json(analysis / "stem-features.json", detailed)

    print(json.dumps({k: meta[k] for k in ("track", "duration", "bpm_median", "tempo_spread")}),
          len(beats), "beats", len(downbeats), "bars")
    return 0


if __name__ == "__main__":
    main_guard(main)
