# Craft rules for every brief

These rules apply to every production built from this kit, whatever the brief or style. The brief sets the format; the style card sets the medium; these rules set the bar.

## Make it an explanation, not a title card
- **Hook, then get out of the way.** The opening question or contrast is on screen and readable inside about 2 seconds, and the first real visual idea follows immediately.
- **Something meaningful changes every 1 to 2 seconds.** A new mark, a label landing, a value moving, a camera move that reveals something. A hold longer than about 3 seconds needs a reason: the viewer is reading, or the moment is the payoff.
- **Show cause with motion.** Arrows draw on from cause to effect; they do not pop in finished. A process is shown happening, not described in a caption.
- **Labels land on what they label.** A label appears at its object, after or as the object appears, in the object's colour or tied to it by a leader line. Never a floating legend the eye has to match up.
- **Spend your one big emphasis on the most important beat.** Choose the moment that matters most and give it the strongest treatment: a push-in, a circle, a scale pulse, a colour change. Using it everywhere makes it mean nothing.
- **The headline figure gets the strongest landing.** It lands large (at least 96px), with the loudest sound in the piece, and is held long enough to read twice.
- **End on a takeaway held about 1 second** after it fully lands, then stop. No outro padding.

## Continuity or cut
- Treat each transition as a choice. Most new ideas belong in the scene you already have.
- **Carry forward what the viewer is tracking.** If an idea extends the previous one, keep its objects on screen and evolve them: yesterday's caption turns into today's title, a tally stretches out into bars, an outline reshapes itself, or the view glides across to a neighbouring area of the same picture.
- **Cut properly only when the subject genuinely changes**: a different topic, another time or place, a comparison of two states, a reveal. Make that change in the medium's own language (an eraser pass, a fold, a wipe, a turned page, the lights changing); the style card describes it.
- Balance the two. Cutting on every idea turns the film into a slide deck; refusing to ever cut turns it into wallpaper.

## Legibility (sizes at 1920x1080; scale for other formats)
- Headlines at least 66px. Every label the story depends on at least 42px, including small annotations and corner headers. Key numbers at least 96px.
- Frame each beat so the subject fills most of the screen. Assume the film is watched on a phone.
- If copy does not fit, cut or split the copy. Never shrink type below these floors to make it fit.
- One ground, one accent, and an alarm colour used rarely. The accent marks the single most important thing on screen at any moment.

## Make the medium believable
- Use the style card's own techniques for everything: surfaces, line quality, lettering, arrows, numbers, transitions and timing. Change the story and the subjects, never the medium.
- **Run the finishing passes on every frame at the card's stated strength.** Grain, paper, ink pooling, misregistration, glow and scanlines are what make the look read as real. Skipping them is the most common reason a style looks cheap.
- Draw every subject accurately for the topic. Do not carry over props from any reference unless they fit. Check that every fact, number and diagram on screen is correct.

## Determinism and speed
- The picture at time `t` depends on `t` alone. Take any randomness from seeded `H.rng` / `H.noise` calls; do not use `Math.random`, wall-clock time or anything left over from the previous draw. Textures that never change may be cached.
- Keep each frame well under 100 ms. Cache static layers with `H.offscreen`; spend the budget on what moves.

## Sound
- **Hit the frame.** Schedule each effect from the cue table the drawing code reads, so the sound and its visual event begin together.
- **Give sound to arrivals:** objects entering, captions settling, arrows finishing, transitions, mistakes and corrections, the headline figure (loudest) and the closing line (something that resolves).
- **Let mark-making be heard for as long as it lasts:** a pen or chalk scratch that runs the length of the draw-on, key clicks while letters type. A rolling number clicks no faster than 12 per second and slows down as it settles.
- **Mix in layers:** effects on top; any ambience or score sits well below (keep score gain at 0.6 or under); rarely more than three sounds overlap; leave a beat of quiet before a big hit so it lands.
- Use sounds true to the medium, not generic swooshes. With narration, render effects in voiceover mode so the voice stays on top.

## Done means verified
- Render with `starter/render.mjs`; pass `starter/determinism.mjs` and `starter/verify.sh` (exact frame count, BT.709 tags, audio present and length-matched).
- Read a contact sheet before calling it finished. Report what was checked mechanically, what was watched with sound, and what still needs a human verdict.
