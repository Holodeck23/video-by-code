# Handoff to a human–agent team

Read the README, then follow this sequence. Do not treat the style catalog as a script
generator or the verifier's green result as creative acceptance.

1. **Recover intent.** Complete `templates/brief.md`. Identify audience, point, length,
   aspect ratio, destination, reference traits, selected audio, budget and approval owner.
   Record anything still unknown. Client inputs stay in their private production home.
2. **Make a durable production folder.** Use the layout in chapter 11. Copy the selected
   audio there and run `audio-identity.py`. Record its hash before analysis. Preserve the
   chosen source; do not replace it with a differently generated take under the same name.
3. **Make the smallest pipeline work.** Follow README's four-second starter commands.
   Stop and repair environment or contract failures before building a film.
4. **Choose the simplest sufficient stack.** Read chapter 2. Use one visual system,
   two type roles, a semantic accent and a clear hero per scene. Choose a style card and
   assemble a prompt with `build-prompt.py`; fill in the actual content brief.
5. **Approve three stills.** Opening, hardest scene and ending. Inspect at full size and
   at delivery viewing size. Match reference traits without reproducing its text/code.
6. **Measure the audio.** Extract embedded cues as hints. For music, inspect beats and
   section boundaries against the waveform and by listening. For narration, verify every
   sentence and pronunciation. Mark estimated word timings as estimated.
7. **Freeze the contracts.** Agree on timeline schema, shared graphics/sound API,
   dimensions, safe areas, fonts, colour management and file ownership. Assign one scene
   owner per file. Use `templates/task-contract.md` for every delegated unit.
8. **Build a short pilot.** Include the hardest transition, a long label, a quiet interval
   and a strong sound event. Draw the same time after seeking away and back. Check the
   encoded pilot, not only source stills.
9. **Review the pilot.** Mute viewing for clarity; listening for voice/timing; encoded
   playback for cuts, flashes, clipping, grain and colour. Log changes in `qa.md`.
10. **Render the full film.** Record commit, source-media hashes, command, frame rate,
    browser/encoder versions and intended frame count. Use frame-aligned ranges. For
    long films, add resumable chunks only when time determinism and chunk joins are tested.
11. **Verify all outputs.** Run decode/count/format checks and targeted diagnostics from
    chapter 8. Review every warning. Check caption bounds over all cue intervals; a few
    middle-of-scene frames do not cover transitions or worst-case line widths.
12. **Package reproducibly.** Source + lockfile + exact command + timeline + selected
    media + verification + limitations + delivery file. Mark human creative approval
    separately. Use `templates/delivery.md`. Commit and run the local backup path.

## Restart after interruption

Inspect git status before editing. Read the latest production log, identify the last
passing gate, and verify that the source/audio hashes still match. Preserve uncommitted
work before repairs. Cancel any previous agent's pending automatic continuation before
two sessions can write the same files. Resume the unfinished gate, not the whole project.

## Bounded completion criteria

The team can complete a new film from the brief, prove its render is technically sound,
and name the remaining editorial decisions. If no human has watched/listened, delivery
must say so. If a style has only been specified or sampled, do not describe it as fully
production-tested. If a workflow requires an external model, expose that dependency early.
