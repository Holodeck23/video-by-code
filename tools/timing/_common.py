# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Shared helpers for tools/timing/*.py. Not a tool: imported by the scripts beside it.

Stdlib at import time. Functions that need numpy import it inside, so stdlib-only tools
can still import this module.
"""
from __future__ import annotations

import difflib
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

DEFAULT_WHISPER_MODEL = Path(os.environ.get(
    "WHISPER_MODEL", Path.home() / ".cache/whisper/ggml-large-v3-turbo-q5_0.bin"))
DEFAULT_FW_MODEL = os.environ.get("FASTER_WHISPER_MODEL", "small.en")


class ToolError(Exception):
    """A clear, user-facing failure. Scripts print it and exit 1."""


def main_guard(fn) -> None:
    """Run fn(); turn ToolError into a one-line message and exit 1."""
    try:
        code = fn()
    except ToolError as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(1)
    sys.exit(code or 0)


def need(*cmds: str) -> None:
    for c in cmds:
        if shutil.which(c) is None:
            raise ToolError(f"'{c}' not found on PATH")


def need_file(p: Path, what: str = "input") -> Path:
    if not Path(p).is_file():
        raise ToolError(f"{what} not found: {p}")
    return Path(p)


def guard_outputs(paths, force: bool) -> None:
    """Refuse to overwrite any existing output unless force."""
    existing = [str(p) for p in paths if Path(p).exists()]
    if existing and not force:
        raise ToolError("refusing to overwrite (use --force): " + ", ".join(existing))


def run(cmd: list[str], *, text: bool = True, check: bool = True) -> subprocess.CompletedProcess:
    p = subprocess.run(cmd, capture_output=True, text=text)
    if check and p.returncode != 0:
        tail = (p.stderr if text else p.stderr.decode(errors="replace"))[-1200:]
        raise ToolError(f"command failed ({p.returncode}): {' '.join(cmd[:6])} ...\n{tail}")
    return p


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def ffprobe(path: Path) -> dict:
    need("ffprobe")
    out = run(["ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)]).stdout
    return json.loads(out)


def write_json(path: Path, obj, indent: int | None = 1) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=indent, ensure_ascii=False) + "\n")


def read_json(path: Path) -> dict:
    need_file(path, "JSON file")
    try:
        return json.loads(Path(path).read_text())
    except json.JSONDecodeError as e:
        raise ToolError(f"{path} is not valid JSON: {e}") from e


# ---------------------------------------------------------------- audio I/O (numpy)
def decode(path: Path, sr: int, mono: bool = True):
    """Decode any audio file through ffmpeg to float32 at sr. Returns (samples, sr).
    mono -> shape (n,), else (n, 2)."""
    import numpy as np
    need("ffmpeg")
    need_file(path, "audio")
    ch = 1 if mono else 2
    p = run(["ffmpeg", "-v", "error", "-i", str(path), "-map", "0:a:0", "-ac", str(ch), "-ar", str(sr),
             "-f", "f32le", "-"], text=False)
    y = np.frombuffer(p.stdout, dtype="<f4").copy()
    if y.size == 0:
        raise ToolError(f"no audio decoded from {path}")
    return (y if mono else y.reshape(-1, 2)), sr


def write_wav(path: Path, y, sr: int) -> None:
    """Write float samples (n,) or (n, ch) as 16-bit PCM WAV."""
    import numpy as np
    y = np.asarray(y, dtype=np.float32)
    ch = 1 if y.ndim == 1 else y.shape[1]
    pcm = (np.clip(y, -1, 1) * 32767).round().astype("<i2")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def rms_envelope(y, sr: int, win_s: float = 0.04, hop_s: float = 0.01):
    """RMS over win_s windows every hop_s. Returns (rms, hop_s); frame k is centred on k*hop_s."""
    import numpy as np
    win, hop = max(1, int(sr * win_s)), max(1, int(sr * hop_s))
    pad = np.pad(y.astype(np.float64) ** 2, (win // 2, win // 2))
    c = np.concatenate([[0.0], np.cumsum(pad)])
    n = len(y) // hop + 1
    idx = np.arange(n) * hop
    s = c[np.minimum(idx + win, len(c) - 1)] - c[np.minimum(idx, len(c) - 1)]
    return np.sqrt(np.maximum(s / win, 0)), hop_s


# ---------------------------------------------------------------- loudness
def loudness(path: Path) -> dict:
    """EBU R128 integrated loudness (LUFS), true peak (dBTP) and LRA via ffmpeg loudnorm."""
    need("ffmpeg")
    p = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af",
             "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"])
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    if not m:
        raise ToolError(f"could not measure loudness of {path}")
    d = json.loads(m.group(0))
    f = lambda k: float(d[k]) if d[k] not in ("-inf", "inf") else float("-inf")
    return {"I": f("input_i"), "TP": f("input_tp"), "LRA": f("input_lra"), "thresh": f("input_thresh"),
            "raw": d}


def loudnorm_2pass(src: Path, dst: Path, I: float, TP: float, LRA: float, pre: str = "",
                   codec: str = "pcm_s24le", sr: int = 48000) -> dict:
    """Two-pass loudnorm (linear when possible). pre = filters applied before loudnorm."""
    chain = (pre + "," if pre else "")
    p = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af",
             f"{chain}loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json", "-f", "null", "-"])
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    if not m:
        raise ToolError("loudnorm first pass failed")
    d = json.loads(m.group(0))
    if d["input_i"] in ("-inf", "inf"):
        raise ToolError(f"{src} is silent; cannot normalise loudness")
    second = (f"{chain}loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={d['input_i']}:"
              f"measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:"
              f"measured_thresh={d['input_thresh']}:offset={d['target_offset']}:linear=true:print_format=json")
    p = run(["ffmpeg", "-hide_banner", "-nostats", "-y", "-i", str(src), "-af", second, "-ar", str(sr),
             "-c:a", codec, str(dst)])
    m = re.search(r"\{[^{}]*\"normalization_type\"[^{}]*\}", p.stderr, re.S)
    return json.loads(m.group(0)) if m else {}


# ---------------------------------------------------------------- text
def norm_word(w: str, lang: str = "en") -> str:
    """Comparable key for a token; Unicode- and language-aware (see langtext.py)."""
    from langtext import norm_word as _norm
    return _norm(w, lang)


def tokens(text: str, lang: str = "en") -> list[str]:
    """Display tokens: whitespace split with hyphenated words split into parts; for Japanese and
    Chinese, script-run pieces from langtext.display_tokens."""
    from langtext import display_tokens, is_cjk
    if is_cjk(lang):
        return display_tokens(text, lang)
    out = []
    for t in text.split():
        parts = [p for p in re.split(r"(?<=\w)[-–—](?=\w)", t) if p]
        out += parts
    return [t for t in out if norm_word(t, lang)]


def apply_say_map(text: str, mapping: dict[str, str]) -> str:
    """Replace written forms with spoken forms. Whole-word match when the key starts/ends
    with a word character; longest keys first."""
    for k in sorted(mapping, key=len, reverse=True):
        pat = re.escape(k)
        if re.match(r"\w", k):
            pat = r"(?<!\w)" + pat
        if re.search(r"\w$", k):
            pat = pat + r"(?!\w)"
        text = re.sub(pat, mapping[k], text)
    return text


def split_sentences(par: str, min_words: int = 4, lang: str = "en") -> list[str]:
    """Split on . ! ? (and 。！？ for Japanese/Chinese) and merge fragments under min_words
    comparable units into the following sentence."""
    from langtext import is_cjk, units
    cjk = is_cjk(lang)
    if cjk:
        raw = [s.strip() for s in re.split(r"(?<=[。！？!?])[」』）)]*\s*", par) if s.strip()]
    else:
        raw = [s.strip() for s in re.split(r"(?<=[.!?])[\"')\]]*\s+", par) if s.strip()]
    merged, buf = [], ""
    for s in raw:
        buf = f"{buf} {s}".strip() if buf else s
        count = len(units(buf, lang)) if cjk else len(re.findall(r"[A-Za-z0-9']+", buf))
        if count >= min_words:
            merged.append(buf)
            buf = ""
    if buf:
        if merged:
            merged[-1] = f"{merged[-1]} {buf}"
        else:
            merged.append(buf)
    return merged


def paragraphs(text: str) -> list[str]:
    return [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", text) if p.strip()]


def diff_words(want: list[str], got: list[str]):
    sm = difflib.SequenceMatcher(a=want, b=got, autojunk=False)
    return sm, sm.get_opcodes()


# ---------------------------------------------------------------- ASR
def asr_words(audio: Path, engine: str, model: str | None, prompt: str | None = None,
              language: str = "en") -> dict:
    """Transcribe with word timestamps. Returns {engine, model, words:[{w,start,end}], text}.
    whisper-cpp: runs the whisper-cli binary with a ggml model file.
    faster-whisper: python package (run the tool with `uv run --with faster-whisper ...`)."""
    audio = need_file(audio, "audio")
    if engine == "whisper-cpp":
        need("whisper-cli", "ffmpeg")
        mpath = Path(model) if model else DEFAULT_WHISPER_MODEL
        if not mpath.is_file():
            raise ToolError(f"whisper.cpp model not found: {mpath} (pass --model or set WHISPER_MODEL; "
                            "models: https://huggingface.co/ggerganov/whisper.cpp)")
        with tempfile.TemporaryDirectory() as d:
            wav = Path(d) / "in.wav"
            run(["ffmpeg", "-v", "error", "-i", str(audio), "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
                 str(wav)])
            base = Path(d) / "out"
            cmd = ["whisper-cli", "-m", str(mpath), "-f", str(wav), "-l", language, "-ml", "1", "-sow",
                   "-oj", "-of", str(base), "-np"]
            if prompt:
                cmd += ["--prompt", prompt[:600]]
            run(cmd)
            data = json.loads(base.with_suffix(".json").read_text())
        words = []
        for seg in data.get("transcription", []):
            for raw in seg["text"].split():
                if norm_word(raw, language):
                    words.append({"w": raw.strip(), "start": seg["offsets"]["from"] / 1000,
                                  "end": seg["offsets"]["to"] / 1000})
        return {"engine": engine, "model": mpath.name, "words": words,
                "text": " ".join(w["w"] for w in words)}
    if engine == "faster-whisper":
        try:
            from faster_whisper import WhisperModel
        except ImportError as e:
            raise ToolError("faster-whisper is not installed; run with "
                            "`uv run --with faster-whisper tools/timing/<tool>.py ...`") from e
        name = model or DEFAULT_FW_MODEL
        m = WhisperModel(name, device="cpu", compute_type="int8")
        segs, _ = m.transcribe(str(audio), language=language, word_timestamps=True,
                               initial_prompt=prompt, vad_filter=False,
                               condition_on_previous_text=False)
        words = [{"w": w.word.strip(), "start": float(w.start), "end": float(w.end)}
                 for s in segs for w in (s.words or []) if norm_word(w.word, language)]
        return {"engine": engine, "model": str(name), "words": words,
                "text": " ".join(w["w"] for w in words)}
    raise ToolError(f"unknown ASR engine '{engine}' (whisper-cpp | faster-whisper)")


def default_engine() -> str:
    return "whisper-cpp" if shutil.which("whisper-cli") else "faster-whisper"
