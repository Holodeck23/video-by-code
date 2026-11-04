# Video by Code

A practical handbook and runnable toolkit for a human–agent team making explainers,
lyric films, instrumentals, data stories and vertical shorts. The material concentrates
on technique: direction, audio timing, deterministic scenes, rendering and review.

Start with a designed frame and a measured timeline. A successful render proves that
the pipeline works; a finished film also needs a visual and listening review.

## First successful render

Requires Node.js (tested with 22+), Python 3.11/3.12, `uv`, ffmpeg/ffprobe with libx264
and AAC, and installed Google Chrome. The reference environment is macOS on Apple Silicon.
The renderer uses system Chrome, not a bundled Playwright download. Other platforms
need their own smoke test; GPU flags and the optional `say` voice fixture are Mac-specific.

From the kit root:

```sh
cd starter
npm ci
cd ..
# Choose a durable production directory outside this checkout.
PROD="/absolute/path/to/video-production"
mkdir -p "$PROD/renders"
node starter/determinism.mjs starter/scene.html
node starter/render.mjs starter/scene.html --out "$PROD/renders/starter.mp4" --audio none
bash starter/verify.sh "$PROD/renders/starter.mp4" 4 30
```

`PROD` must be replaced with a real absolute path. On this workspace, ordinary media
belongs under `/Users/Shared/second-brain/outputs/video/<production>/`; music productions
use the established `outputs/suno/<song>-music-video/` home. Client material belongs in
the user's private vault instead. Code stays in a code checkout, media stays outside it.

The first video is deliberately small: four seconds, 1920×1080, 30 fps, 120 frames.
Continue with the [36-second narrated explainer](docs/recipes/narrated-explainer.md)
and the [12-second vertical short](docs/recipes/vertical-short.md).

## Read in order

1. [How it works](docs/01-how-it-works.md): absolute time, data flow, reproducibility.
2. [Choose a stack](docs/02-choose-your-stack.md): Canvas, DOM, Three.js, Blender and alternatives.
3. [Design before code](docs/03-design-before-code.md): reference analysis, heroes and pacing.
4. [Music, audio and timing](docs/04-music-audio-and-timing.md): source identity, beats, stems, sections.
5. [Narration and captions](docs/05-narration-and-captions.md): pronunciation, alignment, phrase layout.
6. [Build scenes](docs/06-building-scenes.md): pure drawing, seeded motion and shared primitives.
7. [Render](docs/07-rendering.md): capture, ranges, backpressure, resume and failure handling.
8. [Verify](docs/08-verification.md): decode, frames, sync, colour and sampled visual inspection.
9. [Encode and deliver](docs/09-encode-and-deliver.md): compatible review files and high-chroma masters.
10. [Pitfalls](docs/10-pitfalls.md): concrete symptoms, causes and repairs.
11. [Team playbook](docs/11-team-playbook.md): responsibilities, checkpoints and handoffs.

## Use the kit

| Area | Entry point |
|---|---|
| Fast agent handoff | [RUNBOOK.md](RUNBOOK.md) |
| Brief, timeline, QA and delivery forms | [templates/](templates/) |
| Five prompt briefs + 86 technique cards | [prompts/README.md](prompts/README.md) |
| Browse styles | [style index](prompts/styles/INDEX.md) |
| Build a prompt | `python3 tools/build-prompt.py whiteboard --brief explainer-voiceover` |
| Exact graphics, sound and renderer contract | [lib/API.md](lib/API.md) |
| Lyric film | [recipe](docs/recipes/lyric-music-video.md) |
| Instrumental visualizer | [recipe](docs/recipes/instrumental-visualizer.md) |
| Runnable examples | [examples/README.md](examples/README.md) |
| Origin and reuse boundaries | [PROVENANCE.md](PROVENANCE.md) |
| Tested scope and limitations | [VALIDATION.md](VALIDATION.md) |

Python tools declare dependencies in PEP 723 headers: run them with `uv run`.
`beat-grid.py` needs Python 3.10–3.12; use `uv run --python 3.12` for that tool.
Read `--help` before a new tool. A tool's FAIL is a reason to investigate; a detector
warning may be intentional, but the resolution must be recorded.

## What this gives you

The starter renders Canvas2D pages and schedules procedural Web Audio effects. It can
mix an external narration or music file, export stills and sheets, and check seek
determinism. Timing tools identify audio, extract embedded cues and estimate a beat grid.
Verification tools inspect files, sync, visual statistics, cuts and per-channel encoding loss.

The handbook also explains advanced engines and alignment workflows. Those explanations
are not bundled implementations of Blender production, GPU streaming, stem separation,
ASR, forced alignment or production TTS. Style cards are authoring specifications, not
86 finished scene engines. Exact frame pixels across different OS/font/GPU versions are
not promised. See the validation record for the evidence actually obtained.

## Checkpoint and backup

Commit completed code units. Keep a production log beside the media. This checkout has
no remote by design. `bash tools/backup.sh /absolute/backup/directory` preserves source
history in a local git bundle; keep the backup outside the brain/vault media evidence
folders. Export a clean distributable and a readable handbook with
`uv run tools/export-handbook.py --out /absolute/delivery/directory`.
