# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Pull line cues out of a subtitle stream embedded in an audio file.

Usage:
  uv run tools/timing/embedded-lyrics.py AUDIO OUT.json [--stream N] [--force]

Many AI-music exports (.m4a) carry the lyric sheet as a mov_text subtitle stream: one cue
per sung line plus cues that are only section tags such as "[Chorus]". This tool splits
them apart:
  sections  [{name, start, end}]            cues whose whole text is a [bracket] tag
  cues      [{i, start, end, text, flags}]  sung lines (a leading "[Tag] text" is split)

Cue times are what the exporter wrote, not a measurement. They are often late, and cue ends
often run across an instrumental break. Every cue carries verified=false; use
manual listening or an external aligner to time the words against the audio. Flags raised per cue:
  runaway          longer than 2 x the time the line needs to be sung (max(1.6 s, 0.072 s per
                   character)) and over 3 s: the cue window spans a break. mov_text cues cannot
                   overlap, so a runaway cue usually ends exactly where the next tag or cue starts
  crosses-section  the cue ends after a later section tag starts (possible in sidecar SRTs)
  overlaps-next    the cue ends after the next cue starts
  long             longer than max(7 s, 0.45 s per word)
  short            shorter than 0.5 s

No subtitle stream: OUT.json is still written with found=false and empty lists (exit 0).
Exit 1 on a missing or unreadable file. Needs ffmpeg and ffprobe.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import ToolError, ffprobe, guard_outputs, main_guard, need, need_file, run, sha256, write_json  # noqa: E402

TAG = re.compile(r"^\s*\[([^\]]+)\]\s*")


def seconds(v: str) -> float:
    h, m, s = v.strip().replace(",", ".").split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def parse_srt(srt: str) -> list[tuple[float, float, str]]:
    out = []
    for block in re.split(r"\n\s*\n", srt.strip()):
        lines = [ln for ln in block.splitlines() if ln.strip()]
        k = next((i for i, ln in enumerate(lines) if " --> " in ln), None)
        if k is None:
            continue
        a, b = lines[k].split(" --> ")
        text = " ".join(re.sub(r"<[^>]+>", "", ln).strip() for ln in lines[k + 1:]).strip()
        out.append((seconds(a), seconds(b.split()[0]), text))
    return sorted(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--stream", type=int, help="subtitle stream index (default: the first subtitle stream)")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    need("ffmpeg", "ffprobe")
    src = need_file(a.audio, "audio")
    guard_outputs([a.out], a.force)

    probe = ffprobe(src)
    subs = [s for s in probe.get("streams", []) if s.get("codec_type") == "subtitle"]
    if a.stream is not None:
        subs = [s for s in subs if s["index"] == a.stream]
        if not subs:
            raise ToolError(f"stream {a.stream} is not a subtitle stream in {src}")
    result = {"file": src.name, "sha256": sha256(src), "duration": float(probe["format"].get("duration", 0)),
              "found": bool(subs), "verified": False,
              "accuracy": "unverified: times are the exporter's cue times, not measured against the audio",
              "stream": None, "sections": [], "cues": []}
    if not subs:
        write_json(a.out, result)
        print(f"no subtitle stream in {src.name}; wrote empty {a.out}")
        return 0

    st = subs[0]
    result["stream"] = {"index": st["index"], "codec": st.get("codec_name")}
    srt = run(["ffmpeg", "-v", "error", "-i", str(src), "-map", f"0:{st['index']}", "-f", "srt", "-"]).stdout
    sections, cues = [], []
    for s, e, text in parse_srt(srt):
        m = TAG.match(text)
        if m:
            sections.append({"name": m.group(1).strip(), "start": round(s, 3)})
            text = text[m.end():].strip()
        if text and e > s:
            cues.append({"i": len(cues), "start": round(s, 3), "end": round(e, 3), "text": text,
                         "verified": False, "flags": []})
    for k, sec in enumerate(sections):
        sec["end"] = sections[k + 1]["start"] if k + 1 < len(sections) else round(result["duration"], 3)

    for k, c in enumerate(cues):
        nwords = len(c["text"].split())
        dur = c["end"] - c["start"]
        need_s = max(1.6, 0.072 * len(c["text"]))
        if dur > 2 * need_s and dur > 3.0:
            nxt = min([x["start"] for x in sections + cues if x["start"] >= c["end"] - 0.02] or [None],
                      key=lambda v: 1e9 if v is None else v)
            tail = f", ends where the next cue/tag starts ({nxt:.2f} s)" if nxt is not None and \
                abs(nxt - c["end"]) <= 0.02 else ""
            c["flags"].append(f"runaway: {dur:.2f} s window for a line that needs about {need_s:.1f} s{tail}")
        later = [sec for sec in sections if c["start"] < sec["start"] < c["end"]]
        if later:
            c["flags"].append(f"crosses-section: ends {c['end']:.2f} s, after [{later[0]['name']}] "
                              f"at {later[0]['start']:.2f} s")
        if k + 1 < len(cues) and c["end"] > cues[k + 1]["start"]:
            c["flags"].append(f"overlaps-next: ends {c['end'] - cues[k + 1]['start']:.2f} s after the next cue starts")
        if dur > max(7.0, 0.45 * nwords):
            c["flags"].append(f"long: {dur:.2f} s for {nwords} words")
        if dur < 0.5:
            c["flags"].append(f"short: {dur:.2f} s")
    result["sections"], result["cues"] = sections, cues
    write_json(a.out, result)

    flagged = [c for c in cues if c["flags"]]
    print(f"{len(cues)} line cues, {len(sections)} section tags, {len(flagged)} flagged; wrote {a.out}")
    for c in flagged:
        print(f"  {c['start']:8.2f} {c['text'][:40]!r}: " + "; ".join(c["flags"]))
    print("Cue times are unverified. Align and listen-check the words before they drive the edit.")
    return 0


if __name__ == "__main__":
    main_guard(main)
