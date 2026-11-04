# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["kokoro-onnx>=0.4", "numpy>=1.24", "soundfile>=0.12"]
# ///
"""Local Kokoro ONNX narration synthesizer for plain-text scripts or structured beat plans.

Unifies the long-form sentence chunker (with <4-word fragment merging and `say.json` phonetic
replacements) and the beat-plan synthesizer (producing exact beat boundaries, `timing.json`,
`timing.js`, `captions.srt`, and `audio/identity.json`).

Usage (plain text script -> WAV):
  ~/.local/share/kokoro/.venv/bin/python tools/timing/kokoro-narrate.py SCRIPT.txt OUT.wav
        [--voice af_heart] [--lang en-us] [--speed 0.89] [--say say.json]

Usage (structured beat plan.json -> production folder):
  ~/.local/share/kokoro/.venv/bin/python tools/timing/kokoro-narrate.py plan.json PRODUCTION_DIR
        [--timing-js examples/my-film/timing.js] [--fps 30]
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import math
import re
import sys
from pathlib import Path

if "-h" not in sys.argv and "--help" not in sys.argv:
    import numpy as np
    import soundfile as sf
    from kokoro_onnx import Kokoro


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def split_sentences(paragraph: str, min_words: int = 4) -> list[str]:
    """Split on sentence punctuation and merge fragments shorter than min_words."""
    raw = [s.strip() for s in re.split(r"(?<=[.!?])\s+", paragraph) if s.strip()]
    merged: list[str] = []
    buf = ""
    for s in raw:
        buf = f"{buf} {s}".strip() if buf else s
        if len(re.findall(r"[A-Za-z0-9']+", buf)) >= min_words:
            merged.append(buf)
            buf = ""
    if buf:
        if merged:
            merged[-1] = f"{merged[-1]} {buf}"
        else:
            merged.append(buf)
    return merged


def srt_stamp(seconds: float) -> str:
    ms = round(seconds * 1000)
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", type=Path, help="Plain-text script (.txt/.md) or structured beat plan (.json)")
    ap.add_argument("target", type=Path, help="Output .wav path (for plain script) or production directory (for plan.json)")
    ap.add_argument("--model-dir", type=Path, default=Path.home() / ".local/share/kokoro")
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--lang", default="en-us")
    ap.add_argument("--speed", type=float, default=0.89)
    ap.add_argument("--gap", type=float, default=0.75, help="Silence between paragraphs, s (default 0.75)")
    ap.add_argument("--sent-gap", type=float, default=0.35, help="Silence between sentences, s (default 0.35)")
    ap.add_argument("--say", type=Path, help='JSON phonetic dictionary, e.g. {"3:07": "three oh seven"}')
    ap.add_argument("--limit", type=int, help="Only synthesize the first N paragraphs/beats")
    ap.add_argument("--fps", type=int, default=30, help="Frame rate for frame-aligned padding in plan mode")
    ap.add_argument("--timing-js", type=Path, help="Optional JS file path to write window.TOUR/window.TIMING")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    model = a.model_dir / "kokoro-v1.0.onnx"
    voices = a.model_dir / "voices-v1.0.bin"
    if not model.is_file() or not voices.is_file():
        sys.exit(f"missing Kokoro model files in {a.model_dir}")

    say = json.loads(a.say.read_text()) if a.say else {}
    tts = Kokoro(str(model), str(voices))
    rate = 24000

    if a.input.suffix.lower() == ".json":
        plan = json.loads(a.input.read_text())
        prod = a.target.resolve()
        audio_dir = prod / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)
        wav = audio_dir / "narration.wav"
        if wav.exists() and not a.force:
            sys.exit(f"refusing to overwrite {wav} (use --force)")

        voice = plan.get("voice", a.voice)
        lang = plan.get("language", a.lang)
        speed = float(plan.get("speed", a.speed))
        pos = 0
        chunks: list[np.ndarray] = []
        beats = []

        def silence(sec: float) -> None:
            nonlocal pos
            n = round(sec * rate)
            chunks.append(np.zeros(n, np.float32))
            pos += n

        silence(0.30)
        for beat in plan["beats"][:a.limit]:
            text = " ".join(beat["lines"])
            spoken = text
            for k, v in say.items():
                spoken = spoken.replace(k, v)
            data, sr = tts.create(spoken, voice=voice, speed=speed, lang=lang)
            assert sr == rate
            start = pos / rate
            chunks.append(data)
            pos += len(data)
            end = pos / rate
            silence(float(beat.get("gap", 0.34)))
            beats.append({**beat, "start": round(start, 6), "speech_end": round(end, 6),
                          "end": round(pos / rate, 6), "text": text})
            print(beat["id"], f"{start:.2f}..{end:.2f}", text, flush=True)

        silence(1.1)
        frames = math.ceil(pos / rate * a.fps)
        silence(frames / a.fps - pos / rate)
        sf.write(wav, np.concatenate(chunks), rate, subtype="PCM_16")
        wav_sha = sha256(wav)
        timing = {
            "title": plan.get("title", a.input.stem),
            "fps": a.fps,
            "duration": frames / a.fps,
            "frames": frames,
            "voice": voice,
            "language": lang,
            "speed": speed,
            "audio_sha256": wav_sha,
            "timing_source": "exact synthesis chunk placement; no word alignment",
            "beats": beats,
        }
        (prod / "timing.json").write_text(json.dumps(timing, indent=2) + "\n")
        if a.timing_js:
            a.timing_js.write_text("// Generated by kokoro-narrate.py\nwindow.TOUR=" + json.dumps(timing, indent=2) + ";\n")
        (prod / "script.txt").write_text("\n\n".join(b["text"] for b in beats) + "\n")
        srt = "\n\n".join(f"{i + 1}\n{srt_stamp(b['start'])} --> {srt_stamp(b['end'])}\n" + "\n".join(b["lines"])
                          for i, b in enumerate(beats))
        (prod / "captions.srt").write_text(srt + "\n")
        (audio_dir / "identity.json").write_text(json.dumps({
            "file": wav.name, "sha256": wav_sha, "rate": rate, "voice": voice, "language": lang, "speed": speed,
            "kokoro_onnx": importlib.metadata.version("kokoro-onnx"),
            "model_sha256": sha256(model), "voices_sha256": sha256(voices),
        }, indent=2) + "\n")
        print(f"wrote {wav} ({frames / a.fps:.3f}s, {frames} frames)")
        return 0

    # Plain-text script mode
    out_wav = a.target.resolve()
    if out_wav.exists() and not a.force:
        sys.exit(f"refusing to overwrite {out_wav} (use --force)")
    paras = [p.strip() for p in a.input.read_text().split("\n\n") if p.strip()][:a.limit]
    items: list[tuple[str, float]] = []
    for p in paras:
        for k, v in say.items():
            p = p.replace(k, v)
        sents = split_sentences(re.sub(r"\s+", " ", p))
        for j, s in enumerate(sents):
            items.append((s, a.gap if j == len(sents) - 1 else a.sent_gap))

    chunks = [np.zeros(int(rate * 0.4), dtype=np.float32)]
    for i, (s, gap) in enumerate(items, 1):
        audio, rate = tts.create(s, voice=a.voice, speed=a.speed, lang=a.lang)
        chunks.extend([audio, np.zeros(int(rate * gap), dtype=audio.dtype)])
        if i % 10 == 0 or i == len(items):
            print(f"{i}/{len(items)}", flush=True)
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out_wav, np.concatenate(chunks), rate, subtype="PCM_16")
    print(f"{out_wav} {sum(len(c) for c in chunks) / rate:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
