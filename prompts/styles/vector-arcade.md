---
id: vector-arcade
name: Phosphor Wire Cabinet
family: Retro digital
fonts: [IBM Plex Mono, Space Mono]
best_for: trajectories, spatial systems, navigation, sparse geometric models
avoid_for: filled photographic scenes, detailed reading, soft painterly matter
---

# Phosphor Wire Cabinet

A vector display drawing luminous wire paths over a dark tube. Bright corners and slightly dimmer long lines imply a moving beam; sparse geometry keeps both the model and the labels legible.

## Palette

| Role | Hex | Use |
|---|---|---|
| Tube black | #050909 | unlit glass |
| Green phosphor | #5ee58a | main beam |
| Hot core | #c9ffd8 | short bright corners |
| Red overlay | #e46b61 | alarm or secondary display zone |

## Ground and surface

Fill the frame with near-black and a cached radial glass shading at 0.08 strength.
Leave at least 65% of pixels near the tube ground; sparse beams are the point.
Cache a very faint dust/reflection layer, never a bright full-frame haze.
Use red only in a distinct overlay zone or a single alarm state.

## Mark-making

Represent the subject as a list of polylines with explicit drawing order.
Draw a broad 9px beam at 0.08 alpha, a 3px beam at 0.35 and a 1.4px bright core at 0.9 using additive compositing.
Add a 2.2px dot at vertices where the beam dwells, at 0.45 alpha.
Reduce the core alpha of strokes longer than 250px by about 20%.
Project simple 3D edges analytically from fixed geometry; omit hidden edges where needed to keep the model readable.
Generate trails by redrawing the known pose at t-0.05 and t-0.1 with alpha 0.2 and 0.08, never from previous frame buffers.

## Type and numbers

Use an original single-stroke glyph set for short display headings at 96px.
Where a full glyph set is unavailable, IBM Plex Mono at 72px is an explicit approximation, not a claim of hardware accuracy.
Story labels stay at 48px and key figures at 132px.
Keep the glow beneath the label core so counters remain distinct.

## Diagrams: arrows, labels, charts

Use open wire arrows with 30px heads and the same beam passes as the subject.
Attach labels with short elbow leaders that stop 18px before the glyph.
A chart uses sparse axes, a bright moving point and a deterministic fading trail.
Avoid building a decorative cockpit around an explanation that needs a simple diagram.

## Motion

Trace each polyline using H.partial over 0.25-0.8s according to its length.
Move subjects with analytic paths and rotate them at at most 0.35rad/s during reading.
Use a subtle shared brightness modulation 1+0.015*sin(t*47), not random flicker.
A lock-on bracket closes over 0.3s, then holds perfectly still.
Use seconds in the shared cue table for all entrances, exits and sound events.

## Scene changes

Contract the beam geometry toward the target anchor over 0.35s, then trace the next diagram from that point.
Keep an existing coordinate frame when comparing two trajectories.
A one-time scan sweep can introduce a new area, but should not become a repeated flash.

## Finishing passes (run every frame, same strength)

1. Draw old-pose trails, wide bloom and sharp current beams in order.
2. Add corner dwell points and readable label cores.
3. Apply a mild H.vignette with strength 0.18 and inner 0.7.
4. Inspect compressed beams: reduce bloom before increasing saturation.
Static texture belongs to object or sheet coordinates; cache it with H.offscreen and never reseed it per frame.

## Sound palette

Schedule effects once in window.scoreSound(k); do not trigger sound from the draw loop.
- Element appears: k.play('blip', t, { f: 460, gain: 0.22 }).
- Label lands: k.play('tick', t, { gain: 0.1, minor: true }).
- Arrow completes: k.play('select', t, { gain: 0.18 }).
- Drawing: k.play('pencil', t0, { dur: t1-t0, gain: 0.08, minor: true }); omit this scratch in electronic styles and use a quiet k.tone instead.
- Scene change: k.play('whoosh', t0, { dur: 0.35, gain: 0.25, minor: true }).
- Wrong / right: k.play('error', t, { gain: 0.25 }) or k.play('success', t, { gain: 0.3 }), tied to the visual evidence.
- Key number: k.play('impact', t, { gain: 0.55 }); this is the strongest accent in the sequence.
- Takeaway: k.play('powerup', t, { gain: 0.35 }), followed by a short quiet hold.
- Optional atmosphere: k.bed(0, DURATION, { kind: 'hum', gain: 0.08 }); leave out the bed under narration.
Limit decorative ticks to eight per second and keep only two or three foreground events overlapping.

## Signature moves

- A beam traces the real geometry rather than fading a finished object.
- Vertices burn slightly brighter than long strokes.
- Trails are rebuilt from earlier analytic poses after any seek.
- A lock-on reticle frames the final measured result.

## Pitfalls

| Failure | Repair |
|---|---|
| Bloom turns every edge into fog | Reduce the wide pass and keep a thin bright core. |
| Trails change after scrubbing | Sample past analytic poses instead of framebuffer history. |
| A wireframe is unreadable | Remove hidden edges and slow rotation. |
| HUD decoration overwhelms the subject | Retain only labels tied to the argument. |

## Hero frame recipe

1. Draw a sparse original wire mechanism on the near-black ground.
2. Use one perspective frame and a topic-specific moving point.
3. Apply the three beam widths and bright dwell corners.
4. Place a 96px headline and one 132px figure in a clean overlay zone.
5. Add a short analytic trail and a steady lock-on bracket.
6. Check the encoded frame for preserved thin green lines and distinct labels.

Build this still before scoring the motion. Compare subject, hierarchy, medium and text at the intended delivery scale; a lint pass alone is not visual approval.
