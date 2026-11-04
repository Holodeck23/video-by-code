# 3. Design before code

The most expensive failure is a technically successful film whose pictures do not communicate. Prevent it by deciding what the audience should see and understand before building a renderer or scene library.

## Write a production brief

Capture these decisions in a page the whole team can read:

| Decision | Useful answer |
|---|---|
| Audience | Who is watching, what they already know, and on what screen |
| Promise | One sentence explaining what they gain by watching |
| Format | Landscape explainer, vertical short, lyric film, instrumental or other |
| Length | An actual duration or range, with room for the closing beat |
| Audio | Approved take, hash, timing origin and whether speech may change |
| Tone | Concrete adjectives with visual consequences: restrained, tactile, urgent |
| Reference | Exact clip/version plus timestamps and frames used |
| Visual language | Ground, accent, type roles, mark-making, light and material |
| Exclusions | Specific patterns to avoid, based on this production |
| Delivery | Size, fps, audio, codec, captions and review requirements |

“Make it premium” is not enough. “One warm paper ground, black monoline diagrams, one red accent, generous margins and no simulated dashboard panels” is implementable.

## Study the exact reference

Confirm the reference file or URL and the particular passage the director meant. Similar titles, a creator's other videos and a shared genre are not interchangeable. Save frames actually used for comparison beside your notes, within your rights to use them.

Break the reference into measurable and perceptual properties:

- **Composition:** subject size, calm ground, alignment, depth and focal hierarchy.
- **Palette:** ground, main ink, accent, brightness range and how often accents appear.
- **Type:** display versus labels, weight, line length, reveal, active-word treatment.
- **Motion:** what moves, what rests, speed, easing, camera behavior and transition grammar.
- **Structure:** opening promise, evidence, variation, escalation, return and payoff.
- **Sound:** voice delivery, silence, effects and which visual events get emphasis.

Do not count only detector-visible hard cuts. A single camera shot may contain several distinct graphic plates. Mark semantic visual changes by watching, and sample motion sequences around them.

A contact sheet can show palette and composition. It cannot show whether a transition is elegant, a camera move jolts, a caption is readable long enough or a sound arrives late.

## Design a visual sentence for every story beat

An explainer picture should demonstrate the sentence, not merely decorate it. For “small delays accumulate,” let several timed delays stack into a visible total. For “one source, many outputs,” branch from one origin and keep that origin visible. For “verify the result,” show the actual observed result and the check that proves it.

For music, choose a recurring subject, visual rules and a progression. A chorus may return to the same subject with a changed state: more signals, less control, a larger counter, a damaged surface or an altered perspective. Repetition with a consequence is stronger than a succession of unrelated effects.

Use a shot table:

```text
start   end    meaning                  hero/action             transition
0.00    3.20   establish the problem    queue fills              jobs carry over
3.20    7.80   show the cause           one worker bottleneck   follow one job
7.80   12.00   show the improvement     parallel workers        same job finishes
12.00  15.00   prove the outcome        measured wait shrinks   return to overview
```

This is authored direction. Timing tools measure cues; they do not choose the metaphor.

Every row should answer: what is the focal object, what changes, why now, and what remains changed afterward? If those answers are missing, the scene often becomes generic animated wallpaper.

## Approve a hero frame

Choose the most representative difficult frame and draw it at final resolution. Include final typography and a meaningful subject. Resist coding a general engine until this frame works.

Check it at full size and at likely viewing size. For a vertical 1080×1920 production, a 360×640 view is a useful working check; the platform's actual overlays must still be tested separately. A 72 px label becomes 24 px at one-third scale. A hairline may disappear entirely.

Make hierarchy explicit:

1. The first thing noticed should be the thing the story is about.
2. A second layer should explain the relationship or consequence.
3. Small labels should reward attention without carrying indispensable meaning.

Reserve caption space in the design rather than placing text on top at the end. Keep one dominant accent role: active word, warning, selected object or current event. If every surface glows, the accent no longer directs attention.

## Use style cards as production instructions

The [style-card index](../prompts/styles/INDEX.md) describes many visual approaches. A card is useful when its instructions translate into visible choices: palette values, ground construction, line behavior, type sizes, motion rules, sound treatment and a hero-frame recipe.

Choose a card because its visual grammar serves the subject. A terminal can support sequential computation; paper can support explanation and revision; isometric space can show a system; a print poster can make a forceful claim. Change a card when its conventions hurt clarity.

Rewriting a reference means extracting principles and creating fresh execution. Change the imagery, wording, geometry, arrangement and signature details. A mechanical overlap check can identify shared word runs, but cannot establish originality or permission. Retain provenance, avoid copying distinctive compositions, and verify any third-party code or asset licence separately.

## Build motion from purpose

Use motion to reveal order, cause, comparison, focus or change of state. Before adding motion, state its job. A label that bobs forever usually has no informational purpose. A label that settles after its object arrives tells the viewer that the relationship is established.

A useful motion phrase has anticipation, action and a readable hold. The hold is part of the animation. Do not spend most of a two-second shot entering and exiting before the audience can read it.

Choose a small grammar of transitions: match position, carry an object forward, draw a boundary, fold or wipe with a meaningful shape. A dissolve is appropriate when continuity matters; a cut can be appropriate on a clear beat. Whole-frame blur or accumulated frame blending can smear the subject or create ghosts across cuts.

For still-image films, a camera move should expose or focus something specific. Plan the point of interest and crop path. Vary scale and framing by story function rather than applying the same slow zoom to every image.

## Review the pilot before scaling

Make a 5–10 second pilot using real audio and export it. Compare it with the reference at equivalent viewing size. Ask:

- Does the subject read immediately?
- Can someone explain the visible cause and effect on mute?
- Does the chosen visual system have enough range for the full duration?
- Is the motion smooth and intentional at the chosen frame rate?
- Does typography remain readable after encoding?
- Does sound support the message without masking it?

Record specific corrections with timestamps or image coordinates. “Too bright in the lower half at 4.2 s; the label loses contrast” is actionable. “Needs more energy” is a discussion prompt, not an implementation specification.

If the pilot fails, revise the design or metaphor before multiplying scenes. Reuse stable plumbing across productions, but make each film's visual idea appropriate to its own message. Then establish the audio and timing in [chapter 4](04-music-audio-and-timing.md).
