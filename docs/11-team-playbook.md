# 11. Run a human–agent production

Video work combines decisions with different kinds of evidence. The director owns the
meaning and look. Timing work owns measured events. Scene authors own pure drawing.
The renderer owns files. QA owns repeatability and observed defects. One person can
hold several roles, but each responsibility still needs an owner.

This chapter is about the work between the technical steps: where files live, how a
production survives interruptions, how notes are written so they can be acted on, how
to fan work out to several agents without multiplying rework, and how to report what
has and has not been established.

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
the written intent and the failure conditions. The task-contract template
(`templates/task-contract.md`) is a starting point; `templates/brief.md`,
`templates/qa.md` and `templates/delivery.md` cover the other records. Restrict the
agent's file ownership so two workers cannot silently change the API.

## Separate code from production media

Keep two homes and never mix them. Code lives in a version-controlled repository.
Everything the production makes or consumes lives in one durable production folder:
the selected audio and its hash, script, stems, analysis, timing, every render pass,
contact sheets, treatment and production log.

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
  renders/<pass-name>/        one folder per pass: pilot-01, full-02, review-03
  renders/final/              selected master/review and captions
  checks/                     machine receipts and visual/listening notes
  production-log.md
```

Rules that keep this working:

- **Media never enters the repository.** Large binaries bloat history and private media
  leaks with every clone. Build output is ignored.
- **Link, do not copy.** If an engine needs a local asset URL, link the production's
  `audio/` and `analysis/` folders into the engine with symbolic links. Preserve the
  target and document the link. Export packages must replace machine-specific links
  with a documented media layout or intentionally exclude media.
- **Renders are copied home in the same turn.** A render finished in any tool's own
  output folder or a temporary directory is copied into `renders/<pass-name>/` before
  the session moves on, and the production log records the path. Temporary folders
  are cleaned; sessions end; caps arrive mid-run.
- **Name passes, not dates.** `pilot-02` with a log entry saying what changed beats
  `final-final-v3.mp4`.
- **Evidence lives beside the document that cites it.** A check report lives in
  `checks/` next to the render it describes, not in a chat transcript.
- Use explicit absolute output paths in every command.

Never leave the only selected audio, render, timing file or source report in an agent
scratchpad.

## Checkpoints and the production log

Commit after every finished unit of code: a scene, a helper, a timing generator. If the
repository has a remote, push. If it deliberately has none, that is a valid choice; use
a local backup instead of inventing or publishing a remote. The kit includes one:

```bash
bash tools/backup.sh /absolute/backup/directory
```

It writes a git bundle of all branches named with the current short commit and verifies
it. The destination must be absolute and outside the checkout.

Keep a compact checkpoint at the top of the production log, rewritten as the state
changes rather than appended to:

| Field | Example content |
|---|---|
| Selected audio | file name and SHA-256 |
| Current render | path, pass name, source commit, render command |
| Last passing gate | for example "gate 5 technical delivery, warnings explained" |
| Latest human verdict | exact words, which version, who, when |
| Unresolved craft problem | the one thing that is not working yet |
| Next bounded test | what will be tried, on which excerpt, how success is judged |
| Measured render cost | end-to-end fps and minutes on this machine |
| Known issues | named limitations and whether anyone accepted them |

On interruption, the log plus the repository should let a new person continue: current
commit, changed files, last passing gate, current command, source hashes, unfinished
units, known issues and next action. Checkpoints protect both creative and technical
work when a model cap arrives halfway through a run. Preserve failed samples as
evidence; avoid repeating analysis or a full render when only the manifest or one shot
needs repair.

## Staged production gates

**Gate 1 — meaning and look.** Write the story as a small set of key moments first,
eight to twelve for a five-minute film, each stating what the viewer must understand at
that moment. Make a target still for each before any engine work, and review them as a
strip: if the story does not read as eight stills, it will not read as five minutes of
motion. Three stills make the topic clear without voice. Compare them with the selected
reference traits: subject scale, ground value, density, palette, material, line weight,
readable text and whitespace. State what this film does that the previous one did not.
Record who accepted the direction.

**Gate 2 — timing.** The selected audio is hashed; section starts, lyric entrances and
speech paragraphs have measured positions. Listen across at least the opening, every
major change and the tail. Generated lyric tags or a prompt's requested BPM are hints;
each scored event is marked located (with evidence) or absent.

**Gate 3 — pilot.** Build 8–15 seconds containing the most difficult case; an arc may
need 20–30 seconds or neighbouring sections. Render out of order, inspect the encoded
motion, test the audio path and check text bounds. Measure the render cost here. Repair
shared primitives now, before scene authors repeat the defect across the whole film.

**Gate 4 — integration.** Scene coverage is gapless with explicit boundary ownership,
including instrumental stretches. Every module resets its draw state. Every sound uses
the timeline's event, not a copied number. Test just before, at and after each
boundary, including fractional cut times. Make a whole-film contact sheet before the
expensive render.

**Gate 5 — technical delivery.** Full decode, intended frame count, audio/video
lengths, colour metadata, sync and target format pass. Review all black/freeze/cut
warnings. If using heavy chroma, compare source with encoded RGB channels. Diagnostics
do not decide whether an intentional cut or a silent interval is artistically wrong.

**Gate 6 — editorial delivery.** Watch at destination size, first on mute and then with
sound. Review every narration sentence and both burned captions and sidecar SRT. The
last idea must resolve. Human approval is recorded separately from the machine
receipts.

Once the owner accepts a direction or delegates completion, proceed within that scope
without inventing extra approval rounds. Acceptance applies to the version and scope
reviewed. An explicit rejection stops expansion of that direction.

## Feedback that can be acted on

A local preview with play/pause, scrubbing, frame stepping and frame or range
annotation makes notes precise. Whatever the tool, each note has four parts:

| Part | Example |
|---|---|
| Timestamp or range, and the object or shot | `1:12.4–1:15.0, the queue diagram` |
| What to keep | "keep the colour and the slow build" |
| One concrete change | "the third box should arrive on the word 'third', not before" |
| How to tell it worked | "the box lands as the word starts, in a frame-stepped check" |

One change per note keeps cause and effect clear. "Make it better" or "more energy" is
a feeling to be diagnosed, not an instruction: ask which of pace, contrast, voice or
progression is weak.

Bind exported notes to the source-audio hash and any subtitle offset, so a note still
points at the right moment after a retake. Browser storage is convenient persistence,
not the archive: export notes into the production folder. Render user-entered notes as
text, not raw HTML.

When notes arrive as a list of timestamps, measure each one and cluster them before
fixing anything. Glitch reports usually collapse into two or three mechanical classes;
fix the class, then check that it explains the remaining reports.

## Parallel work without multiplying rework

Start with one integrator and one or two bounded scene authors. The fan-out rules that
held up across several productions:

1. **Lock shared things first.** Shared drawing primitives, the timeline, the data
   files and the helper API are written and committed by the integrator before any
   scene author starts. Scene authors read them; they do not edit them.
2. **Parameterize repeats.** Repeated structural sections (each chorus, each chapter
   card) are one module with an index parameter, not copies that drift.
3. **One or two scene files per agent.** Keep scene files to roughly 260–380 lines.
   Asking one agent to write three 600-line files in a single turn failed: the third
   streamed write, around 10,000 output tokens, dropped with a broken-pipe timeout.
   Large streamed writes can fail silently, so confirm each file on disk.
4. **Strict file isolation.** One writer per file. Two agents never edit the same file
   in the same round.
5. **Mechanical check after the fan-out.** Typecheck (or the language's equivalent),
   a whole-film contact sheet (for example 36 tiles from 0 to the duration), and a
   multi-still look audit with `measure-look.py`, before the full render.
6. **Commit each unit as it lands**, then fan out the next round.

Give an agent one or two scene files plus the locked timeline and helper API. Ask for a
contact sheet and a short encoded pilot, not a long prose claim that the scene looks
good. Avoid having many agents build primitives, rewrite timing and author scenes
simultaneously.

An independent reviewer should receive a clean export and the public handoff only.
Their job is to run the commands and report blockers. This catches hidden absolute
paths, dependencies installed only in the author's shell, missing media and documents
that describe commands which have never worked. Fix blockers, then repeat the failed
step. A second review of the same files is useful only if there is a remaining
question.

## Three separate records

Keep these as separate entries in the log, each with the exact version it applies to:

| Record | Who produces it | What it can establish |
|---|---|---|
| Technical verification | Tools and their reports | The file decodes, has the right frames, tags, sync and loudness |
| Agent assessment | An agent's reading of stills, sheets or reports | An opinion about the look, labelled as an opinion, with what was inspected |
| Human acceptance | The person responsible, by name | That this version is accepted for this purpose |

A build, decode, contact sheet or new engine cannot establish creative success. A liked
pilot does not accept a later full export or another direction. Record the failed
version, the attempted correction, the technical result and the latest verdict
separately. Label a proposed remedy as unproven until someone has reviewed it;
technical improvement does not imply creative acceptance.

Report only the states actually reached: pilot built, browser checks passed, render
exported, decode verified, frames inspected, watched with sound, accepted, released. Do
not write "listened" when only metadata, subtitles or a transcript were inspected.

## A named limitation is not a discharged defect

One film's code review recorded, accurately and in advance, that only the camera,
focus, lens and hero object carried motion-blur keys. It then approved the render. The
unblurred geometry was small fast debris, which strobed at 24 fps; three of the
viewer's six reported glitches were exactly that.

Writing a limitation into a review does not convert it into an accepted trade-off.
Either fix it, or get the limitation accepted by the person who will watch the film, by
name, before the long render starts. A limitation the viewer has not agreed to is a
defect with documentation attached.

## After a rejection

If a result is rejected as cheap, generic or the wrong direction, stop expanding or
polishing it. Diagnose the missing craft, then change the premise, assets or action
before spending another render. A renderer change, more inserts or stronger colour did
not rescue rejected directions in practice. Do not reinterpret a rejected sample as
acceptance, and do not carry its metaphor into the next attempt.

Keep each new pass to a stated hypothesis, a bounded excerpt and an observable
comparison. Reuse audio analysis, source assets and verified timing; they were not the
problem.

## Tool hygiene for agents

Agents report what their tools print. Make sure silence means what you think it means.

- **macOS has no `timeout` command by default.** A command prefixed with `timeout`
  exits 127 with empty stdout. If stderr is hidden or piped away, the empty output
  reads as an empty finding. Six scans were once reported as "nothing found" this way.
  Check exit codes, or use a timeout built into the tool or language.
- **`-v error` hides `info`-level filter output.** `showinfo`, scene detection and
  similar logging disappear, which again reads as "nothing found".
- **Reject unknown flags** in your own scripts, and read `--help` before citing a flag.
  A silently ignored flag produced a full set of stills all drawn at `t = 0`.
- **Prefer tools that print a positive verdict line** (`PASS: ...`,
  `DETERMINISTIC`) and a non-zero exit on failure.
- **Some renderers exit 0 after a script error.** Check a completion marker and the
  output count, not only the exit status.

## Time, cost and failure management

Separate authored scene time, image-generation time, alignment time, render time and
human review time. A ten-second render benchmark does not measure total production
throughput. State render ETAs from measured end-to-end throughput on this machine, plus
encode, verification and review.

Generation quotas are a real constraint: one image provider stopped after 14 images;
another produced 26 before its window closed, and the remaining prompts became
procedural overlays and camera moves. Make generation rerunnable (skip outputs that
already exist), and decide in advance what replaces a shot if the quota runs out.

Try a second topic before promising an automated service rate: hand- or agent-authored
shot tables and scene graphics do not yet make a general topic-to-video system. Set
spend limits and require an explicit decision before using paid generation outside the
brief.

## Readiness exercise

Give a fresh operator a clean kit and the narrated-explainer recipe. Ask for a landscape
MP4 and a vertical MP4, with their checks, without reading the author's chat. If they
need to ask where a missing file lives, the handoff is incomplete. If the files pass
but the film is weak, return to the design gate. Passing a reproducibility test is
useful evidence; it does not certify every style, genre, platform or narrator.
