# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["demucs>=4.0", "torch>=2.0", "numpy>=1.24", "soundfile>=0.12"]
# ///
"""Normalise a source audio file to 44.1 kHz stereo WAV and separate stems with Demucs.

Usage:
  uv run --python 3.12 tools/timing/separate-stems.py SOURCE_AUDIO PRODUCTION_DIR
        [--slug SLUG] [--models htdemucs_6s,htdemucs_ft] [--device mps|cuda|cpu] [--force]

Writes into PRODUCTION_DIR:
  - audio-identity.json  (SHA-256 of original source and normalised 44.1k WAV)
  - audio-probe.json     (ffprobe format + stream metadata of original source)
  - analysis/<slug>-44k.wav
  - analysis/stems/<model>/<slug>-44k/{drums,bass,other,vocals[,guitar,piano]}.wav

Idempotent: existing WAV and stem folders are preserved unless --force is passed.
Never modifies or uploads the source audio.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import ToolError, ffprobe, main_guard, need, need_file, run, sha256, write_json  # noqa: E402


def default_device() -> str:
    try:
        import torch
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
        if torch.cuda.is_available():
            return "cuda"
    except Exception:
        pass
    return "cpu"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", type=Path, help="Original audio file (.m4a, .mp3, .wav, .flac)")
    ap.add_argument("production", type=Path, help="Durable production directory outside the repo")
    ap.add_argument("--slug", help="Filename stem (default: derived from source filename)")
    ap.add_argument("--models", default="htdemucs_6s,htdemucs_ft",
                    help="Comma-separated Demucs models (default: htdemucs_6s,htdemucs_ft)")
    ap.add_argument("--device", default=None, help="Torch device: mps, cuda, or cpu (default: auto)")
    ap.add_argument("--force", action="store_true", help="Re-create WAV and stems even if present")
    a = ap.parse_args()

    need("ffmpeg", "ffprobe")
    src = need_file(a.source, "source audio")
    prod = a.production.resolve()
    slug = a.slug or re.sub(r"-selected$", "", src.stem)
    analysis = prod / "analysis"
    stems_dir = analysis / "stems"
    stems_dir.mkdir(parents=True, exist_ok=True)

    wav = analysis / f"{slug}-44k.wav"
    if wav.is_file() and not a.force:
        print(f"exists, keeping: {wav}")
    else:
        run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
             "-i", str(src), "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", str(wav)])
        print(f"wrote {wav}")

    ident = prod / "audio-identity.json"
    if not ident.is_file() or a.force:
        write_json(ident, {
            "source": src.name,
            "source_sha256": sha256(src),
            "mix_wav": wav.name,
            "mix_sha256": sha256(wav),
        })
        print(f"wrote {ident}")

    probe_path = prod / "audio-probe.json"
    if not probe_path.is_file() or a.force:
        write_json(probe_path, ffprobe(src))
        print(f"wrote {probe_path}")

    device = a.device or default_device()
    models = [m.strip() for m in a.models.split(",") if m.strip()]
    for model in models:
        target = stems_dir / model / f"{slug}-44k"
        if target.is_dir() and any(target.glob("*.wav")) and not a.force:
            print(f"stems exist, keeping: {target}")
            continue
        print(f"separating with {model} on {device} ...")
        cmd = [sys.executable, "-m", "demucs", "-n", model, "-d", device, "-o", str(stems_dir), str(wav)]
        res = subprocess.run(cmd)
        if res.returncode != 0:
            print(f"warning: {model} exited with {res.returncode}; continuing", file=sys.stderr)

    print(f"ready. Next: uv run --python 3.12 tools/timing/analyze-stems.py \"{prod}\" --slug {slug}")
    return 0


if __name__ == "__main__":
    main_guard(main)
