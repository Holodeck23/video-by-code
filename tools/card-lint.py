#!/usr/bin/env python3
"""Lint style cards in prompts/styles/ against prompts/STYLE-CARD-TEMPLATE.md and lib/API.md.

Checks: frontmatter keys, required sections in order, length 90-200 lines, palette table has
hex values, only kit API names used (H.* and SOUND presets), legibility sizes stated.
Usage: python3 tools/card-lint.py [CARD.md ...]   (no args = every card)
Exit 0 = all pass, 1 = any failure.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECTIONS = ["Palette", "Ground and surface", "Mark-making", "Type and numbers",
            "Diagrams: arrows, labels, charts", "Motion", "Scene changes",
            "Finishing passes", "Sound palette", "Signature moves", "Pitfalls", "Hero frame recipe"]
KEYS = ["id", "name", "family", "fonts", "best_for", "avoid_for"]
H_API = {"rng", "noise", "clamp", "lerp", "invLerp", "remap", "smoothstep", "prog", "ease", "shake",
         "hex", "rgba", "mixRGB", "offscreen", "paperTexture", "grain", "vignette", "bezier",
         "resample", "pathLength", "partial", "wobble", "strokePath", "loadFonts", "fitFont", "typeOn"}
PRESETS = set("tock pop thud ding bell impact slap click tick key press stamp paper tape roller success "
              "error buzz count blip select coin powerup sparkle glitch neon whoosh swish riser stroke "
              "pencil chalk erase typing".split())
K_METHODS = {"play", "tone", "noise", "bed", "music", "minor"}


def lint(path: Path) -> list[str]:
    text = path.read_text()
    lines = text.splitlines()
    errs: list[str] = []
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return ["missing frontmatter"]
    fm = dict(re.findall(r"^(\w+):\s*(.+)$", m.group(1), re.M))
    errs += [f"frontmatter missing '{k}'" for k in KEYS if k not in fm]
    if fm.get("id") and fm["id"] != path.stem:
        errs.append(f"id '{fm['id']}' != filename '{path.stem}'")
    heads = [h.strip() for h in re.findall(r"^## (.+)$", text, re.M)]
    pos = -1
    for s in SECTIONS:
        hit = next((i for i, h in enumerate(heads) if h.startswith(s)), None)
        if hit is None:
            errs.append(f"missing section '## {s}'")
        elif hit < pos:
            errs.append(f"section '## {s}' out of order")
        else:
            pos = hit
    if not 90 <= len(lines) <= 200:
        errs.append(f"length {len(lines)} lines (want 90-200)")
    pal = text.split("## Palette", 1)[-1].split("\n## ", 1)[0]
    if len(re.findall(r"#[0-9a-fA-F]{6}\b", pal)) < 3:
        errs.append("palette has fewer than 3 hex colours")
    for name in set(re.findall(r"\bH\.(\w+)", text)) - H_API:
        errs.append(f"unknown helper H.{name}")
    for name in set(re.findall(r"k\.play\(\s*'(\w+)'", text)) - PRESETS:
        errs.append(f"unknown sound preset '{name}'")
    for name in set(re.findall(r"\bk\.(\w+)\(", text)) - K_METHODS:
        errs.append(f"unknown kit method k.{name}")
    if not re.search(r"\b(6[6-9]|[7-9]\d|1\d\d)\s?px", text):
        errs.append("no headline size >= 66px stated")
    return errs


def main() -> int:
    cards = [Path(a) for a in sys.argv[1:]] or sorted((ROOT / "prompts/styles").glob("*.md"))
    cards = [c for c in cards if c.name != "INDEX.md"]
    bad = 0
    for c in cards:
        errs = lint(c)
        if errs:
            bad += 1
            print(f"FAIL {c.name}")
            for e in errs:
                print(f"  - {e}")
    print(f"{len(cards) - bad}/{len(cards)} cards pass")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
