# Narrated explainer brief

Build the picture around a locked narration recording. Confirm the audience, factual claim, delivery format and approved voice source. If narration does not exist, first produce a script for approval and a clearly labelled temporary scratch recording; do not imply the scratch voice is final.

Start with a 30-40-second landscape explanation at 1920x1080/30fps unless supplied content requires another format. Use one central example or mechanism, not a catalogue of loosely related features.

Write the spoken script first. Mark pauses, emphasis and the final reading hold. Record or obtain the intended narration, save its source hash, probe its duration and align the actual spoken words. An estimated word-per-minute budget is a planning aid, not timing evidence.

Create a cue table keyed to audio time: phrase start/end, highlighted words, visual event and caption. Validate the first sentence, every section boundary and the final phrase by listening. Correct any alignment that spans silence or invents speech in an instrumental interval.

Each visual should add information: show the state, perform a change, then show the consequence. Let one relevant subject survive between adjacent phrases. Use the selected style's materials and transitions, while keeping a stable zone for captions.

Show captions in short phrase groups with at most two readable lines. Keep essential type at least 42px for 1920x1080, then inspect at phone size. Caption wording must match the recording; never silently change the narrated claim.

Use the kit page contract: canvas id c, window.DURATION, window.__ready and a pure window.__renderFrame(t). Share a single cue table between animation, captions and window.scoreSound(k). For --voice export, keep effects minor and avoid competing procedural music. The renderer's voiceover mode reduces effects; it does not replace listening to the mix.

Render narration and picture from the same timeline origin. Pass the narration via --voice; do not start a live browser audio player during frame export. Confirm no first syllable or final breath was trimmed and that the encoded AAC track covers the picture duration.

Test a short narrated excerpt before the full render, then verify the entire MP4 mechanically and watch/listen through. Check intelligibility on small speakers, factual correctness, caption synchrony and unclipped audio. Record exactly which version of the script and audio was used.

Deliver source, script, timing data, audio identity, MP4, contact sheet and verification results. Flag any temporary voice, unapproved wording or approximate alignment explicitly.
