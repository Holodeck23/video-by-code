# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Pin down exactly which audio file a video is built on.

Usage:
  uv run tools/timing/audio-identity.py AUDIO OUTDIR [--rate 48000] [--force]

Writes into OUTDIR:
  identity.json   sha256, byte size, ffprobe JSON, codec facts, warnings, analysis-copy hash
  analysis.wav    48 kHz stereo 16-bit PCM copy of the first audio stream (every other tool
                  can read it; decoding once keeps the analysis reproducible)

Warnings (printed and stored, exit stays 0):
  - an .m4a/.mp4 whose audio is Opus (some exporters do this; many players and MP4 muxers
    expect AAC, so re-encode before muxing into a final .mp4)
  - a subtitle stream is present (run embedded-lyrics.py on it)
  - sample rate below 44.1 kHz, or a mono source

Needs ffmpeg and ffprobe. Exit 1 on a missing file, an undecodable file or no audio stream.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import ToolError, ffprobe, guard_outputs, main_guard, need, need_file, run, sha256, write_json  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio", type=Path)
    ap.add_argument("outdir", type=Path)
    ap.add_argument("--rate", type=int, default=48000, help="analysis copy sample rate (default 48000)")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    need("ffmpeg", "ffprobe")
    src = need_file(a.audio, "audio")
    outs = [a.outdir / "identity.json", a.outdir / "analysis.wav"]
    guard_outputs(outs, a.force)

    probe = ffprobe(src)
    streams = probe.get("streams", [])
    audio = [s for s in streams if s.get("codec_type") == "audio"]
    subs = [s for s in streams if s.get("codec_type") == "subtitle"]
    if not audio:
        raise ToolError(f"no audio stream in {src}")
    st = audio[0]
    fmt = probe.get("format", {})
    codec = st.get("codec_name", "?")
    facts = {
        "container": fmt.get("format_name"),
        "codec": codec,
        "profile": st.get("profile"),
        "sample_rate": int(st.get("sample_rate", 0) or 0),
        "channels": st.get("channels"),
        "channel_layout": st.get("channel_layout"),
        "bit_rate": int(st.get("bit_rate") or fmt.get("bit_rate") or 0) or None,
        "duration": float(st.get("duration") or fmt.get("duration") or 0),
        "audio_streams": len(audio),
        "subtitle_streams": [{"index": s["index"], "codec": s.get("codec_name"),
                              "language": s.get("tags", {}).get("language")} for s in subs],
    }
    warnings = []
    if src.suffix.lower() in (".m4a", ".mp4", ".m4v", ".mov") and codec == "opus":
        warnings.append(f"{src.suffix} file carries Opus audio, not AAC: re-encode "
                        "(ffmpeg -i IN -c:a aac -b:a 256k OUT.m4a) before muxing into a final .mp4")
    if subs:
        warnings.append(f"{len(subs)} subtitle stream(s) present ({', '.join(str(s.get('codec_name')) for s in subs)}): "
                        "run embedded-lyrics.py for line cues")
    if facts["sample_rate"] and facts["sample_rate"] < 44100:
        warnings.append(f"sample rate {facts['sample_rate']} Hz is below 44.1 kHz")
    if facts["channels"] == 1:
        warnings.append("mono source: the analysis copy duplicates it to both channels")
    if len(audio) > 1:
        warnings.append(f"{len(audio)} audio streams: only the first is analysed")

    a.outdir.mkdir(parents=True, exist_ok=True)
    wav = a.outdir / "analysis.wav"
    run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-map", "0:a:0", "-ac", "2", "-ar", str(a.rate),
         "-c:a", "pcm_s16le", str(wav)])
    wprobe = ffprobe(wav)
    ident = {
        "file": src.name,
        "bytes": src.stat().st_size,
        "sha256": sha256(src),
        "codec_facts": facts,
        "warnings": warnings,
        "analysis_copy": {"file": wav.name, "sha256": sha256(wav), "sample_rate": a.rate, "channels": 2,
                          "codec": "pcm_s16le", "duration": float(wprobe["format"]["duration"])},
        "ffprobe": probe,
    }
    write_json(a.outdir / "identity.json", ident)
    print(f"{src.name}: {codec} {facts['sample_rate']} Hz x{facts['channels']}, {facts['duration']:.3f} s, "
          f"sha256 {ident['sha256'][:16]}...")
    for w in warnings:
        print(f"warning: {w}")
    print(f"wrote {outs[0]} and {outs[1]}")
    return 0


if __name__ == "__main__":
    main_guard(main)
