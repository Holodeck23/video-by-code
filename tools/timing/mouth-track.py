# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy>=1.24"]
# ///
"""Mouth-shape track (an exposure sheet) for a drawn or sprite host, from a voice WAV and word timings.

Two signals decide each mouth drawing:
  1. what is being said: every letter of every timed word is spread evenly across the word's
     span and mapped to a shape class (open, round, wide, lips-together, mid);
  2. how loud it is: RMS per step, normalised to the 90th percentile of voiced steps, so a
     whisper never opens the mouth fully and silence always closes it.

Shapes (one character per step): c closed · m mid · a open · o round · e wide.
Default 12 steps a second: animation "on twos" at 24 fps reads as speech without jitter.
A level curve at 30 fps is written too, for a waveform bar or a glow that pulses with the voice.

Words come from tools/timing/align-words.py (lines[].words[] with w/start/end) or any JSON
holding a list of {"w"|"word"|"text", "start", "end"} under words/lines/cues, or a bare list.

Usage:
  uv run tools/timing/mouth-track.py VOICE.wav WORDS.json OUT.json [--fps 12] [--force]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import ToolError, decode, guard_outputs, main_guard, read_json, sha256, write_json  # noqa: E402

SR = 16000
LEVEL_FPS = 30
QUIET, MID = 0.14, 0.42           # normalised loudness thresholds: below QUIET closed, below MID half-open
LETTER_CLASS = {**{ch: "a" for ch in "ai"}, **{ch: "o" for ch in "ouw"}, **{ch: "e" for ch in "ey"},
                **{ch: "c" for ch in "mbp"}}
PRIORITY = {"a": 4, "o": 3, "e": 2, "m": 1, "c": 0}   # when sounds share a step, the most open wins


def word_list(doc) -> list[dict]:
    """Flatten any supported words document to [{text, start, end}] sorted by start."""
    if isinstance(doc, dict):
        if isinstance(doc.get("words"), list):
            items = doc["words"]
        else:
            groups = doc.get("lines") or doc.get("cues") or []
            items = [w for g in groups for w in (g.get("words") or [])]
    elif isinstance(doc, list):
        items = doc
    else:
        items = []
    out = []
    for w in items:
        text = str(w.get("w") or w.get("word") or w.get("text") or "").strip()
        try:
            s, e = float(w["start"]), float(w["end"])
        except (KeyError, TypeError, ValueError):
            continue
        if text and e > s:
            out.append({"text": text, "start": s, "end": e})
    if not out:
        raise ToolError("no timed words found (expected w/word/text with start and end)")
    return sorted(out, key=lambda x: x["start"])


def sounds(words: list[dict]) -> list[tuple[str, float, float]]:
    """(class, start, end) per letter, letters spread evenly over the word."""
    out = []
    for w in words:
        letters = [ch for ch in w["text"].lower() if ch.isalpha()]
        if not letters:
            continue
        dt = (w["end"] - w["start"]) / len(letters)
        for k, ch in enumerate(letters):
            t0 = w["start"] + k * dt
            out.append((LETTER_CLASS.get(ch, "m"), t0, t0 + dt))
    return out


def rms_steps(y, sr: int, fps: int):
    import numpy as np
    hop = sr // fps
    n = max(1, int(np.ceil(len(y) / hop)))
    pad = np.pad(y, (0, n * hop - len(y)))
    frames = pad.reshape(n, hop).astype(np.float64)
    return np.sqrt(np.mean(np.square(frames), axis=1) + 1e-10)


def shapes_for(level, wanted: list[str]) -> str:
    out = []
    for lv, want in zip(level, wanted):
        if lv < QUIET or want == "c" or not want:
            out.append("c")
        elif lv < MID:
            out.append("o" if want == "o" else "m")
        else:
            out.append(want if want in ("a", "o", "e") else "a")
    return "".join(out)


def build(wav: Path, words_doc, fps: int) -> dict:
    import numpy as np
    y, sr = decode(wav, SR)
    env = rms_steps(y, sr, fps)
    voiced = env[env > 0.01]
    ref = float(np.percentile(voiced, 90)) if voiced.size else 1.0
    level = np.clip(env / ref, 0, 1.2)
    wanted = [""] * len(level)
    for cls, s, e in sounds(word_list(words_doc)):
        for k in range(int(s * fps), min(len(level), int(e * fps) + 1)):
            if not wanted[k] or PRIORITY[cls] > PRIORITY[wanted[k]]:
                wanted[k] = cls
    lv30 = np.clip(rms_steps(y, sr, LEVEL_FPS) / ref, 0, 1)
    return {
        "fps": fps,
        "shapes": shapes_for(level, wanted),
        "legend": {"c": "closed", "m": "mid", "a": "open", "o": "round", "e": "wide"},
        "level_fps": LEVEL_FPS,
        "level": [round(float(v), 3) for v in lv30],
        "duration": round(len(y) / sr, 3),
        "voice_sha256": sha256(wav),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("voice", type=Path)
    ap.add_argument("words", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--fps", type=int, default=12, help="mouth drawings per second (default 12)")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    if not 4 <= a.fps <= 30:
        raise ToolError("--fps must be between 4 and 30")
    guard_outputs([a.out], a.force)
    track = build(a.voice, read_json(a.words), a.fps)
    write_json(a.out, track, indent=None)
    counts = {k: track["shapes"].count(k) for k in "cmaoe"}
    print(f"{a.out}: {len(track['shapes'])} steps at {a.fps}/s, {track['duration']} s · " +
          " ".join(f"{k}={v}" for k, v in counts.items()))
    return 0


if __name__ == "__main__":
    main_guard(main)
