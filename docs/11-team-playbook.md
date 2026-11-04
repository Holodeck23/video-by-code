# 11. Run a human–agent production

Video work combines decisions with different kinds of evidence. The director owns the
meaning and look. Timing work owns measured events. Scene authors own pure drawing.
The renderer owns files. QA owns repeatability and observed defects. One person can
hold several roles, but each responsibility still needs an owner.

## One production contract

Before parallel scene work, freeze these fields in a brief and timeline:

| Contract | Required decision |
|---|---|
| Communication | Who watches, what they should understand, what the ending resolves |
| Delivery | Dimensions, fps, length, destination, caption format, review/master formats |
| Audio | Exact chosen take/hash, allowed edits, voice pronunciation, music rights |
| Timing | Absolute seconds, scene boundaries, beat/word cue schema, confidence/source |
| Design | Three approved stills, palette, type, material, hero scale and safe rectangles |
| Runtime | Page hook, readiness, seeded random policy, shared helper/sound APIs |
| Ownership | One writer per file; one integrator for shared primitives and timeline |
| Acceptance | Which checks block; who resolves detector warnings and creative approval |

An agent brief should contain enough data to render a unit in isolation. “Make it like
the reference” is insufficient: supply the relevant traits, a still, the time interval,
the written intent and the failure conditions. The task-contract template is a starting
point. Restrict the agent's file ownership so two workers cannot silently change the API.

## Separate code from production media

```text
code checkout/
  examples/ or src/scenes/     pure scene functions and timeline loaders
  data/                       authored small JSON; no private client evidence
  lib/ tools/                 shared implementation and verification
  package-lock.json           pinned runtime dependencies

production/                   durable; private if client work
  brief.md
  script.txt
  audio/                      selected source, hashes, approved voice
  analysis/                   beats, sections, words, source identity
  reference/                  allowed reference frames + source URLs
  stills/                     frame-time labelled design evidence
  renders/proof/              current pilot/review file
  renders/final/              selected master/review and captions
  checks/                     machine receipts and visual/listening notes
  production-log.md
```

Use explicit absolute output paths. Link media into an engine only if it needs a local
asset URL; preserve the target and document the link. Export packages must replace
machine-specific links with a documented media layout or intentionally exclude media.
Evidence belongs beside the document that cites it. Never leave the only selected audio,
render, timing file or source report in an agent scratchpad.

## Staged production gates

**Gate 1 — meaning and look.** Three stills make the topic clear without voice. Compare
them with the selected reference traits: subject scale, ground value, density, palette,
material, line weight, readable text and whitespace. Record who accepted the direction.

**Gate 2 — timing.** The selected audio is hashed; section starts, lyric entrances and
speech paragraphs have measured positions. Listen across at least the opening, every
major change and the tail. Generated lyric tags or a prompt's requested BPM are hints.

**Gate 3 — pilot.** Build 8–15 seconds containing the most difficult case. Render out of
order, inspect the encoded motion, test the audio path and check text bounds. Repair
shared primitives now, before scene authors repeat the defect across the whole film.

**Gate 4 — integration.** Scene coverage is gapless with explicit boundary ownership.
Every module resets its draw state. Every sound uses the timeline's event, not a copied
number. Test just before, at and after each boundary, including fractional cut times.

**Gate 5 — technical delivery.** Full decode, intended frame count, audio/video lengths,
colour metadata, sync and target format pass. Review all black/freeze/cut warnings. If
using heavy chroma, compare source with encoded RGB channels. Diagnostics do not decide
whether an intentional cut or a silent interval is artistically wrong.

**Gate 6 — editorial delivery.** Watch at destination size, first on mute and then with
sound. Review every narration sentence and both burned captions and sidecar SRT. The
last idea must resolve. Human approval is recorded separately from the machine receipts.

## Parallel work without multiplying rework

Start with one integrator and one or two bounded scene authors. Give an agent one or two
scene files plus the locked timeline and helper API. Ask for a contact sheet and a short
encoded pilot, not a long prose claim that the scene looks good. Check each unit as it
lands and commit it before the next fan-out. Avoid having many agents build primitives,
rewrite timing and author scenes simultaneously.

An independent reviewer should receive a clean export and the public handoff only.
Their job is to run the commands and report blockers. This catches hidden absolute
paths, dependencies installed only in the author's shell, missing media and documents
that describe commands which have never worked. Fix blockers, then repeat the failed
step. A second review of the same files is useful only if there is a remaining question.

## Time, cost and failure management

Separate authored scene time, image-generation time, alignment time, render time and
human review time. A ten-second render benchmark does not measure total production
throughput. Try a second topic before promising an automated service rate. Set spend
limits and require an explicit decision before using paid generation outside the brief.

On interruption, the latest log should say: current commit, changed files, last passing
gate, current command, source hashes, unfinished units, known issues and next action.
No remote is a valid project choice; use the project's local backup procedure instead
of inventing or publishing a new remote. Checkpoints protect both creative and technical
work when a model cap arrives halfway through a run.

## Readiness exercise

Give a fresh operator a clean kit and the narrated-explainer recipe. Ask for a landscape
MP4 and a vertical MP4, with their checks, without reading the author's chat. If they
need to ask where a missing file lives, the handoff is incomplete. If the files pass
but the film is weak, return to the design gate. Passing a reproducibility test is
useful evidence; it does not certify every style, genre, platform or narrator.
