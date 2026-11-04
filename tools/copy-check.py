#!/usr/bin/env python3
"""Copy check: find long word runs shared between a candidate text and a source text.

Used to prove a rewritten prompt or style card is original wording, not a paste.
Both texts are lowercased and reduced to word tokens (letters, digits, apostrophes).
Any run of --min (default 8) consecutive tokens that appears in both fails the check.

Usage:
  python3 tools/copy-check.py SOURCE.txt CANDIDATE.md [--min 8]
Exit 0 = pass (no shared run), 1 = fail (runs printed), 2 = usage error.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

TOKEN = re.compile(r"[a-z0-9']+")


def tokens(text: str) -> list[str]:
    return TOKEN.findall(text.lower())


def shared_runs(src: list[str], cand: list[str], n: int) -> list[str]:
    grams = {tuple(src[i:i + n]) for i in range(len(src) - n + 1)}
    hits: list[str] = []
    i = 0
    while i <= len(cand) - n:
        if tuple(cand[i:i + n]) in grams:
            j = i + n  # extend the run as far as it keeps matching
            while j < len(cand) and tuple(cand[j - n + 1:j + 1]) in grams:
                j += 1
            hits.append(" ".join(cand[i:j]))
            i = j
        else:
            i += 1
    return hits


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", type=Path)
    ap.add_argument("candidate", type=Path)
    ap.add_argument("--min", type=int, default=8, help="shortest shared run that fails (words)")
    a = ap.parse_args()
    if not a.source.is_file() or not a.candidate.is_file():
        print("source and candidate must be files", file=sys.stderr)
        return 2
    hits = shared_runs(tokens(a.source.read_text(errors="ignore")), tokens(a.candidate.read_text(errors="ignore")), a.min)
    if not hits:
        print(f"PASS: no shared run of {a.min}+ words")
        return 0
    print(f"FAIL: {len(hits)} shared run(s) of {a.min}+ words")
    for h in hits:
        print(f"  - {h}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
