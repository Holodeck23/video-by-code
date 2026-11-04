# Build a production prompt

Choose a [style card](styles/INDEX.md), choose the production brief, and provide the actual content. The builder combines those inputs; it does not generate a video or replace direction, coding and review.

From the kit root:

```bash
python3 tools/build-prompt.py blueprint --content /absolute/path/to/script.md
python3 tools/build-prompt.py swiss-grid --brief explainer-voiceover \
  --content /absolute/path/to/script.md --out /absolute/path/to/production/prompt.md
python3 tools/build-prompt.py memphis --brief vertical-short \
  --content /absolute/path/to/outline.md --inline-lib \
  --out /absolute/path/to/production/prompt-with-code.md
```

`--inline-lib` includes the API contract and the kit's graphics/audio libraries for a model without access to the repository. Without that option, the prompt tells the builder to read those files locally. The libraries are supplied implementation code; the rewritten style cards are medium recipes, without the original reference implementations.

| Brief id | Use |
|---|---|
| [explainer-silent](briefs/explainer-silent.md) | A complete explanation with sound muted; the default |
| [explainer-voiceover](briefs/explainer-voiceover.md) | Picture, captions and effects around a locked recording |
| [vertical-short](briefs/vertical-short.md) | A composition planned for 1080x1920 |
| [lyric-video](briefs/lyric-video.md) | A music-led film timed against the selected take |
| [data-story](briefs/data-story.md) | Evidence, calculation and an honest visual comparison |

Every assembled prompt also includes [the craft rules](briefs/_craft-core.md): pacing, continuity versus cuts, legibility floors, finishing passes, determinism and the sound hierarchy. They apply to every brief and every style; edit that one file to raise the bar everywhere.

Omitting `--content` deliberately keeps a request for the producer's missing topic/script in the assembled prompt. The selected brief is still included. An empty or unreadable supplied file is an error. Unknown style/brief ids fail with the available choices. The builder uses Python's standard library and performs no network calls.

## How to brief the team

Supply the audience, the one intended takeaway, factual material, required duration/aspect ratio, approved assets/audio, desired tone and forbidden claims. Name the production folder and delivery requirements. Clarify whether the task is a prototype, a pilot for approval or a finished render.

Ask the director for a cue/shot plan and a still before the scene builder implements a full film. A card's numerical settings are practical starting points, not immutable rules. Preserve the distinguishing technique and information hierarchy while adapting geometry to the topic.

Use a single shared cue table for pictures, labels and sound. If narration or music exists, lock and identify it before timing. If a model proposes new facts or an unapproved voice, resolve that before export.

An agent with only the assembled prompt needs an HTML-capable coding environment to build the page and a supported browser/FFmpeg environment to export. Pasting a prompt into a chat does not grant those capabilities. External font or asset URLs also require an online connection; use licensed local files for reproducible offline output.

## Verification and provenance

The style taxonomy and technique study came from a locally archived collection of 86 style references. These cards describe materials, marks, timing, typography and finishing in independent wording; they do not include the reference's program, topic or sample characters. Common public techniques and medium names remain recognisable.

Run these checks after editing a card:

```bash
python3 tools/card-lint.py prompts/styles/blueprint.md
python3 tools/copy-check.py /absolute/path/to/source-prompt.txt prompts/styles/blueprint.md
```

The first check validates a limited structural/API convention. The second searches for matching token runs of eight or more words against the specific supplied source. Neither proves originality, permissions, factual accuracy or visual quality. Review provenance and rights for any external asset or code independently; a passing substring test is not legal clearance.

Render the hero recipe, inspect the medium and typography, then make a short moving proof. Many cards have no individual moving proof yet; record the tested scope honestly. A mechanically valid card may still produce a weak image without a deliberate subject and composition.

See the [team playbook](../docs/11-team-playbook.md), [page contract](../lib/API.md) and [verification chapter](../docs/08-verification.md) for the production workflow.
