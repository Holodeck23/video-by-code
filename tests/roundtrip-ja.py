#!/usr/bin/env python3
"""Real Japanese round-trip acceptance: correct speech must pass, wrong speech must fail.

Synthesises with macOS `say -v Kyoko`, transcribes with whisper-cli, and runs
tools/verify/verify-narration.py and tools/timing/align-words.py on both. Needs macOS `say`,
ffmpeg, whisper-cli with the ggml model and uv; exits 77 (skipped) when one is missing.
Usage: python3 tests/roundtrip-ja.py /absolute/scratch/folder   (generated audio stays there)
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL = Path.home() / ".cache/whisper/ggml-large-v3-turbo-q5_0.bin"
if len(sys.argv) != 2:
    raise SystemExit(__doc__)
for tool in ("say", "ffmpeg", "whisper-cli", "uv"):
    if not shutil.which(tool):
        print(f"SKIP: {tool} not available")
        raise SystemExit(77)
if not MODEL.is_file():
    print(f"SKIP: whisper model missing at {MODEL}")
    raise SystemExit(77)
out = Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=True)

SCRIPT = "今日は天気がとても良いので、公園へ散歩に行きます。"
WRONG = "昨日の夜は雨がたくさん降って、電車が止まりました。"
(out / "script.txt").write_text(SCRIPT, encoding="utf-8")
(out / "empty.txt").write_text("…。", encoding="utf-8")
for name, text in (("ok", SCRIPT), ("wrong", WRONG)):
    subprocess.run(["say", "-v", "Kyoko", "-o", str(out / f"{name}.aiff"), text], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out / f"{name}.aiff"), str(out / f"{name}.wav")], check=True)

verify = [sys.executable, str(ROOT / "tools/verify/verify-narration.py")]
align = ["uv", "run", "--python", "3.12", str(ROOT / "tools/timing/align-words.py")]
cases = [
    ("verify correct speech passes", verify + [str(out / "script.txt"), str(out / "ok.wav"), "--lang", "ja"], 0),
    ("verify wrong speech fails", verify + [str(out / "script.txt"), str(out / "wrong.wav"), "--lang", "ja"], 1),
    ("verify wrong language fails", verify + [str(out / "script.txt"), str(out / "ok.wav"), "--lang", "en"], 1),
    ("verify zero comparable tokens fails", verify + [str(out / "empty.txt"), str(out / "ok.wav"), "--lang", "ja"], 1),
    ("align correct speech passes", align + [str(out / "script.txt"), str(out / "ok.wav"), str(out / "words-ok.json"),
                                             "--lang", "ja", "--force"], 0),
    ("align wrong speech fails", align + [str(out / "script.txt"), str(out / "wrong.wav"), str(out / "words-wrong.json"),
                                          "--lang", "ja", "--force"], 1),
]
bad = 0
for label, cmd, want in cases:
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    ok = p.returncode == want
    bad += not ok
    print(("PASS " if ok else "FAIL ") + label + f" (exit {p.returncode}, wanted {want})")
    if not ok:
        print((p.stdout + p.stderr)[-1500:])
raise SystemExit(1 if bad else 0)
