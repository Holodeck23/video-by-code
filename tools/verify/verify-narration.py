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
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "timing"))
from langtext import have_reader, is_cjk, lang_code, units  # noqa: E402


def norm_tokens(text: str, lang: str = "en") -> list[str]:
    """Comparable units: words for spaced languages, moras/characters for Japanese and Chinese."""
    return units(text, lang)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script", type=Path, help="Expected script (.txt or .md)")
    ap.add_argument("audio", type=Path, help="Synthesized or recorded audio (.wav, .mp4, .m4a)")
    ap.add_argument("--model", type=Path,
                    default=Path.home() / ".cache/whisper/ggml-large-v3-turbo-q5_0.bin",
                    help="Path to whisper.cpp ggml model")
    ap.add_argument("--lang", default="en",
                    help="Spoken language code (en, ja, de, ...); passed to whisper-cli and used for comparison")
    ap.add_argument("--min-run", type=int, default=None,
                    help="Minimum consecutive missing units that triggers FAIL (default 3 words; 6 moras/characters for ja/zh)")
    ap.add_argument("--json", type=Path, help="Optional path to write JSON verification report")
    a = ap.parse_args()

    if a.min_run is None:
        a.min_run = 6 if is_cjk(a.lang) else 3
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
        subprocess.run(["whisper-cli", "-m", str(a.model), "-f", str(wav), "-oj", "-of", str(base), "-np",
                        "-l", lang_code(a.lang)],
                       check=True, capture_output=True)
        trans = json.loads(base.with_suffix(".json").read_text()).get("transcription", [])
        heard = " ".join(s.get("text", "") for s in trans)

    want, got = norm_tokens(a.script.read_text(), a.lang), norm_tokens(heard, a.lang)
    if not want or not got:
        side = "script" if not want else "audio transcript"
        report = {"status": "FAIL", "language": lang_code(a.lang), "script_words": len(want),
                  "heard_words": len(got),
                  "error": f"no comparable tokens in the {side}; wrong --lang, silence or empty input"}
        if a.json:
            a.json.parent.mkdir(parents=True, exist_ok=True)
            a.json.write_text(json.dumps(report, indent=2) + "\n")
        print(f"FAIL: {report['error']} (script {len(want)}, heard {len(got)})")
        return 1
    sm = difflib.SequenceMatcher(a=want, b=got, autojunk=False)
    missing = [
        {"word_index": i1, "expected": " ".join(want[i1:i2]), "heard": " ".join(got[j1:j2])}
        for tag, i1, i2, j1, j2 in sm.get_opcodes()
        if tag in ("delete", "replace") and (i2 - i1) >= a.min_run
    ]
    ratio = round(sm.ratio(), 4)
    coverage = round(sum(b.size for b in sm.get_matching_blocks()) / len(want), 4)
    min_coverage = 0.6
    report = {
        "status": "FAIL" if missing or coverage < min_coverage else "PASS",
        "language": lang_code(a.lang),
        "kanji_read_as_kana": have_reader() if lang_code(a.lang) == "ja" else None,
        "script_words": len(want),
        "heard_words": len(got),
        "match_ratio": ratio,
        "script_coverage": coverage,
        "min_coverage": min_coverage,
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
    if coverage < min_coverage:
        print(f"  only {coverage:.0%} of the script was heard (need {min_coverage:.0%})")
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main())
