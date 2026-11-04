# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Verify narrated audio against its script using local whisper-cli round-trip transcription.

Reports any run of --min-run (default 3) consecutive script words missing from the audio
(catches TTS clause drops, truncated endings, and mangled numbers) and exits 1 on failure.

Usage:
  uv run tools/verify/verify-narration.py SCRIPT.txt AUDIO.wav
        [--model ~/.cache/whisper/ggml-large-v3-turbo-q5_0.bin] [--min-run 3] [--json out.json]
"""
from __future__ import annotations

import argparse
import difflib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def norm_tokens(text: str) -> list[str]:
    return [w for w in re.sub(r"[^a-z0-9' ]", " ", text.lower().replace("’", "'")).split() if w]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script", type=Path, help="Expected script (.txt or .md)")
    ap.add_argument("audio", type=Path, help="Synthesized or recorded audio (.wav, .mp4, .m4a)")
    ap.add_argument("--model", type=Path,
                    default=Path.home() / ".cache/whisper/ggml-large-v3-turbo-q5_0.bin",
                    help="Path to whisper.cpp ggml model")
    ap.add_argument("--min-run", type=int, default=3,
                    help="Minimum consecutive missing words that triggers FAIL (default 3)")
    ap.add_argument("--json", type=Path, help="Optional path to write JSON verification report")
    a = ap.parse_args()

    if not a.script.is_file() or not a.audio.is_file():
        print("script and audio must be existing files", file=sys.stderr)
        return 2
    if not shutil.which("whisper-cli"):
        print("whisper-cli not found on PATH (brew install whisper-cpp)", file=sys.stderr)
        return 2
    if not a.model.is_file():
        print(f"whisper model not found: {a.model}", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory() as d:
        wav = Path(d) / "input.wav"
        subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                        "-i", str(a.audio), "-ar", "16000", "-ac", "1", str(wav)], check=True)
        base = Path(d) / "t"
        subprocess.run(["whisper-cli", "-m", str(a.model), "-f", str(wav), "-oj", "-of", str(base), "-np"],
                       check=True, capture_output=True)
        trans = json.loads(base.with_suffix(".json").read_text()).get("transcription", [])
        heard = " ".join(s.get("text", "") for s in trans)

    want, got = norm_tokens(a.script.read_text()), norm_tokens(heard)
    sm = difflib.SequenceMatcher(a=want, b=got, autojunk=False)
    missing = [
        {"word_index": i1, "expected": " ".join(want[i1:i2]), "heard": " ".join(got[j1:j2])}
        for tag, i1, i2, j1, j2 in sm.get_opcodes()
        if tag in ("delete", "replace") and (i2 - i1) >= a.min_run
    ]
    ratio = round(sm.ratio(), 4)
    report = {
        "status": "FAIL" if missing else "PASS",
        "script_words": len(want),
        "heard_words": len(got),
        "match_ratio": ratio,
        "min_run": a.min_run,
        "missing_runs": missing,
    }
    if a.json:
        a.json.parent.mkdir(parents=True, exist_ok=True)
        a.json.write_text(json.dumps(report, indent=2) + "\n")

    print(f"{report['status']}: script {len(want)} words, heard {len(got)}, match {ratio:.3f}")
    for m in missing:
        heard_note = f"  (heard: {m['heard']})" if m["heard"] else ""
        print(f"  missing at word {m['word_index']}: {m['expected']}{heard_note}")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
