# Eight diagnostic style studies

These are original, simplified material studies built from the rewritten cards. Each
page uses a shared geometry helper and a separate visual treatment. They load no source
poster, source prompt program or network asset. They are not eight finished films or a
promise that every card automatically produces reference-quality art.

From the kit root:

```sh
node starter/render.mjs examples/styles/blueprint.html --stills 5.5 --outdir /absolute/path/to/stills
node starter/determinism.mjs examples/styles/blueprint.html
```

The eight pages are `whiteboard`, `watercolor`, `neon-sign`, `pixel-16bit`, `chalkboard`,
`blueprint`, `ukiyo-e` and `flat-space`. Each is an eight-second page with a diagnostic
hero at 5.5 seconds. All eight pass repeated out-of-order frame tests in the validated
environment. They are still studies with limited animation, not complete scene engines.

## Observed material cues and remaining gaps

| Study | What the still demonstrates | What still needs direction or finishing |
|---|---|---|
| Whiteboard | Semantic marker colours, rough traced strokes, ghost lesson and tool shadow | Sparse board composition; system handwriting differs from reference type |
| Watercolor | Translucent overlapping pigment, paper texture, pooling and reserved ground | Simple diagram geometry; weaker organic bleeding/granulation and illustrative detail |
| Neon | Mounted tubes, multi-radius glow, dark hardware and reflected sign | Display lettering is a system-font substitute; reflection is simpler and dimmer |
| Pixel 16-bit | Low-resolution nearest-neighbour image, palette bands, pixel glyphs and dialog | Simpler skyline, sprites and environmental storytelling |
| Chalkboard | Tooth-erased pigment, slate residue, clear chart and physical frame | Lower annotation density; uniform system letterforms |
| Blueprint | Cyanotype ground, white drafting lines, hatching, dimensions and title block | Simpler subject and fewer mechanical details/line-weight layers |
| Ukiyo-e | Flat ink keylines, carved foam fingers, printed gradient and wood grain | Simplified foam, registration and foreground; no detailed illustrated narrative |
| Flat space | Outline-free gradient planets, crescent shading, eye shapes and scale | Fewer designed subjects, simpler expression and less composition depth |

The neon plate is rasterised once after readiness and reused, with time-varying grain
applied afterwards. Recomputing native shadow blur after arbitrary seeks produced pixel
rounding changes; caching static material is the appropriate deterministic construction.

Visual comparison used archived posters privately. Those reference images are deliberately
excluded from the repository and distributable. System fonts and simplified subjects are
explicit substitutions. Use the card and reference-analysis chapter to direct a new
subject, inspect its encoded motion, and obtain human approval before production use.
