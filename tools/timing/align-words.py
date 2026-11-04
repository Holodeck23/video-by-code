# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["numpy>=1.24", "librosa>=0.10", "soundfile>=0.12"]
# ///
"""Word-level lyric and speech alignment for kinetic typography and narrated explainers.

Unifies three production alignment methods:
  1. --backend whisper-cli (default): runs local `whisper-cli` with `-oj` word/token timestamps,
     matches known lyric/script words with difflib within cue windows, interpolates unmatched
     words ("src": "interp"), trims pre-silence stretches on phrase-initial words (fixFirstWord),
     and splits long lines (> 14 words or > 2.5 s inter-word gap) so karaoke layouts never
     collapse or run backward in time.
  2. --backend mlx-whisper / --backend faster-whisper: uses Python Whisper bindings with
     word_timestamps=True and initial_prompt when installed.
  3. --backend acoustic: syllable-weighted + 200 fps vocal harmonic band (280-3400 Hz) energy
     warping within clamped 2-bar line windows, with 16th-note snapping for stacked gang vocals
     (from a lyric-film pipeline).

Usage:
  uv run --python 3.12 tools/timing/align-words.py CUES_OR_SCRIPT AUDIO OUT.json
        [--backend whisper-cli|acoustic|mlx-whisper|faster-whisper]
        [--whisper-model ~/.cache/whisper/ggml-large-v3-turbo-q5_0.bin]
        [--bpm 120] [--phase 0.0] [--window 30] [--offset 0.0] [--force]
"""
from __future__ import annotations

import argparse
import difflib
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import ToolError, decode, guard_outputs, main_guard, need_file, read_json, write_json  # noqa: E402

SR = 22050
GANG_PAT = None  # set from --gang-pattern; None disables gang-vocal snapping


def norm(w: str) -> str:
    return re.sub(r"[^a-z0-9]", "", w.lower().replace("’", "'"))


def syllables_est(w: str) -> int:
    clean = re.sub(r"[^a-zA-Z]", "", w).lower()
    if not clean:
        return 1
    groups = re.findall(r"[aeiouy]+", clean)
    count = len(groups)
    if clean.endswith("e") and count > 1 and not clean.endswith("le"):
        count -= 1
    return max(1, count)


def fix_first_word(words: list[dict]) -> list[dict]:
    """Whisper stretches a phrase's first word back over preceding silence; cap lead to 0.45 s."""
    out = []
    for i, w in enumerate(words):
        if i == 0 and w["end"] - w["start"] > 0.7:
            w = {**w, "start": round(max(w["start"], w["end"] - 0.45), 3), "fixed": True}
        out.append(w)
    return out


def split_long_or_gapped_lines(lines: list[dict], max_words: int = 14, max_gap: float = 2.5) -> list[dict]:
    """Prevent multi-sentence monologues or chorus/ad-lib gaps from bridging across breaks."""
    out: list[dict] = []
    for ln in lines:
        ws = ln.get("words") or []
        if not ws:
            continue
        chunks: list[list[dict]] = [[]]
        for w in ws:
            if chunks[-1]:
                gap = w["start"] - chunks[-1][-1]["end"]
                if gap > max_gap or len(chunks[-1]) >= max_words:
                    chunks.append([])
            chunks[-1].append(w)
        for ch in chunks:
            if not ch:
                continue
            ch = fix_first_word(ch)
            out.append({
                "i": len(out),
                "text": " ".join(x["w"] for x in ch),
                "start": round(ch[0]["start"], 3),
                "end": round(ch[-1]["end"], 3),
                "words": ch,
            })
    return out


def load_cues_or_script(path: Path, duration: float) -> list[dict]:
    if path.suffix.lower() == ".json":
        d = read_json(path)
        cues = d.get("cues") or d.get("lyrics") or d.get("lines") or d.get("beats") or []
        out = []
        for i, c in enumerate(cues):
            text = c.get("text") or " ".join(c.get("lines", []))
            if not text.strip():
                continue
            out.append({
                "i": i,
                "start": float(c.get("start", 0.0)),
                "end": float(c.get("end", duration)),
                "text": " ".join(text.split()),
            })
        if out:
            return out
    raw = path.read_text(encoding="utf-8")
    if "```" in raw:
        parts = raw.split("```")
        if len(parts) >= 2:
            raw = parts[1]
    paras = [" ".join(p.split()) for p in raw.strip().split("\n\n") if p.strip()]
    if not paras:
        raise ToolError(f"no text found in {path}")
    span = duration / len(paras)
    return [{"i": i, "start": round(i * span, 3), "end": round((i + 1) * span, 3), "text": p}
            for i, p in enumerate(paras)]


def transcribe_words(audio: Path, backend: str, model_path: str, prompt: str, raw_cache: Path) -> list[dict]:
    if raw_cache.is_file():
        cached = read_json(raw_cache)
        if isinstance(cached, list):
            return cached

    heard: list[dict] = []
    if backend == "whisper-cli":
        with tempfile.TemporaryDirectory() as d:
            base = Path(d) / "out"
            cmd = ["whisper-cli", "-m", model_path, "-f", str(audio), "-oj", "-of", str(base), "-np", "-ml", "1"]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode != 0:
                raise ToolError(f"whisper-cli failed: {res.stderr.strip()}")
            data = json.loads(base.with_suffix(".json").read_text())
            for seg in data.get("transcription", []):
                w = seg.get("text", "").strip()
                t0 = float(seg.get("offsets", {}).get("from", 0)) / 1000.0
                t1 = float(seg.get("offsets", {}).get("to", 0)) / 1000.0
                for tok in w.split():
                    if norm(tok):
                        heard.append({"w": tok, "n": norm(tok), "start": t0, "end": max(t0 + 0.05, t1)})
    elif backend == "mlx-whisper":
        import mlx_whisper  # type: ignore
        raw = mlx_whisper.transcribe(str(audio), path_or_hf_repo=model_path, word_timestamps=True,
                                     initial_prompt=prompt, language="en", condition_on_previous_text=False)
        for seg in raw.get("segments", []):
            for w in seg.get("words", []):
                if norm(w["word"]):
                    heard.append({"w": w["word"].strip(), "n": norm(w["word"]),
                                  "start": float(w["start"]), "end": float(w["end"])})
    elif backend == "faster-whisper":
        from faster_whisper import WhisperModel  # type: ignore
        model = WhisperModel(model_path, device="cpu", compute_type="int8")
        segs, _ = model.transcribe(str(audio), language="en", word_timestamps=True,
                                   initial_prompt=prompt, vad_filter=True)
        for s in segs:
            for w in s.words or []:
                if norm(w.word):
                    heard.append({"w": w.word.strip(), "n": norm(w.word),
                                  "start": float(w.start), "end": float(w.end)})
    else:
        raise ToolError(f"unknown transcription backend: {backend}")

    write_json(raw_cache, heard)
    return heard


def align_acoustic(cues: list[dict], y, bpm: float, phase: float) -> list[dict]:
    import librosa
    import numpy as np

    period = 60.0 / bpm
    bar = period * 4.0
    sixteenth = period / 4.0
    hop_align = int(round(SR / 200))
    align_dt = hop_align / SR
    S = np.abs(librosa.stft(y, n_fft=1024, hop_length=hop_align))
    freqs = librosa.fft_frequencies(sr=SR, n_fft=1024)
    vox_raw = S[(freqs >= 280) & (freqs <= 3400)].mean(axis=0) - 0.28 * S[(freqs >= 30) & (freqs < 180)].mean(axis=0)
    vox_env = np.clip(vox_raw, 0, None)
    vox_env = vox_env / (np.percentile(vox_env, 98) + 1e-9)
    vox_onset = np.clip(np.diff(vox_env, prepend=vox_env[0]), 0, None)

    def snap_16th(t_val: float) -> float:
        return round(phase + round((t_val - phase) / sixteenth) * sixteenth, 3)

    lines = []
    for i, c in enumerate(cues):
        words = re.findall(r"[^\s]+", c["text"])
        if not words:
            continue
        t0 = c["start"]
        nxt = cues[i + 1]["start"] - 0.04 if i + 1 < len(cues) else c["end"]
        max_win = min(max(0.35, nxt - t0), 2.0 * bar, max(1.6, len(c["text"]) * 0.072))
        idx0 = max(0, int(round(t0 / align_dt)))
        idx1 = min(len(vox_env), int(round((t0 + max_win) / align_dt)))
        seg_env = vox_env[idx0:idx1]
        if len(seg_env) > 8:
            thr = max(0.08, 0.22 * float(seg_env.max()))
            act = np.where(seg_env >= thr)[0]
            span = float(np.clip((act[-1] + 6) * align_dt, 0.35, max_win)) if len(act) else min(max_win, 0.38 * len(c["text"]))
        else:
            span = min(max_win, 0.38 * len(c["text"]))

        is_gang = bool(GANG_PAT and GANG_PAT.match(c["text"].strip()))
        ws = []
        if is_gang and len(words) >= 2 and len(words) % 2 == 0:
            n_pairs = len(words) // 2
            pair_span = span / n_pairs
            for p_idx in range(n_pairs):
                p_start = snap_16th(t0 + p_idx * pair_span)
                p_mid = max(round(p_start + sixteenth, 3), snap_16th(p_start + max(sixteenth, pair_span * 0.36)))
                p_end = max(round(p_mid + sixteenth, 3), snap_16th(p_start + pair_span * 0.92))
                ws.append({"w": words[p_idx * 2], "start": round(p_start, 3), "end": round(p_mid, 3), "src": "gang-16th"})
                ws.append({"w": words[p_idx * 2 + 1], "start": round(p_mid, 3), "end": round(p_end, 3), "src": "gang-16th"})
        else:
            weights = np.array([syllables_est(w) * 1.6 + len(w) * 0.35 for w in words], dtype=float)
            weights /= weights.sum()
            cum_target = np.concatenate([[0.0], np.cumsum(weights)])
            idx_end = min(len(vox_env), max(idx0 + 2, int(round((t0 + span) / align_dt))))
            sub = vox_env[idx0:idx_end] + 1.5 * vox_onset[idx0:idx_end] + 0.05
            cum_audio = np.concatenate([[0.0], np.cumsum(sub)])
            cum_audio /= cum_audio[-1]
            u_grid = np.linspace(0.0, 1.0, len(cum_audio))
            t_cursor = t0
            for w_idx, w in enumerate(words):
                u1 = float(cum_target[w_idx + 1])
                u_audio = float(np.interp(u1, cum_audio, u_grid))
                u_blended = 0.62 * u1 + 0.38 * u_audio
                t_next = t0 + span * u_blended if w_idx < len(words) - 1 else t0 + span
                t_next = max(t_cursor + 0.05, t_next)
                ws.append({"w": w, "start": round(t_cursor, 3), "end": round(t_next, 3), "src": "acoustic"})
                t_cursor = t_next
        lines.append({"i": i, "text": c["text"], "start": ws[0]["start"], "end": ws[-1]["end"], "words": ws})
    return lines


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cues", type=Path, help="embedded-lyrics.py JSON, timing.json, or plain script (.txt/.md)")
    ap.add_argument("audio", type=Path, help="Vocal stem or speech audio file")
    ap.add_argument("output", type=Path, help="Output words/lyrics JSON path")
    ap.add_argument("--backend", choices=["whisper-cli", "acoustic", "mlx-whisper", "faster-whisper"],
                    default="whisper-cli")
    ap.add_argument("--whisper-model", default=str(Path.home() / ".cache/whisper/ggml-large-v3-turbo-q5_0.bin"))
    ap.add_argument("--bpm", type=float, default=120.0, help="BPM for --backend acoustic (default 120)")
    ap.add_argument("--phase", type=float, default=0.0, help="Beat phase in seconds for --backend acoustic")
    ap.add_argument("--window", type=float, default=30.0, help="Max seconds after cue start to accept a Whisper match")
    ap.add_argument("--offset", type=float, default=0.0, help="Seconds to subtract from all aligned timestamps")
    ap.add_argument("--gang-pattern", help="Regex (case-insensitive) matching whole lines of stacked/shouted gang vocals, e.g. \"^(yes we did|not me)$\"; their word pairs snap to the 16th-note grid (acoustic backend)")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    global GANG_PAT
    GANG_PAT = re.compile(a.gang_pattern, re.I) if a.gang_pattern else None

    guard_outputs([a.output], a.force)
    audio_path = need_file(a.audio, "audio")
    cues_path = need_file(a.cues, "cues/script")
    y, _ = decode(audio_path, SR)
    duration = len(y) / SR
    cues = load_cues_or_script(cues_path, duration)

    if a.backend == "acoustic":
        lines = align_acoustic(cues, y, a.bpm, a.phase)
        matched = sum(len(ln["words"]) for ln in lines)
        total = matched
    else:
        raw_cache = a.output.with_suffix(".raw.json")
        prompt = " ".join(c["text"] for c in cues)
        heard = transcribe_words(audio_path, a.backend, a.whisper_model, prompt, raw_cache)
        known = [{"w": tok, "n": norm(tok), "line": li}
                 for li, c in enumerate(cues) for tok in c["text"].split() if norm(tok)]
        sm = difflib.SequenceMatcher(a=[k["n"] for k in known], b=[h["n"] for h in heard], autojunk=False)
        for blk in sm.get_matching_blocks():
            for idx in range(blk.size):
                k, h = known[blk.a + idx], heard[blk.b + idx]
                c_start = cues[k["line"]]["start"]
                if c_start - 3.0 <= h["start"] <= c_start + a.window:
                    k.update(start=round(h["start"], 3), end=round(h["end"], 3), src="asr")

        raw_lines = []
        for li, c in enumerate(cues):
            ws = [k for k in known if k["line"] == li]
            if not ws:
                continue
            nxt = cues[li + 1]["start"] if li + 1 < len(cues) else min(duration, c["start"] + 6.0)
            lo = c["start"]
            hi = max(lo + 0.25 * len(ws), min(c.get("end", nxt), nxt))
            anchors = [(-1, lo)] + [(i, w["start"]) for i, w in enumerate(ws) if "start" in w] + [(len(ws), hi)]
            for (ia, ta), (ib, tb) in zip(anchors, anchors[1:]):
                span = max(0.05 * (ib - ia), tb - ta)
                for j in range(ia + 1, ib):
                    s = ta + span * (j - ia) / (ib - ia)
                    ws[j].update(start=round(s, 3), end=round(s + 0.22, 3), src="interp")
            for i in range(len(ws) - 1):
                if ws[i + 1]["start"] < ws[i]["start"]:
                    ws[i + 1]["start"] = round(ws[i]["start"] + 0.06, 3)
                ws[i]["end"] = round(max(ws[i]["start"] + 0.05, min(ws[i]["end"], ws[i + 1]["start"])), 3)
            raw_lines.append({
                "i": li,
                "text": c["text"],
                "start": ws[0]["start"],
                "end": ws[-1]["end"],
                "words": [{k: w[k] for k in ("w", "start", "end", "src")} for w in ws],
            })
        lines = split_long_or_gapped_lines(raw_lines)
        matched = sum(1 for k in known if k.get("src") == "asr")
        total = len(known)

    if a.offset:
        for ln in lines:
            ln["start"] = round(ln["start"] - a.offset, 3)
            ln["end"] = round(ln["end"] - a.offset, 3)
            for w in ln["words"]:
                w["start"] = round(w["start"] - a.offset, 3)
                w["end"] = round(w["end"] - a.offset, 3)

    # Strict monotonicity assertion
    prev_t = -1e9
    for ln in lines:
        for w in ln["words"]:
            if w["start"] < prev_t - 1e-3:
                raise ToolError(f"non-monotonic word timestamp on {w['w']!r} at {w['start']}s (< {prev_t}s)")
            prev_t = w["start"]

    write_json(a.output, {
        "backend": a.backend,
        "audio": audio_path.name,
        "matched": matched,
        "total": total,
        "lines": lines,
        "timing_note": "Word boundaries are acoustic/ASR estimates; verify key hooks and first-word holds by ear.",
    })
    print(f"wrote {a.output}: {matched}/{total} words matched across {len(lines)} lines")
    return 0


if __name__ == "__main__":
    main_guard(main)
