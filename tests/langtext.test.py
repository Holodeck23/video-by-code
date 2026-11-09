#!/usr/bin/env python3
"""Unit tests for tools/timing/langtext.py and the language-aware tools. Standard library only.
Run: python3 tests/langtext.test.py"""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools" / "timing"))
import langtext as L  # noqa: E402


def load(name, rel):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class Units(unittest.TestCase):
    def test_english_unchanged(self):
        self.assertEqual(L.units("Don't stop, believing!", "en"), ["dont", "stop", "believing"])
        self.assertEqual(L.norm_word("’Tis", "en"), "tis")

    def test_accented_latin_is_kept(self):
        self.assertEqual(L.units("Über café", "de"), ["über", "café"])

    def test_japanese_is_not_empty(self):
        u = L.units("こんにちは、世界。", "ja-JP")
        self.assertTrue(u)
        self.assertEqual("".join(u), "こんにちは世界" if not L.have_reader() else "".join(u))

    def test_katakana_folds_to_hiragana(self):
        self.assertEqual(L.units("コーヒー", "ja"), L.units("こーひー", "ja"))

    def test_small_kana_join_previous_mora(self):
        self.assertEqual(L.moras("きょうは"), ["きょ", "う", "は"])
        self.assertEqual(L.moras("がっこう"), ["が", "っ", "こ", "う"])

    def test_punctuation_only_has_no_units(self):
        self.assertEqual(L.units("…！？ 、。", "ja"), [])
        self.assertEqual(L.units("... ?!", "en"), [])

    def test_display_tokens_split_on_script_change(self):
        self.assertEqual(L.display_tokens("私は猫です。", "ja"), ["私", "は", "猫", "です"])

    def test_unit_map_groups_back_to_tokens(self):
        m = L.unit_map("私は猫です", "ja")
        self.assertEqual([x["tok"] for x in m][:2], [0, 1])
        self.assertEqual({x["w"] for x in m}, {"私", "は", "猫", "です"})

    def test_segment_unit_map_keeps_shown_and_spoken_together(self):
        segs = [["Welcome to", "Welcome to"], ["Q3", "quarter three"], ["at", "at"], ["3:07", "three oh seven"]]
        mapped = L.segment_unit_map(segs, "en")
        aw = load("align_words", "tools/timing/align-words.py")
        for i, u in enumerate(mapped):
            u["start"] = round(i * 0.2, 2)
            u["end"] = round((i + 1) * 0.2, 2)
            u["src"] = "asr"
        grouped = aw.group_units(mapped)
        self.assertEqual([g["w"] for g in grouped], ["Welcome", "to", "Q3", "at", "3:07"])
        self.assertEqual(grouped[2]["spoken"], "quarter three")
        self.assertEqual(grouped[2]["start"], 0.4)
        self.assertEqual(grouped[2]["end"], 0.8)
        self.assertEqual(grouped[4]["spoken"], "three oh seven")
        self.assertEqual(grouped[4]["start"], 1.0)
        self.assertEqual(grouped[4]["end"], 1.6)


class Mouth(unittest.TestCase):
    def test_labials_close_then_open(self):
        self.assertEqual([c for c, _ in L.mouth_sounds("まあ", "ja")], ["c", "a", "a"])

    def test_n_and_sokuon_close_and_long_vowel_holds(self):
        self.assertEqual([c for c, _ in L.mouth_sounds("かん", "ja")], ["a", "c"])
        self.assertEqual([c for c, _ in L.mouth_sounds("かーっ", "ja")], ["a", "a", "c"])

    def test_vowel_classes(self):
        self.assertEqual([c for c, _ in L.mouth_sounds("いうえお", "ja")], ["e", "o", "e", "o"])

    def test_compound_uses_small_kana_vowel(self):
        self.assertEqual([c for c, _ in L.mouth_sounds("きゃ", "ja")], ["a"])


class Tools(unittest.TestCase):
    def test_mouth_track_sounds_use_moras_for_japanese(self):
        mt = load("mouth_track", "tools/timing/mouth-track.py")
        out = mt.sounds([{"text": "まあ", "start": 0.0, "end": 1.0}], "ja")
        self.assertEqual([c for c, _, _ in out], ["c", "a", "a"])
        self.assertAlmostEqual(out[-1][2], 1.0)
        en = mt.sounds([{"text": "mia", "start": 0.0, "end": 0.3}], "en")
        self.assertEqual([c for c, _, _ in en], ["c", "a", "a"])

    def test_aligner_group_units_and_cache_key(self):
        aw = load("align_words", "tools/timing/align-words.py")
        units = [
            {"tok": 0, "w": "きょう", "n": "きょ", "start": 0.0, "end": 0.2, "src": "asr"},
            {"tok": 0, "w": "きょう", "n": "う", "start": 0.2, "end": 0.4, "src": "interp"},
            {"tok": 1, "w": "は", "n": "は", "start": 0.4, "end": 0.6, "src": "interp"},
        ]
        words = aw.group_units(units)
        self.assertEqual([(w["w"], w["start"], w["end"], w["src"]) for w in words],
                         [("きょう", 0.0, 0.4, "asr"), ("は", 0.4, 0.6, "interp")])
        self.assertNotEqual(aw.fingerprint({"a": 1, "lang": "en"}), aw.fingerprint({"a": 1, "lang": "ja"}))

    def test_transcript_cache_is_invalidated_by_audio_language_and_prompt(self):
        aw = load("align_words", "tools/timing/align-words.py")
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            audio, cache = d / "a.wav", d / "w.raw.json"
            audio.write_bytes(b"one")
            calls = []
            aw.subprocess.run = lambda *a, **k: calls.append(a) or (_ for _ in ()).throw(
                aw.ToolError("would transcribe"))
            key = aw.fingerprint({"audio": aw._file_hash(audio), "backend": "whisper-cli", "model": "m",
                                  "lang": "en", "prompt": "p"})
            cache.write_text(json.dumps({"fingerprint": key, "heard": [{"w": "x", "n": "x", "start": 0, "end": 1}]}))
            self.assertEqual(aw.transcribe_words(audio, "whisper-cli", "m", "p", cache, "en")[0]["n"], "x")
            for change in ({"lang": "ja"}, {"prompt": "q"}):
                with self.assertRaises(aw.ToolError):
                    aw.transcribe_words(audio, "whisper-cli", "m", change.get("prompt", "p"), cache,
                                        change.get("lang", "en"))
            audio.write_bytes(b"two")
            with self.assertRaises(aw.ToolError):
                aw.transcribe_words(audio, "whisper-cli", "m", "p", cache, "en")
            cache.write_text(json.dumps([{"w": "legacy", "n": "legacy", "start": 0, "end": 1}]))
            with self.assertRaises(aw.ToolError):
                aw.transcribe_words(audio, "whisper-cli", "m", "p", cache, "en")

    def test_common_sentence_split_japanese(self):
        common = load("_common", "tools/timing/_common.py")
        parts = common.split_sentences("今日は晴れです。明日は雨でしょう。", min_words=4, lang="ja")
        self.assertEqual(len(parts), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
