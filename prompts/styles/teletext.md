---
id: teletext
name: Broadcast Mosaic
family: Retro digital
fonts: [VT323, IBM Plex Mono]
best_for: stepwise facts, concise bulletins, system status, simple categorical data
avoid_for: long sentences, fine curves, smooth photographic imagery
---

# Broadcast Mosaic

A broadcast information page assembled from fixed character cells and block mosaics. Pages arrive in rows, with a stable header and deliberate low-resolution graphics.

## Palette

| Role | Hex | Use |
|---|---|---|
| Black | #080909 | screen ground |
| White | #f5f5ef | reading text |
| Cyan | #36d5d9 | diagram route |
| Yellow | #e9d74a | headline and value |
| Red | #da4a4d | failure state |
| Green | #4ed46a | successful result |
| Blue | #4459d5 | header band |

## Ground and surface

Use a 40-column by 25-row logical page inside a 72px overscan margin.
Store every cell as character, foreground, background and optional mosaic mask.
Draw cell boundaries from rounded absolute coordinates to prevent thin gaps.
Reserve the first two rows for a topic header and the final two for navigation-style section cues.

## Mark-making

A mosaic cell divides into two columns and three rows: its six-bit mask selects filled rectangles.
Build illustrations and bars from these sextants rather than arbitrary vector shapes.
Use a limited saturated palette and only one foreground/background pair per cell.
Double-height text occupies two rows; mark the lower cells as continuation to prevent overdraw.
Treat blank space as an intentional field, not a place to scatter random status numbers.
Cache glyphs at their final cell size before page assembly.

## Type and numbers

Use VT323 at 72px for headlines and at least 48px for important labels.
For the main number, use double-height characters occupying at least 108px on screen.
Fit copy into whole cells; shorten lines before altering the cell aspect ratio.
A chosen word can invert foreground/background once, then remain steady.

## Diagrams: arrows, labels, charts

Make arrows from mosaic blocks, with a two-cell head and one-cell shaft.
Attach labels on the next aligned row, never at fractional cell coordinates.
Bars advance by half a cell horizontally or one third vertically, matching the mosaic resolution.
Pair every colour state with a written label so meaning survives monochrome viewing.

## Motion

On a page request, hold the previous body for 0.25s while the header changes.
Reveal the new page in pairs of rows over 0.6s.
Counters update in whole characters at 8fps.
A ticker advances one cell at a time, but avoid scrolling critical sentences offscreen before they can be read.
Use seconds in the shared cue table for all entrances, exits and sound events.

## Scene changes

Request a new page number, then replace the body top to bottom.
Keep a small related update on the same page and change only its cells.
Use one brief inverse-video highlight rather than repeated flashing for emphasis.

## Finishing passes (run every frame, same strength)

1. Render all backgrounds before all glyphs, preserving double-height letters.
2. Add a 0.6px soft-focus copy at 0.12 alpha beneath the sharp page.
3. Apply faint 3px scanlines at 0.06 alpha, leaving type legible.
4. Keep any colour-channel offset below 0.7px and inspect it at phone size.
Static texture belongs to object or sheet coordinates; cache it with H.offscreen and never reseed it per frame.

## Sound palette

Schedule effects once in window.scoreSound(k); do not trigger sound from the draw loop.
- Element appears: k.play('click', t, { f: 850, gain: 0.2 }).
- Label lands: k.play('blip', t, { gain: 0.12, minor: true }).
- Arrow completes: k.play('tick', t, { gain: 0.15 }).
- Drawing: k.play('pencil', t0, { dur: t1-t0, gain: 0.08, minor: true }); omit this scratch in electronic styles and use a quiet k.tone instead.
- Scene change: k.play('glitch', t0, { dur: 0.35, gain: 0.2, minor: true }).
- Wrong / right: k.play('error', t, { gain: 0.25 }) or k.play('success', t, { gain: 0.3 }), tied to the visual evidence.
- Key number: k.play('powerup', t, { gain: 0.5 }); this is the strongest accent in the sequence.
- Takeaway: k.play('ding', t, { gain: 0.3 }), followed by a short quiet hold.
- Optional atmosphere: k.bed(0, DURATION, { kind: 'hum', gain: 0.08 }); leave out the bed under narration.
Limit decorative ticks to eight per second and keep only two or three foreground events overlapping.

## Signature moves

- A stable header announces the next page while the old body waits.
- Two-row bursts reveal a new bulletin.
- Six-part mosaic blocks make charts and arrows.
- A double-height number settles into a steady inverse highlight.

## Pitfalls

| Failure | Repair |
|---|---|
| The page becomes a tiny authentic screenshot | Use large cells and concise copy. |
| Vector curves break the medium | Use sextant graphics for all main shapes. |
| Rows overwrite double-height glyphs | Separate background and text passes. |
| Flash is used for every event | Replace it with one static inverse highlight. |

## Hero frame recipe

1. Build a 40x25 page with a blue topic header.
2. Set a yellow two-row headline across the upper body.
3. Place a three-step mosaic diagram in the centre with short white labels.
4. Draw one cyan bar chart and a double-height yellow result.
5. Add a restrained bottom section index, avoiding fake live data.
6. Apply soft scanlines and verify the body remains readable when downscaled.

Build this still before scoring the motion. Compare subject, hierarchy, medium and text at the intended delivery scale; a lint pass alone is not visual approval.
