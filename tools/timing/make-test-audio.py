# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy>=1.24"]
# ///
"""Synthesise known-answer test media for every tool in tools/timing/.

Usage:
  uv run tools/timing/make-test-audio.py OUTDIR [--bpm 123] [--phase 0.25] [--bars 20] [--force]

Needs ffmpeg and macOS `say` (for the spoken parts). Writes into OUTDIR:
  track.wav          click track: 4/4 at --bpm, accented downbeats, section A (soft clicks + pad)
                     for 8 bars, a scored 2-beat silence (last two beats of bar 8), then section B
                     (kick, hat, bass) from bar 9 to the end
  track-opus.m4a     4 s of track.wav as Opus inside an .m4a (audio-identity warning test)
  song.wav           track.wav under four spoken "lyric" lines and one ad-lib not on the sheet
  song.m4a           song.wav as AAC with a mov_text subtitle stream (section tags + line cues,
                     one cue with a runaway end across the outro tag)
  song.srt, song-lyrics.txt   the same cues as SRT, and the lyric sheet with [section] tags
  script.txt, say.json        a two-paragraph narration script and its pronunciation map
  narration.wav      the script read by `say` (pronunciation map applied)
  narration-cut.wav  the same with one sentence removed (verify-narration must fail on it)
  sfx.wav            three noise whooshes at 2, 6 and 10 s
  answer-key.json    the true bpm, phase, beats, downbeats, silence, sections, line placements

Exit 0 on success, 1 on any failure. Refuses to overwrite unless --force.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import ToolError, decode, guard_outputs, main_guard, need, run, write_json, write_wav  # noqa: E402

SR = 48000
LYRICS = ["Every signal finds its way home", "Count the beats and hold the line",
          "Seven lights across the water", "Nothing moves until the drop"]
LYRIC_BARS = [9, 11, 13, 15]          # 0-based bar index where each line is placed
ADLIB, ADLIB_BAR = "Hey hey hey", 17
TAGS = [("[Intro]", 0), ("[Chorus]", 8), ("[Outro]", 18)]
SCRIPT = ("Every frame is a pure function of time. The page draws any moment on request. "
          "Fast. That keeps renders repeatable.\n\n"
          "The renderer captures 30 fps. Sound is scheduled at the same times as the picture. "
          "Captions follow the spoken words.\n")
CUT_SENTENCE = "Sound is scheduled at the same times as the picture. "
SAY_MAP = {"30 fps": "thirty frames per second"}
OUTS = ["track.wav", "track-opus.m4a", "song.wav", "song.m4a", "song.srt", "song-lyrics.txt", "script.txt",
        "say.json", "narration.wav", "narration-cut.wav", "sfx.wav", "answer-key.json"]


def blip(np, f: float, dur: float, gain: float, decay: float):
    t = np.arange(int(SR * dur)) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / decay) * gain).astype(np.float32)


def add(buf, sig, t: float) -> None:
    i = int(round(t * SR))
    j = min(len(buf), i + len(sig))
    if j > i:
        buf[i:j] += sig[: j - i]


def say_to(np, text: str, rate: int, tmp: Path, name: str):
    aiff = tmp / f"{name}.aiff"
    run(["say", "-r", str(rate), "-o", str(aiff), text])
    y, _ = decode(aiff, SR)
    nz = np.flatnonzero(np.abs(y) > 0.003)
    return y[nz[0]: nz[-1] + 1] if nz.size else y


def srt_time(t: float) -> str:
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("outdir", type=Path)
    ap.add_argument("--bpm", type=float, default=123.0)
    ap.add_argument("--phase", type=float, default=0.25, help="time of beat 1, seconds")
    ap.add_argument("--bars", type=int, default=20)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    import numpy as np
    need("ffmpeg", "say")
    if a.bars < 20:
        raise ToolError("--bars must be at least 20 (lyrics, ad-lib and outro tag sit in bars 10-19)")
    out = a.outdir
    guard_outputs([out / n for n in OUTS], a.force)
    out.mkdir(parents=True, exist_ok=True)

    p = 60.0 / a.bpm
    nbeats = a.bars * 4
    beats = [a.phase + i * p for i in range(nbeats)]
    dur = beats[-1] + p + 1.0
    y = np.zeros(int(SR * dur), dtype=np.float32)
    rng = np.random.default_rng(7)
    sil_beats = {30, 31}                       # beats 3-4 of bar 8: the scored silence

    # Section A: soft clicks and a pad that stops cleanly before the silence.
    pad_t = np.arange(int(SR * (beats[30] - 0.15 - a.phase))) / SR
    pad = sum(np.sin(2 * np.pi * f * pad_t) for f in (220.0, 277.18, 329.63)) * 0.035
    fade = int(0.1 * SR)
    pad[:fade] *= np.linspace(0, 1, fade)
    pad[-fade:] *= np.linspace(1, 0, fade)
    add(y, pad.astype(np.float32), a.phase)
    for i in range(32):
        if i in sil_beats:
            continue
        down = i % 4 == 0
        add(y, blip(np, 1600 if down else 1000, 0.06, 0.8 if down else 0.4, 0.012), beats[i])
    # Section B: kick on 1 and 3, click on 1, hats on eighths, a bass note per bar.
    for i in range(32, nbeats):
        tk = np.arange(int(SR * 0.16)) / SR
        kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-tk / 0.03)) * tk) * np.exp(-tk / 0.05) * 0.9
        if i % 2 == 0:
            add(y, kick.astype(np.float32), beats[i])
        if i % 4 == 0:
            add(y, blip(np, 2000, 0.05, 0.5, 0.01), beats[i])
            tb = np.arange(int(SR * p * 3.8)) / SR
            add(y, (np.sin(2 * np.pi * 55 * tb) * np.exp(-tb / 1.2) * 0.25).astype(np.float32), beats[i])
        for h in (0.0, 0.5):
            hat = rng.standard_normal(int(SR * 0.03)).astype(np.float32)
            hat = np.diff(hat, prepend=0) * np.exp(-np.arange(hat.size) / SR / 0.008) * 0.12
            add(y, hat.astype(np.float32), beats[i] + h * p)
    nz = np.flatnonzero(np.abs(y[: int(beats[32] * SR)]) > 1e-4)
    sil_start = float(nz[-1] + 1) / SR
    sil_end = beats[32]
    y = np.clip(y, -0.98, 0.98)
    write_wav(out / "track.wav", y, SR)
    run(["ffmpeg", "-v", "error", "-y", "-i", str(out / "track.wav"), "-t", "4", "-c:a", "libopus",
         "-b:a", "96k", "-f", "mp4", str(out / "track-opus.m4a")])

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        # Song: lyric lines start on their bar's downbeat; the ad-lib on bar 18.
        song = y * 0.45
        placed = []
        for k, (text, bar) in enumerate(zip(LYRICS, LYRIC_BARS)):
            v = say_to(np, text, 190, tmp, f"l{k}")
            t0 = beats[bar * 4]
            add(song, v * 0.9, t0)
            placed.append({"text": text, "start": round(t0, 3), "end": round(t0 + v.size / SR, 3)})
        v = say_to(np, ADLIB, 170, tmp, "adlib")
        add(song, v * 0.9, beats[ADLIB_BAR * 4])
        adlib = {"text": ADLIB, "start": round(beats[ADLIB_BAR * 4], 3),
                 "end": round(beats[ADLIB_BAR * 4] + v.size / SR, 3)}
        write_wav(out / "song.wav", np.clip(song, -0.98, 0.98), SR)

        cues = [(beats[bar * 4], beats[bar * 4] + 0.5, tag) for tag, bar in TAGS]
        for k, ln in enumerate(placed):
            end = ln["end"] + 0.3 if k < len(placed) - 1 else beats[TAGS[-1][1] * 4]   # last cue runs to the outro tag
            cues.append((ln["start"] + 0.08, end, ln["text"]))
        cues.sort()
        srt = "".join(f"{i}\n{srt_time(s)} --> {srt_time(e)}\n{t}\n\n" for i, (s, e, t) in enumerate(cues, 1))
        (out / "song.srt").write_text(srt)
        run(["ffmpeg", "-v", "error", "-y", "-i", str(out / "song.wav"), "-i", str(out / "song.srt"),
             "-map", "0:a", "-map", "1:s", "-c:a", "aac", "-b:a", "192k", "-c:s", "mov_text",
             str(out / "song.m4a")])
        sheet = []
        for tag, bar in TAGS:
            sheet.append(tag)
            sheet += [ln for ln, b in zip(LYRICS, LYRIC_BARS) if bar <= b < bar + 8 and tag != "[Outro]"]
        (out / "song-lyrics.txt").write_text("\n".join(sheet) + "\n")

        # Narration: full and with one sentence cut.
        (out / "script.txt").write_text(SCRIPT)
        write_json(out / "say.json", SAY_MAP)
        spoken = SCRIPT
        for k, v2 in SAY_MAP.items():
            spoken = spoken.replace(k, v2)
        for name, text in (("narration", spoken), ("narration-cut", spoken.replace(CUT_SENTENCE, ""))):
            aiff = tmp / f"{name}.aiff"
            run(["say", "-r", "175", "-o", str(aiff), text.replace("\n\n", " [[slnc 600]] ")])
            run(["ffmpeg", "-v", "error", "-y", "-i", str(aiff), "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le",
                 str(out / f"{name}.wav")])

    sfx = np.zeros(int(SR * 12), dtype=np.float32)
    for t in (2.0, 6.0, 10.0):
        n = rng.standard_normal(int(SR * 0.6)).astype(np.float32)
        env = np.sin(np.linspace(0, np.pi, n.size)) ** 2
        add(sfx, (np.convolve(n, np.ones(24) / 24, mode="same") * env * 0.5).astype(np.float32), t)
    write_wav(out / "sfx.wav", sfx, SR)

    key = {"bpm": a.bpm, "beat_seconds": round(p, 6), "phase": a.phase, "meter": 4, "duration": round(dur, 4),
           "beats": [round(b, 4) for b in beats], "downbeats": [round(b, 4) for b in beats[::4]],
           "silence": {"start": round(sil_start, 4), "end": round(sil_end, 4),
                       "note": "true digital silence in track.wav: last sample of beat 30's click to bar 9"},
           "sections": [{"name": t.strip("[]"), "start": round(beats[b * 4], 4)} for t, b in TAGS],
           "section_change": round(beats[32], 4), "lyric_lines": placed, "adlib": adlib,
           "runaway_cue": LYRICS[-1], "script_cut_sentence": CUT_SENTENCE.strip()}
    write_json(out / "answer-key.json", key)
    print(f"wrote {len(OUTS)} files to {out}: {a.bpm} BPM, silence {sil_start:.3f}-{sil_end:.3f} s, "
          f"section change {beats[32]:.3f} s")
    return 0


if __name__ == "__main__":
    main_guard(main)
