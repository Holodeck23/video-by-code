# 2. Choose a stack by the picture you need

Choose the simplest stack that can make the approved design frame and survive the required export. More engines do not imply better direction. An elaborate 3D system can still produce generic shapes; a small Canvas page can tell a precise, engaging story.

The included production path is **Canvas 2D, JavaScript, Playwright and ffmpeg**. It provides the page contract, graphics and sound helpers, export and verification tools. Other stacks below are alternatives to adapt deliberately; they are not installed or implemented by this kit.

## Decision table

| Need | Good starting point | Main cost or risk |
|---|---|---|
| Diagrams, kinetic type, hand-drawn lines, data stories | Included Canvas 2D path | You own text layout and object bounds |
| Website-like UI, responsive text, CSS material effects | HTML/CSS with a seekable timeline | DOM layout, font readiness and export clock integration |
| React team, parameterized compositions and reusable UI | Remotion | Separate project setup, render lifecycle and licence review |
| HTML/GSAP composition with framework export tooling | HyperFrames | Version-specific composition and timeline contracts |
| Volumetric scenes, cameras, lights, bloom and materials | Three.js/WebGL | GPU variance, colour management, scene cleanup and capture |
| Procedural worlds, signed-distance fields, abstract material | Custom WebGL shader | Shader debugging, art direction and GPU cost |
| Physical sets, elaborate camera paths and authored lighting | Blender | Heavy renders, keyframe interpolation and output verification |
| Screenshot walkthrough, captions on static plates, batch pages | Python/Pillow + ffmpeg | Text shaping, antialiasing and smooth animation need care |
| Character or illustration-rich film | Hybrid images + code animation | Asset consistency, licensing, image generation cost and crop planning |

A hybrid is often appropriate: a painted plate for the setting, Canvas for explanatory overlays and a short WebGL shot for the key transformation. Keep one timeline and one export specification across them.

## Canvas 2D: the default for this kit

Canvas draws lines, paths, images and text directly into a bitmap. Its strengths are a small dependency surface, direct control over every pixel and straightforward absolute-time animation. The included [harness](../lib/API.md) supplies seeded randomness, noise, stroke reveal, cached paper textures and typography helpers.

Choose Canvas when the visual language is flat, graphic, typographic or deliberately handmade. Build repeated primitives once: arrows, callouts, text blocks, diagram nodes, cards, silhouettes and labels. Give each a single responsibility and explicit bounds.

Canvas does not retain semantic layout. Browser inspectors cannot tell you whether painted words overlap. A framework's “zero layout violations” can therefore mean that it saw no text elements. Use your own measured text bounds, render contact sheets and inspect final encoded frames. The same applies to contrast checkers that only inspect DOM styles.

Canvas state is mutable. Use balanced `save()` and `restore()` around helpers and reset the frame baseline. The browser's state stack includes transforms, clipping, opacity and drawing styles; see [MDN's save documentation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/save).

## DOM, GSAP and framework clocks

DOM authoring is attractive for responsive text, UI demonstrations and CSS effects such as glass panels. A paused animation timeline can be sought to time `t`, after assets are ready. Export must drive that seek explicitly. Timers, CSS animations running independently and late asynchronous timeline construction can break determinism.

When adopting HyperFrames or another HTML renderer, pin a release and run its own checks before exporting. Confirm its current rules for composition metadata, timeline registration, audio track identifiers and async readiness. Do not copy a command from an old experiment without checking the pinned CLI's `--help`.

When integrating a Canvas scene into a DOM timeline, make the timeline set a numeric playhead and call the same `draw(t)` used in testing. Do not implement one animation for preview and another for export.

## Remotion

Remotion is an option for teams already comfortable with React and composition-based video work. Its official documentation covers video/audio, captions, parameterized videos, rendering and a player. This kit does not include a Remotion project or claim a tested Remotion production path. Use [the official setup documentation](https://www.remotion.dev/docs/) and check [current licence terms](https://www.remotion.dev/docs/license) before commercial deployment.

Keep the same conceptual discipline: render from an explicit frame or time, pin assets and dependencies, gate readiness and verify the encoded result. Translate the design and timing data; do not transplant browser playback assumptions unchanged.

## Three.js and custom shaders

Use WebGL because the shot needs spatial depth, material, lighting or GPU-scale procedural detail. Design the hero subject before writing the scene graph. A box plus bloom is a rendering demonstration until it has a specific visual role.

Separate layers: world geometry and camera; post-processing; crisp typography and UI. Excess bloom can consume white type. Colour mixing in a linear rendering space may produce a brighter result than the intended display palette. Calibrate against exported frames, not a colour constant alone.

Use absolute-time transforms or explicitly seeked animation. For history-dependent effects, create a reproducible simulation from a seed and fixed timestep, with seek checkpoints if necessary. A live analyser can drive a preview, but export should load precomputed audio features sampled against the selected audio file.

The [official Three.js documentation](https://threejs.org/docs/) is the source for version-specific camera, animation, render target and material interfaces. The kit's Canvas capture expects `canvas#c`; adapting WebGL requires attention to render completion, framebuffer orientation and capture. Do not assume that a raw `readPixels` path and a browser PNG export share orientation or colour handling.

## Blender

Use Blender when the accepted look depends on a physical set, camera staging, lighting and materials that are easier to author in a 3D scene. Make a few final-quality stills first, then a 2–5 second camera test before committing to a whole film.

For scripted production, set interpolation explicitly on generated keys; a UI default does not prove the Python-created keys use it. Audit the actual rendered camera motion around fractional cuts. Set the frame range from an agreed integer-frame policy. Confirm output image count and expected completion markers, as well as process exit status.

Keep expensive rendering resumable. A chunk is reusable only when the scene revision, source hashes, dimensions, frame rate and frame interval match. An old PNG is not evidence that the current scene rendered successfully.

## Python and image-based films

Python plus Pillow is effective for simple walkthroughs and repeatable page layouts. Stream raw RGB frames to ffmpeg or render a short image sequence. Pin fonts and explicitly control text wrapping, crop boxes and resampling.

For image-based films, author points of interest rather than random zooms. A crop should lead the eye toward the thing named in the voice. Generate a wide image with room for intended moves and captions. Keep clock faces, diagrams and text overlays separate when mirroring a subject; mirroring the whole plate also mirrors those details.

## Make the choice testable

Before adopting a stack, perform one small capability test with the real design:

1. Render a final-size still with intended fonts and assets.
2. Render it at the beginning, after a far seek and at the beginning again.
3. Export a representative motion segment with real audio.
4. Decode and inspect the export at delivery size.
5. Record elapsed time, file size and the machine/browser/GPU used.

Measure your production. Flat graphic scenes, photo-rich frames and raymarched shots stress different parts of the pipeline. Render speed figures from a different scene are not a forecast. Pick a stack that your team can diagnose and hand over, then proceed to [design before code](03-design-before-code.md).
