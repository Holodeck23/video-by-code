# Style card template

A style card tells a builder (human or agent) how to make a whole explainer read as one real medium. It is written in our own words, describes technique rather than pasting code, and uses the kit's `H` and `SOUND` API (`lib/API.md`).

Target length: 90 to 170 lines. Every number (hex, alpha, px, seconds, counts) is a concrete starting value the builder can use.

```markdown
---
id: <kebab-id>
name: <our own name for the style>
family: <Hand-drawn | Paper & craft | Print | Painterly | Light & imaging | Retro digital | Dimensional | Data & information | Illustration | Design movements | Generative & type | Cosmic>
fonts: [<Google Font family>, ...]
best_for: <topics and tones it suits>
avoid_for: <where it fights the content>
---

# <name>

<Two or three sentences: what the viewer believes they are watching, physically. Name the medium and the one quality that sells it.>

## Palette
| Role | Hex | Notes |
|---|---|---|
| Ground | | |
| Primary ink | | |
| Accent | | used for the single most important thing on screen |
| Alarm / wrong | | used rarely |
| ... | | |

## Ground and surface
How the background is built, step by step, with values: base fill, texture (seeded, cached with `H.offscreen` where static), lighting, any animated layer. Say which parts are cached and which change per frame.

## Mark-making
How every line, shape and fill is drawn so it reads as the medium. One sub-section per primitive (stroke, fill, outline, shadow, highlight). Describe the passes in order with parameters. Short original pseudo-code using the `H` API is welcome; never pasted source.

## Type and numbers
Fonts, weights, sizes at 1920x1080 (headline >= 66px, story-critical label >= 42px, key number >= 96px), colour, how text appears (typed, stamped, written on, cut out), how numbers count or land.

## Diagrams: arrows, labels, charts
How arrows are drawn and animated, how labels attach to things, what a chart or comparison looks like in this medium.

## Motion
Easing family, typical durations, how things enter and leave, camera behaviour (pan, push, parallax, breathing), anything that keeps the frame alive between beats.

## Scene changes
The medium's own way to change scene (a wipe, a fold, an erase, a page turn, a light change), with timing. When to stay continuous instead.

## Finishing passes (run every frame, same strength)
The texture, grain, glow, misregistration, scanline or lighting passes that make the medium believable, in order, with values. These are what separate the real look from a flat imitation; never skip them.

## Sound palette
Map events to `SOUND` presets with suggested `f`, `gain`, `dur`:
- element appears:
- label lands:
- arrow completes:
- drawing / writing (matched to draw-on length):
- scene change:
- wrong / right:
- key number (the biggest hit):
- takeaway:
- bed or music (optional, gain <= 0.6):

## Signature moves
Three to six specific moves that make this style memorable in an explainer, each one line.

## Pitfalls
What makes this style look cheap or fake, and the fix for each.

## Hero frame recipe
A step-by-step build of one representative still in this style (ground, main subject, label, finishing), so a builder can match the look before animating.
```

## Rules for writers

- **Write from understanding, not from the source text.** Read the reference to learn how the look is achieved, close it, then describe it in your own words. No sentence or code line may be copied. `tools/copy-check.py` must pass (no shared run of 8+ words with the source).
- **Technique over adjectives.** "Three offset passes at 35% alpha, shifted 1.5px left and 1px down in the second ink" beats "nice misregistration".
- **Stay topic-neutral.** Do not describe the reference's own story, characters or props. The card must work for any topic.
- **Use the kit API names** from `lib/API.md` (for example `H.noise`, not other helper names; `k.play('stamp', ...)`).
- **Name the style yourself.** Plain medium names are fine ("Chalkboard"); do not reuse a distinctive branded name from the source.
