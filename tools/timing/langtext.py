"""Language-aware text units shared by word alignment, narration checking and mouth timing.

Why this exists: the first aligner kept only ``[a-z0-9]``, so every Japanese character vanished,
no word ever matched and nothing could fail. One module now decides what "a comparable unit of
speech" is, so alignment, round-trip verification and mouth shapes cannot drift apart.

Spaced languages (en, de, fr, ...): one unit per whitespace token, Unicode-aware, punctuation
dropped. Japanese and Chinese (no spaces): one unit per character; Japanese is folded
katakana -> hiragana and small kana (ゃゅょ ぁぃぅぇぉ) join the preceding kana so a unit is a mora.
If ``pykakasi`` is installed (``uv run --with pykakasi ...``) kanji are read as kana before
comparison, so a script written in kanji matches an ASR transcript written in kana. Without it
comparison is on the written form and ``have_reader()`` is False; report that, do not hide it.

Pure standard library. No file or network access.
"""
from __future__ import annotations

import re
import unicodedata

CJK_LANGS = {"ja", "zh", "yue"}
SMALL_KANA = set("ゃゅょぁぃぅぇぉゎ")

_KAKASI = None
_KAKASI_TRIED = False


def lang_code(lang: str | None) -> str:
    """'en-us' / 'ja_JP' / None -> 'en' / 'ja' / 'en'."""
    if not lang:
        return "en"
    return re.split(r"[-_]", lang.strip().lower())[0] or "en"


def is_cjk(lang: str | None) -> bool:
    return lang_code(lang) in CJK_LANGS


def _reader():
    global _KAKASI, _KAKASI_TRIED
    if not _KAKASI_TRIED:
        _KAKASI_TRIED = True
        try:
            import pykakasi  # type: ignore
            _KAKASI = pykakasi.kakasi()
        except Exception:  # not installed, or its dictionary is unavailable
            _KAKASI = None
    return _KAKASI


def have_reader() -> bool:
    """True when kanji can be read as kana (optional pykakasi)."""
    return _reader() is not None


def _kata_to_hira(text: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in text)


def fold(text: str, lang: str | None = "en") -> str:
    """NFKC, lowercase, curly apostrophes straightened, katakana folded for Japanese."""
    t = unicodedata.normalize("NFKC", text).lower().replace("’", "'")
    return _kata_to_hira(t) if lang_code(lang) == "ja" else t


def _is_word_char(ch: str) -> bool:
    return unicodedata.category(ch)[0] in ("L", "N", "M")


def read_as_kana(text: str) -> str:
    """Hiragana reading of ``text`` when a reader is installed; else the folded text unchanged."""
    k = _reader()
    folded = fold(text, "ja")
    if k is None:
        return folded
    return _kata_to_hira("".join(item["hira"] for item in k.convert(folded)))


def norm_word(word: str, lang: str | None = "en") -> str:
    """Comparable key for one token ('' if it carries no speech, e.g. punctuation only)."""
    t = read_as_kana(word) if lang_code(lang) == "ja" else fold(word, lang)
    return "".join(ch for ch in t if _is_word_char(ch))


def moras(text: str) -> list[str]:
    """Split kana into moras: small ゃゅょぁぃぅぇぉ join the previous kana; ん っ ー stand alone."""
    out: list[str] = []
    for ch in text:
        if not _is_word_char(ch):
            continue
        if ch in SMALL_KANA and out:
            out[-1] += ch
        else:
            out.append(ch)
    return out


def units(text: str, lang: str | None = "en") -> list[str]:
    """Comparable speech units of ``text``: tokens for spaced languages, moras/characters for ja/zh."""
    if is_cjk(lang):
        t = read_as_kana(text) if lang_code(lang) == "ja" else fold(text, lang)
        return moras(t)
    return [k for k in (norm_word(w, lang) for w in text.split()) if k]


def _script(ch: str) -> str:
    code = ord(ch)
    if 0x3040 <= code <= 0x309F:
        return "hira"
    if 0x30A0 <= code <= 0x30FF:
        return "kata"
    if 0x4E00 <= code <= 0x9FFF or 0x3400 <= code <= 0x4DBF:
        return "han"
    return "other"


def display_tokens(text: str, lang: str | None = "en", max_run: int = 8) -> list[str]:
    """Tokens a caption or karaoke line shows and times.

    Spaced languages split on whitespace. Japanese/Chinese split at punctuation and where the
    script changes (kanji / hiragana / katakana / other) and never exceed ``max_run`` characters,
    which approximates phrase pieces without a dictionary."""
    if not is_cjk(lang):
        return [w for w in text.split() if norm_word(w, lang)]
    out: list[str] = []
    cur, cur_script = "", ""
    for ch in unicodedata.normalize("NFKC", text):
        if not _is_word_char(ch):
            if cur:
                out.append(cur)
            cur, cur_script = "", ""
            continue
        sc = _script(ch)
        if cur and (sc != cur_script or len(cur) >= max_run):
            out.append(cur)
            cur = ""
        cur += ch
        cur_script = sc
    if cur:
        out.append(cur)
    return out


def unit_map(text: str, lang: str | None = "en") -> list[dict]:
    """Alignment units of ``text`` with the display token each belongs to:
    ``[{"tok": index, "w": display token, "n": comparable unit}]``. Display tokens with no
    comparable unit are dropped."""
    out = []
    for ti, tok in enumerate(display_tokens(text, lang)):
        for u in units(tok, lang):
            out.append({"tok": ti, "w": tok, "n": u})
    return out


def segment_unit_map(segments: list, lang: str | None = "en") -> list[dict]:
    """Like unit_map, for a cue written as ``[shown, spoken]`` segments (from ``{shown|spoken}``
    markup and pronunciation-dictionary rewrites). A segment whose shown form differs from what is
    spoken becomes ONE display token (``w`` = shown, ``spoken`` = what was said) however many
    words it takes to say; plain segments split into display tokens as usual."""
    out: list[dict] = []
    tok = 0
    for shown, spoken in segments:
        if not shown.strip() or shown == spoken:
            for t in display_tokens(spoken, lang):
                us = units(t, lang)
                out.extend({"tok": tok, "w": t, "n": u} for u in us)
                tok += 1 if us else 0
        else:
            us = units(spoken, lang)
            out.extend({"tok": tok, "w": shown.strip(), "n": u, "spoken": spoken.strip()} for u in us)
            tok += 1 if us else 0
    return out


# ------------------------------------------------------------------ mouth shapes
_ROWS = {
    "a": "あかさたなはまやらわがざだばぱぁゃゎ",
    "i": "いきしちにひみりぎじぢびぴぃ",
    "u": "うくすつぬふむゆるぐずづぶぷぅゅ",
    "e": "えけせてねへめれげぜでべぺぇ",
    "o": "おこそとのほもよろをごぞどぼぽぉょ",
}
_VOWEL = {ch: v for v, chars in _ROWS.items() for ch in chars}
_LIPS_TOGETHER = set("まみむめもばびぶべぼぱぴぷぺぽ")
# Exposure-sheet classes: a open, e wide, o round, c lips together, m mid / unknown.
_VOWEL_CLASS = {"a": "a", "i": "e", "u": "o", "e": "e", "o": "o"}


def mouth_sounds(text: str, lang: str | None = "ja") -> list[tuple[str, float]]:
    """(mouth class, relative duration) per sound for Japanese; one mora is a consonant closure
    (lips-together moras only) followed by its vowel. ん and っ close the mouth; ー holds the
    previous vowel. Kanji with no reader become neutral ``m`` rather than a guess."""
    t = read_as_kana(text)
    out: list[tuple[str, float]] = []
    last = "m"
    for mora in moras(t):
        head = mora[0]
        if head in ("ん", "っ"):
            out.append(("c", 1.0))
            last = "c"
        elif head == "ー":
            out.append((last if last != "c" else "m", 1.0))
        elif head in _VOWEL:
            vowel_char = mora[-1] if mora[-1] in SMALL_KANA and mora[-1] in _VOWEL else head
            cls = _VOWEL_CLASS[_VOWEL[vowel_char]]
            if head in _LIPS_TOGETHER:
                out.append(("c", 0.4))
                out.append((cls, 0.9))
            else:
                out.append((cls, 1.0))
            last = cls
        else:
            out.append(("m", 1.0))
            last = "m"
    return out
