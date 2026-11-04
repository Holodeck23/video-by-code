# Runnable examples

These pages share the [page contract](../lib/API.md). Run commands from the kit root.
Install the pinned renderer with `cd starter && npm ci` once. Output paths must be outside
the checkout. Use the four-second starter before these examples.

| Page | Duration / shape | Purpose |
|---|---|---|
| `../starter/scene.html` | 4 s / landscape | Small, dependency-free deterministic scene |
| `hello-explainer.html` | 12 s / landscape | Hand-drawn diagram with cached paper and effects; uses web fonts |
| `narrated-explainer.html` | 36 s / landscape | Five scenes, phrase captions, local voice fixture; no web assets |
| `vertical-short.html` | 12 s / vertical | Separate vertical composition and procedural effects |
| `repo-tour/film.html` | 27.67 s / vertical | Seven-beat `transit-map` short with continuous camera, LED board, safe-area text bounds and external Kokoro TTS script (`repo-tour/make-audio.py`) |
| `instrumental.html` | track length / landscape | Audio-envelope-driven visualizer via generated feature script |
| `styles/*.html` | 8 s / landscape | [Eight sampled material studies](styles/README.md), with limited animation |

The two handoff exercises are described in the [narrated](../docs/recipes/narrated-explainer.md)
and [vertical](../docs/recipes/vertical-short.md) recipes. `make-narration.py` requires macOS
`say` for its disposable test voice. Use approved recorded/generated narration for real
work and retime the pictures to it. Phrase captions are authored to scene slots, not
forced-aligned karaoke words. The preview player plays page effects; it does not load the
external `--voice` track. Review the exported MP4 for the actual mixed result.
