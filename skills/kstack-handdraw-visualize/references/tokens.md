# Classes, tokens, and rebuild

## Classes

| Class | Use |
|---|---|
| `ll-desk` | Page body. Desk color, linen texture, vignette, Kevin Sans 18px. |
| `ll-paper`, `ll-card`, `ll-slip`, `ll-kraft` | Paper stocks with grain textures and their own shadows. |
| `ll-pad` | Ruled legal-pad sheet (28px line height). |
| `ll-sticky` + `ll-sticky--green`, `--orange`, `--pink`, `--blue` | Sticky note (default yellow). |
| `ll-slide` | 1280×720 paper slide. |
| `ll-tilt` (`--tilt: -2deg`) | Hand-placed rotation. |
| `ll-taped` (`--tape-tilt`) | Strip of tape on the top edge. |
| `ll-title`, `ll-subtitle` | Headings. |
| `ll-hand`, `ll-script`, `ll-type`, `ll-mono` | Kevin Sans Hand, Script, and Type, and a monospace fallback. |
| `ll-note`, `ll-you`, `ll-red` | Pencil aside, blue reader ink, red ink text. |
| `ll-node` (`<small>` for a subtitle) | Diagram node on slip paper. |
| `ll-btn`, `ll-field`, `ll-label`, `ll-pill`, `ll-stamp`, `ll-icon` | Mockup parts. Pair each with a `data-ink` kind. |
| `ll-row`, `ll-stack`, `ll-grid` (`--cols`) | Layout helpers. |
| `ll-bars`, `ll-bar` (`--v`), `ll-bar-label` | Bar chart. |

## CSS variables

The tokens are the upstream light theme. Use `var(--ll-<key>)` for any paint key in `primitives.md`. The useful variables are these:

- Surfaces: `--ll-desk`, `--ll-paper`, `--ll-card`, `--ll-slip`, `--ll-kraft`, `--ll-pad`.
- Ink: `--ll-ink`, `--ll-ink-you`, `--ll-pencil-text`, `--ll-red`, `--ll-green`, `--ll-hi`.
- Shadows: `--ll-shadow-paper`, `--ll-shadow-card`, `--ll-shadow-slip`, `--ll-shadow-sticky`, `--ll-shadow-pad`.
- Textures (the runtime sets these): `--ll-tex-relief`, `slip`, `fibre`, `cloud`, `mottle`, `linen`, `kraft`.

Dark theme, density variants, and the Tailwind `@theme` mapping are not in this build.

## Rebuild from upstream

The assets come from the `kstack` repository, not from this folder. In that repository, run the commands below:

```bash
npm install
npm run build          # clones Looseleaf at the pinned commit into .cache/looseleaf
LOOSELEAF_DIR=/path/to/looseleaf npm run build   # or use an existing checkout
npm run check          # inlines and checks examples/showcase.html
```

`tools/build.mjs` pins Looseleaf commit `4bdb647940e2fefb3cebb394f3bad25c766a27d2`. To move to a newer upstream, change `LOOSELEAF_SHA`, rebuild, run the check, and look at the PNG.
