# Rebuild contracts — phase 0

Status: provisional until the three-look pilot passes human review. Baseline: `c769166ac67fab4e50ca6389a1786cd6595c2264`. Branch: `one-colour`. Existing examples, tools and regression cases remain intact.

## Ownership and freshness

Source files: `brief.md`, `script.md`, `storyboard.txt` plus selected media. Production media/renders live in the production home outside the checkout. Bundles use portable relative asset paths. The future CLI requires an explicit production directory and must not silently create media inside the repo.

Build order: script parse → voice/music → words → mouth → cues → bundle → preview/render → check. Each stage writes its own product. Only the assembler calls `publishBundle` to atomically replace a validated snapshot. Failed stages cannot publish partial updates. Rendering must refuse stale fingerprints. Same-production builds must serialize in the pilot implementation.

Cache fingerprints include input content hashes, language, pronunciation dictionary, provider/model identity, synthesis settings and tool version; output names/timestamps are not cache keys. Paragraph IDs remain stable when other paragraphs are inserted. A reroll regenerates only that paragraph's synthesis but invalidates every downstream timing product affected by changed duration/content. Test changed duration, stale words/mouth/cues/captions and reuse of unaffected audio.

## Film, cues and languages

Version-1 bundle schema covers dimensions/fps/duration, resolved look, timed beats/words, mouth exposure, music grid/features, captions, tracks and score events. Beat content and resolved look parameters are deliberately extensible until their type-specific pilot contracts are proven. Schemas are provisional, not frozen production APIs.

Parse `{shown|spoken}` once and retain display text, spoken text and language-specific readings throughout the pipeline. Japanese needs shared segmentation/readings for alignment and narration checking plus kana/mora mouth mappings. Zero comparable narration tokens fails. Wrong Japanese speech must fail and correct speech must pass real round-trip fixtures. Pass language to every backend; reject unsupported provider/language combinations. Other-language fit is capped at 1.25×; longer takes fail with paragraph ID, shorter takes pad to the master timeline.

Phrase cues search forward, choosing the earliest remaining occurrence. `@ phrase #N` explicitly selects the Nth occurrence in the complete script and cannot move backwards. Ties or missing matches stop with candidates/timestamps and storyboard line/block. Music anchors use 1-based beat/bar indices (bars from validated downbeats) and unique section names. Missing or ambiguous anchors stop. Time ranges are start-inclusive/end-exclusive. Export samples frame n at n/fps.

## Layer and renderer contracts

Ten slots: palette, ground, marks, type, composition, progression, motion, transitions, finish, host. Each option declares requires/provides. A look locks identity slots and whitelists supported overrides. Resolve the complete selected composition; reject unsupported/locked changes and missing capabilities with reasons. Never silently substitute an identity layer.

Pilot interface: `createStage({canvas,bundle,assets})` returns `{ready,renderFrame(t),dispose()}`. Instances own state/caches so menu tiles cannot affect one another. Ready awaits fonts, media, features, textures and shaders. Frames are synchronous and pure in absolute time/seed, including out-of-order seeks. Canvas2D and shader adapters share this lifecycle. Existing page globals wrap one instance for renderer compatibility; they are not the multi-tile API. Dispose releases GPU resources.

Bundle tracks declare asset hashes, language, offsets and gains. Preview and export consume the same declarations and procedural score. Audio leads the playback clock; seek/resume/loop reschedules external and procedural sound. Pilot checks an offset, mid-film seek and range export. Hosted sound starts after explicit user interaction under normal browser policy.

## Scope, approval and migration

The manifest starts with the actual 86 cards, all unbuilt specifications. Other source groups remain explicitly unresolved and block release. Complete deduplication before the phase-3 estimate: compare identities, retain aliases, and never merge solely by name. David approves the final launch set; later exclusions require an explicit scope decision.

Approval fingerprints cover engine, selected layers, fonts/assets, card, storyboard and audio. Evidence records reviewer/date and moving clips with sound in both aspects. Dependency changes invalidate affected approvals. Release rejects empty/provisional scope, unresolved sources, missing evidence and stale fingerprints. Compute current fingerprints from actual files, not approval records. Run machine checks against the exact release candidate.

Minimum `vbc new/make` belongs in the pilot. Mock providers cover deterministic failures; real default Kokoro covers the actual end-to-end route. Clean install means fresh archive, empty app/model caches, documented provisioning and a default-provider film through `vbc check` on a named supported setup. Keys stay in local environment inputs. No paid calls are needed for phase 0.

Keep existing positive and negative browser/encode regressions during migration. Replace old paths only after pilot replacements pass; the baseline stays recoverable in Git. Phase 5 exercises hosted Pages subpaths with normal browser policy: assets, click-to-sound, seek/loop and both aspects. Exact frame comparisons pin browser/fonts/rendering backend. Hash agreement is distinct from fidelity review.

## Built for expansion (plugin registry)

Every addable kind (`look`, `layer`, `beat`, `format`, `anchor`, `provider`, `analyser`, `finish`) is a self-contained folder under `plugins/<kind>/<id>/` with `plugin.json` (`schemas/plugin.schema.json`), implementation code (`index.js`), content schema (`schema.json`), demo storyboard (`storyboard.txt`), card (`README.md`) and unit test (`plugin.test.mjs`). Registry discovery (`lib/registry.mjs`) automatically extends schema enums (`bundle`, `cue`, `layer`, `renderer`) and validates `ext.<pluginId>` bundle namespaces against registered `analyser` plugin schemas.

Capabilities (`requires`/`provides`) are validated against `schemas/capabilities.json` via `vbc lint`. Plugins with `"lane": "lab"` and `"launch": false` never block `releaseErrors()`. Scoped approval fingerprints (`scopedLookFingerprint`) cover only the engine and layer files a look uses, and `evaluateApprovalCarryOver` carries over approvals when re-rendered frames are pixel-identical in the pinned environment. `migrate(kind, doc, targetVersion)` upgrades older schema documents. `vbc add <kind> <id>` scaffolds a complete passing plugin folder.

## Verification and next step

Run `npm test`, `node bin/vbc.mjs lint`, `node bin/vbc.mjs plugin list`, `node bin/vbc.mjs add <kind> <id>`, `node bin/vbc.mjs validate bundle|cue|layer|renderer|manifest|plugin <file>`, and `node bin/vbc.mjs --help`. Root CLI has no dependencies or global installation. The small schema evaluator supports only the declared keywords used here (`schemas/{bundle,cue,layer,renderer,manifest,plugin}.schema.json`) and rejects unknown keywords; it is not a general JSON Schema engine.

Next: stage lifecycle, minimum production CLI, resolver, three pilot looks and four host variants for David's pick. Human viewing/signoff precedes interface freeze and catalogue work. Japanese text handling now lives in `tools/timing/langtext.py` (one definition of a comparable unit for alignment, narration checking and mouth timing; `--lang` on `align-words.py`, `verify-narration.py`, `mouth-track.py`); the aligner's transcript cache is keyed on audio, backend, model, language and prompt. `tests/roundtrip-ja.py` runs real correct/wrong Japanese speech (macOS `say` + whisper-cli). Kanji are compared as written unless the optional `pykakasi` reader is installed. The pilot's remaining bug work: paragraph-level voice cache and `--redo N`, and the 1.25× multilingual fit.
