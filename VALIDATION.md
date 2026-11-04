# Validation scope — 2026-11-04

The kit contains 11 tutorial chapters, four recipes, an agent/team runbook, production
templates, five prompt briefs and 86 style specifications. The chapters explain both
human judgment and executable agent work. They do not imply every advanced engine or
alignment pipeline discussed is supplied by this repository.

## Checks obtained

| Area | Evidence obtained |
|---|---|
| Runtime regression | 15/15 positive/negative browser, encode and verification cases passed |
| Graphics | Starter and both worked films pass repeated out-of-order frame hashing |
| Audio | Seeded offline waveform repeats within 1e-6 native-float tolerance; voiceover suppresses beds/music |
| Timing | Known 123 BPM fixture measured 123.0164 BPM, 5.61 ms fitted RMS residual; wrong downbeat phase rejected |
| Embedded cues | Four line cues/three tags extracted; known runaway cue flagged; no-cue input reported honestly |
| Audio identity | Hash/copy/probe verified; deliberate Opus-in-M4A warning exercised |
| Explainer | 36.000 seconds, 1920×1080, 30 fps, 1080 decoded frames, exact-length AAC, limited-range BT.709, clean decode |
| Vertical short | 12.000 seconds, 1080×1920, 30 fps, 360 decoded frames, exact-length AAC, limited-range BT.709, clean decode |
| Example text bounds | All 1440 output frames scanned; 14512 text draws with no canvas-bound violations |
| Style catalog | 86/86 pass structural/API lint; paired-source eight-word overlap checks pass |
| Prompt builder | Default/content/inline/saved variants and unknown/missing-input failures tested |
| Style samples | Eight separate still studies and seek checks; sampled material study, not full films |
| Sharing | Gitleaks working snapshot and all reachable commit history; npm audit; manual content/provenance review |

The complete private evidence set is kept in the production home outside this repo.
The shared kit includes reproducible test scripts and this concise result record, not
the owner's original project/chat exports, reference posters or source-media archive.

## Reviewed warnings and limits

The explainer's freeze detector flags designed reading holds and small changes beneath
its whole-frame threshold. The vertical short's sparse sound effects measure -31.5 LUFS;
this is an effects-only fixture, not a continuous narration mix. Its true peak is
-12.6 dBTP. The narrated explainer measures -14.1 LUFS and -2.1 dBTP. Neither loudness
number is a mandatory destination-platform specification.

The examples are functional teaching films. Sampled encoded contact sheets were viewed;
that is not a full motion or listening review. The local system voice is a disposable
fixture and has not been approved as a production narrator. Caption ink-bound tests do
not establish contrast, overlapping geometry, editorial clarity or platform UI safety.

Only eight styles have diagnostic implementations in `examples/styles/`. They use system
font substitutions and simplified geometry, so they do not establish parity with the
reference posters. The other 78 cards have structural/wording checks, without individual
visual proofs. No individual style has a human production-quality approval in this kit.

The neon study caches its static blur/reflection plate, then evaluates time-dependent
grain separately. Native canvas shadow rasterisation showed small seek-order differences
when redrawn; caching the static material removes that source of history dependence.
No pixel-identical cross-machine, cross-font, browser-version or GPU claim is made.

The kit's executable baseline is Canvas2D and Web Audio. Three.js, Blender, advanced
WebGL streaming, ASR, forced alignment, stem separation and production TTS are described
techniques/external integrations. The supplied beat estimate needs listening validation;
one synthetic track does not establish accuracy across genres. `build-visualizer.py`
provides a basic measured energy envelope, not semantic audio understanding.

## Reproduce

Install the pinned starter dependencies and follow the README. Then:

```sh
node tests/runtime-contract.mjs
node tests/layout.mjs
python3 tests/smoke.py /absolute/path/to/runtime-evidence
python3 tools/card-lint.py
```

Use the narrated and vertical recipes for complete outputs. A clean export/install
walkthrough is recorded alongside the production evidence. This confirms the documented
baseline in the tested macOS/Chrome environment; other platforms require their own smoke
test. Creative approval belongs to the receiving human team.
