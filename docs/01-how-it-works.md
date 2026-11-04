# 1. How a video becomes code

A code-generated video is a sequence of designed pictures sampled at known times, combined with a known audio track. The useful abstraction is small:

```text
brief + references + assets
            ↓
script / song map → measured timeline
            ↓
draw(time, timeline, assets, style) → pixels
            ↓
capture exact frame times → encode → combine audio
            ↓
technical checks → visual and listening review → delivery
```

Code gives you repeatability, precise timing, reusable drawing primitives and the ability to change a whole film through data. It does not supply a compelling subject, a good script, expressive narration or visual judgment. Those are production inputs and review decisions.

## The smallest reliable contract

The included renderer consumes an HTML page containing one canvas. The page must expose the interfaces in [the API contract](../lib/API.md):

```html
<canvas id="c" width="1920" height="1080"></canvas>
<script>
const c = document.getElementById('c');
const ctx = c.getContext('2d');
window.DURATION = 8;
window.FPS = 30;
window.__ready = document.fonts.ready;
window.__renderFrame = (t) => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, c.width, c.height);
  const u = Math.max(0, Math.min(1, t / 2));
  ctx.fillStyle = '#91f2c2';
  ctx.fillRect(160, 430, 1600 * u, 180);
};
</script>
```

At 30 fps, output frame `n` is the picture at `from + n / 30` seconds. An eight-second interval has 240 frames, sampled from 0 through 7.9667 seconds. The end time is an exclusive boundary. A picture at exactly 8 seconds may be useful for a still, but is not an extra output frame.

The exporter can ask for frame 180 first, jump to frame 3 and return to frame 180. Frame 180 must look identical both times. This is **seek determinism**. It is the foundation of reliable previews, parallel exports, resumable chunks and debugging.

## Keep three clocks distinct

| Clock | Purpose | Source |
|---|---|---|
| Story time | What should exist at this moment | Absolute seconds on the approved timeline |
| Output frame time | Which moment is sampled for a frame | Integer frame number divided by frame rate |
| Preview wall time | How the browser player advances | Audio playback or a real-time clock |

The preview may use `requestAnimationFrame` to advance a playhead. Drawing must still depend on the explicit story time passed into it. Export must never record the wall-clock preview and hope it played smoothly. A slow machine should take longer to export, without making the resulting film slower or dropping pictures.

Audio has its own sample clock. Select the audio first; create timing data against that precise file; sample the pictures against the same origin; then combine the tracks. Do not treat browser autoplay or live microphone analysis as an export clock.

## Separate facts from presentation

Use three layers of data:

1. **Evidence:** original audio identity, actual words, measured event times, reference frames and approved source assets.
2. **Direction:** what each beat means, the hero subject, composition, motion, pacing and sound emphasis.
3. **Implementation:** scene functions, drawing primitives, fonts, shaders and export settings.

For example, an audio fact might be “the word ‘queue’ begins at 12.46 s.” A directional decision is “four jobs accumulate visibly behind a busy worker.” The implementation draws four cards with staggered offsets. Replacing the renderer should not require re-measuring the word time. Replacing the metaphor should not alter the audio file.

A small scene record can express that separation:

```json
{
  "id": "queue",
  "start": 12.46,
  "end": 17.2,
  "meaning": "Work arrives faster than it is completed",
  "visual": "One active worker; waiting jobs accumulate",
  "entryCue": "queue",
  "stateAtEnd": "four jobs waiting"
}
```

This is an example authoring schema, not a required kit file format. Choose a schema once per production and validate it before scene builders depend on it.

## Make a small complete film before a large one

The first milestone is a 5–10 second representative segment, with final-size typography, actual audio, one meaningful transition and a real encode. It must include the hardest risk: dense captions, shiny material, a shader, a fast camera move, or a crowded diagram. A beautiful title card does not test the rest of the film.

Then make an intentionally simple full-length animatic. This reveals timing and coverage problems cheaply: missing shots, slow passages, excessive text and a weak ending. Only after the animatic works should the team add finishing detail.

Work in reviewable stages:

| Stage | Evidence to save | What it proves |
|---|---|---|
| Design frame | One final-size PNG | Composition, hierarchy, palette and subject |
| Motion probe | Short encoded clip | Animation, transitions and temporal legibility |
| Animatic | Complete rough film | Coverage, narrative order and pacing |
| Master | Final encode and machine report | Delivery file meets specified technical checks |
| Review | Human notes with timestamps | What someone actually saw and heard |

Do not collapse these into a single “done” flag. A file can decode perfectly and still be unreadable, monotonous or mistimed.

## Where files belong

Keep source code, reusable helpers and synthetic fixtures in the project repository. Keep original audio, generated assets, timing results, renders and review evidence in a durable production folder outside it. For client work, use the client's private storage; shared code locations must not contain client data.

```text
code/
  film.html
  scenes/
  style/
  package-lock.json
production/
  brief.md
  source/             selected audio and licensed assets
  analysis/           identity, cues, words, features, shot map
  references/         frames actually used for comparison
  renders/proof/      current review export
  renders/master/     delivery export
  qa/                 reports and comparison sheets
  production-log.md
```

These are conceptual roots: adapt them to the host workspace rules. Save a revision identifier and audio hash beside every render that matters. If a session stops, another person should be able to identify the selected take, rerun the command and see which review questions remain.

## A first session checklist

Confirm the audience, message, format, duration, audio and delivery requirements. Select a stack using [chapter 2](02-choose-your-stack.md), design a representative frame using [chapter 3](03-design-before-code.md), and establish timing using [chapter 4](04-music-audio-and-timing.md) or [chapter 5](05-narration-and-captions.md). Build scenes using [chapter 6](06-building-scenes.md). Export with [chapter 7](07-rendering.md), verify with [chapter 8](08-verification.md), and deliver using [chapter 9](09-encode-and-deliver.md).

For a team, assign the roles and checkpoints in [chapter 11](11-team-playbook.md). For a runnable production path, start with a [recipe](recipes/narrated-explainer.md).
