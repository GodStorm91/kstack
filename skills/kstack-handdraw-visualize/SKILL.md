---
name: kstack:handdraw-visualize
description: Renders architecture diagrams, flows, UI mockups, comparison boards, bar charts, slides, and note cards as one offline HTML file in the hand-drawn Looseleaf style (Kevin Sans, paper stocks, seeded wobbly ink). Use when the user asks for a hand-drawn, sketchy, whiteboard, notebook, paper, or Looseleaf-style visual, diagram, or mockup.
---

# Hand-drawn visualize (Looseleaf style)

Write plain HTML with `ll-*` classes and `data-ink` attributes. Inline the result into one file. Verify it in headless Chrome. The runtime draws seeded ink strokes around the elements after fonts load, so the same HTML always gives the same drawing.

`SKILL_DIR` below means the directory that holds this file.

## Quick start

```bash
cp "$SKILL_DIR/templates/starter.html" ./diagram.src.html   # edit this file
node "$SKILL_DIR/scripts/inline.mjs" diagram.src.html diagram.html
node "$SKILL_DIR/scripts/check.mjs" diagram.html --png diagram.png
```

`check.mjs` exits 0 only when the page has no console errors or failed loads and no external requests. Every connector must resolve, every `data-ink` kind must exist, and Kevin Sans must load. The page must not overflow, and the ink must stay the same on re-render. Open `diagram.png` and look at it before you report success.

## Workflow

1. Choose a surface. Put a `ll-desk` class on `<body>`. Put each panel on a stock: `ll-paper`, `ll-card`, `ll-slip`, `ll-kraft`, `ll-pad`, `ll-sticky`, or `ll-slide` (1280×720).
2. Lay out with normal CSS. Use `ll-row`, `ll-stack`, `ll-grid` (`--cols`), or your own grid. Give connectors at least 80px of space between nodes, or the label hides the arrow.
3. Add ink. Put `data-ink="box"` (or `loop`, `cloud`, `underline`, and the other kinds) on the element to outline. Put `data-pen` on it for the pen color. For the full list, see [references/primitives.md](references/primitives.md).
4. Connect. Give each node an `id`. Inside the same `data-ink-canvas` container, add `<i data-ink="arrow" data-from="a" data-to="b">label</i>`. Use `data-route="elbow"` with `data-from-port` and `data-to-port` (`t`, `r`, `b`, or `l`) to route around other nodes.
5. Run `inline.mjs`, then run `check.mjs` at the width the reader uses (`--width`). Fix every failure in the source file, then run both steps again.
6. Inspect the PNG. Look for labels that cover their arrows, connectors that cross nodes, and tilted elements that overlap.

## Rules

- Keep the two placeholders exactly as they appear in the template: `<link rel="stylesheet" href="kstack:looseleaf.css">` and `<script src="kstack:looseleaf-ink.js"></script>`. The script tag goes last in `<body>`.
- Do not use CDNs, web fonts, or remote images. `inline.mjs` refuses them so that the output opens offline.
- Use ink for emphasis, and only on some elements. One red loop or wavy underline per idea is enough. Put pencil (`data-pen="pencil"`) on secondary structure.
- Use voices for meaning: `ll-note` for asides, `ll-you` for the reader's own writing (blue ink), and `ll-stamp` for status.
- Set `--v` on each bar as a fraction from 0 to 1, with `data-ink="bar"` and `data-color`. Write the numbers as labels, because the drawing does not show exact values.
- Use `data-seed="any-text"` to choose a different stroke variant for one element. The runtime makes seeds from the kind, the id, and the text, so an edit to the text changes the stroke.
- To add a custom mark, call `LooseleafInk.define('name', (ink, w, h, p) => LooseleafInk.shapes.box(ink, 0, 0, w, h, { pen: p.pen }))` in a script tag after the runtime. Then use `data-ink="name"`.

## Examples and references

- `examples/showcase.html` shows architecture, flow, mockup, comparison stickies, and a bar chart in one board. Use it as a pattern library.
- `templates/starter.html` is the minimal source to copy.
- [references/primitives.md](references/primitives.md) lists every `data-ink` kind, connector attribute, pen, and color.
- [references/tokens.md](references/tokens.md) lists the classes, the CSS variables, and how to rebuild the assets from upstream Looseleaf.
- For React or shadcn projects, use the upstream registry instead (`npx shadcn add @looseleaf/<component>`, see https://kevintngo.github.io/looseleaf/). This skill makes standalone HTML artifacts.

The ink engine, tokens, and Kevin Sans fonts come from Looseleaf (https://github.com/kevintngo/looseleaf), (c) 2026 Looseleaf contributors, under the MIT license (`LICENSE-looseleaf.txt`).
