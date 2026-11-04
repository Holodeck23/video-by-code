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
| Repo tour (`transit-map`) | 27.667 seconds, 1080×1920, 30 fps, 830 decoded frames, local Kokoro (`bf_emma`) narration + page sound in voiceover mode, -14.3 LUFS / -1.5 dBTP, 0 safe-box text violations (`80..960, 190..1640`), 0 cut spikes above 10× mean (max 8.9×), local Whisper ASR round-trip verified |
| Example text bounds | All 2270 output frames across worked films scanned; no canvas-bound or critical safe-area violations |
| Style catalog | 86/86 pass structural/API lint; paired-source eight-word overlap checks pass |
| Prompt builder | Default/content/inline/saved variants and unknown/missing-input failures tested |
| Style samples | Eight separate still studies and seek checks; sampled material study, not full films |
| Sharing | Gitleaks working snapshot and all reachable commit history; npm audit; manual content/provenance review |
| Clean reproduction | Fresh ZIP extraction + `npm ci`; 11 documented install, render, verify and prompt/card steps passed |
| Licence | MIT for the kit; adapted MIT code listed with its original notice in `THIRD-PARTY-NOTICES.md` |
| Craft rules | Shared `prompts/briefs/_craft-core.md` included in every assembled prompt; all briefs pass the 8-word overlap check against all 86 source exports, the core also at 6 words |
| Narrated example | Rebuilt as one continuous film; determinism, layout (0 violations over 1080 frames) and the full recipe (14/14 verifier checks, -14.1 LUFS, -1.5 dBTP) pass; mean frame time 13.6 ms |
| Channel SSIM tool | Rewritten with decode-order pairing and per-channel numpy SSIM: lossless 4:4:4 vs source PASS (>= 0.9994 all channels), 4:2:0 on fine saturated detail FAIL (R 0.82), an ffv1 source with a 1 ms time base pairs correctly |
| Public-repo sweep | No personal paths, project/song titles, reference titles or private engine names in tracked files |

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
