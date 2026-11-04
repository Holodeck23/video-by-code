# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Mechanical verbatim-lift gate for lyrics or scripts written against a reference song/video.

Normalises both texts (strips VTT/SRT cue headers and inline tags, strips [bracket]
production tags, expands common English contractions, lowercases, strips punctuation),
extracts 3/4/5/6-gram sets, ignores n-grams containing >=2 function words, and prints
any overlapping substantive n-grams along with the matching source lines.

Pass condition: zero substantive 3-gram overlap (exit code 0).
Exit code 1 if any substantive 3-gram overlap is found.

Usage:
  python3 tools/verify/check-lift.py REFERENCE.(txt|vtt|srt) CANDIDATE.txt
"""
from __future__ import annotations

import argparse
import html
import re
import sys
from pathlib import Path

CONTRACTIONS: dict[str, str] = {
    "ain't": "am not", "aren't": "are not", "can't": "cannot", "cannot": "can not",
    "could've": "could have", "couldn't": "could not", "didn't": "did not", "doesn't": "does not",
    "don't": "do not", "hadn't": "had not", "hasn't": "has not", "haven't": "have not",
    "he'd": "he would", "he'll": "he will", "he's": "he is", "here's": "here is",
    "i'd": "i would", "i'll": "i will", "i'm": "i am", "i've": "i have",
    "isn't": "is not", "it'd": "it would", "it'll": "it will", "it's": "it is",
    "let's": "let us", "might've": "might have", "must've": "must have", "nobody's": "nobody is",
    "she'd": "she would", "she'll": "she will", "she's": "she is", "should've": "should have",
    "shouldn't": "should not", "somebody's": "somebody is", "that'd": "that would",
    "that'll": "that will", "that's": "that is", "there'd": "there would", "there'll": "there will",
    "there's": "there is", "they'd": "they would", "they'll": "they will", "they're": "they are",
    "they've": "they have", "wasn't": "was not", "we'd": "we would", "we'll": "we will",
    "we're": "we are", "we've": "we have", "weren't": "were not", "what'll": "what will",
    "what're": "what are", "what's": "what is", "what've": "what have", "where's": "where is",
    "who'd": "who would", "who'll": "who will", "who's": "who is", "who've": "who have",
    "won't": "will not", "would've": "would have", "wouldn't": "would not", "you'd": "you would",
    "you'll": "you will", "you're": "you are", "you've": "you have",
}

FUNCTION_WORDS: set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "anyone", "anybody", "anything", "are", "around", "as", "at", "back",
    "be", "because", "been", "before", "being", "below", "between", "both", "but",
    "by", "can", "could", "did", "do", "does", "doing", "done", "down", "during",
    "each", "either", "else", "ever", "every", "everyone", "everybody", "everything",
    "few", "for", "from", "further", "get", "got", "had", "has", "have", "having",
    "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i",
    "if", "in", "into", "is", "it", "its", "itself", "just", "like", "let", "made",
    "make", "many", "may", "me", "might", "mine", "more", "most", "much", "must",
    "my", "myself", "neither", "never", "no", "nobody", "none", "nor", "not",
    "nothing", "now", "of", "off", "on", "once", "one", "only", "onto", "or",
    "other", "others", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "put", "right", "said", "same", "say", "says", "shall", "she", "should", "since",
    "so", "some", "somebody", "someone", "something", "still", "such", "take",
    "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
    "these", "they", "thing", "things", "this", "those", "though", "through", "to",
    "too", "under", "until", "up", "upon", "us", "very", "was", "way", "we", "well",
    "were", "what", "whatever", "when", "where", "whether", "which", "while", "who",
    "whom", "whose", "why", "will", "with", "within", "without", "would", "yet",
    "you", "your", "yours", "yourself", "yourselves",
}


def clean_lines(raw: str) -> list[str]:
    text = html.unescape(raw)
    out: list[str] = []
    seen_consecutive: str | None = None
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")):
            continue
        if re.match(r"^\d+$", s) or "-->" in s:
            continue
        s = re.sub(r"<[^>]+>", "", s)
        s = re.sub(r"\[[^\]]*\]", " ", s)
        s = re.sub(r"^>+\s*", "", s)
        s = " ".join(s.split())
        if not s or s == seen_consecutive:
            continue
        seen_consecutive = s
        out.append(s)
    return out


def normalise_tokens(line: str) -> list[str]:
    s = line.lower().replace("’", "'").replace("‘", "'")
    for k, v in CONTRACTIONS.items():
        s = re.sub(rf"\b{re.escape(k)}\b", v, s)
    s = re.sub(r"'s\b", " is", s)
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return [tok for tok in s.split() if tok]


def extract_ngrams(lines: list[str], n: int) -> dict[tuple[str, ...], list[str]]:
    table: dict[tuple[str, ...], list[str]] = {}
    all_tokens: list[tuple[str, str]] = []
    for ln in lines:
        for tok in normalise_tokens(ln):
            all_tokens.append((tok, ln))
    for i in range(len(all_tokens) - n + 1):
        gram = tuple(all_tokens[i + j][0] for j in range(n))
        if sum(1 for w in gram if w in FUNCTION_WORDS) >= 2:
            continue
        src_line = all_tokens[i][1]
        bucket = table.setdefault(gram, [])
        if src_line not in bucket:
            bucket.append(src_line)
    return table


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("reference", type=Path, help="Reference lyrics/transcript (.txt, .vtt, .srt)")
    ap.add_argument("candidate", type=Path, help="Candidate lyrics/script file (.txt)")
    args = ap.parse_args()

    ref_lines = clean_lines(args.reference.read_text(encoding="utf-8"))
    cand_lines = clean_lines(args.candidate.read_text(encoding="utf-8"))

    any_3gram_overlap = False
    for n in (3, 4, 5, 6):
        ref_grams = extract_ngrams(ref_lines, n)
        cand_grams = extract_ngrams(cand_lines, n)
        overlap = sorted(set(ref_grams).intersection(cand_grams))
        print(f"=== {n}-gram substantive overlaps: {len(overlap)} ===")
        for gram in overlap:
            print(f"  [{' '.join(gram)}]")
            print(f"    ref : {ref_grams[gram][0]}")
            print(f"    cand: {cand_grams[gram][0]}")
        if n == 3 and overlap:
            any_3gram_overlap = True

    if any_3gram_overlap:
        print("\nFAIL: substantive 3-gram overlap detected against reference.", file=sys.stderr)
        return 1
    print("\nPASS: zero substantive 3-gram overlap.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
