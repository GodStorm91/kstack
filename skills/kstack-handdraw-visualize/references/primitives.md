# data-ink reference

The runtime measures each `[data-ink]` element after layout and fonts load. It then prepends an absolutely positioned SVG behind the content (`z-index: -1`). The SVG uses the size of the element's border box, so padding sets how far the ink sits from the text. The runtime gives a static host `position: relative`. Inline hosts (`span`, `b`, `mark`, and similar) become `inline-block`.

## Element kinds

| `data-ink` | Draws | Extra attributes | Default pen or color |
|---|---|---|---|
| `box` | Wobbly rectangle | none | `ink` |
| `dashed` | Dashed rectangle | none | `pencil` |
| `loop` | Ellipse circled around the element | none | `redfelt` |
| `cloud` | Cloud outline | none | `ink` |
| `underline` | Line under the text | `data-kind`: `single`, `double`, `wavy` | `redfelt` |
| `strike` | Strike-through | `data-kind="double"` | `redfelt` |
| `highlight` | Marker swipe behind the text | none | `hi` pen |
| `scribble` | Scribbled-out area | none | `pencil` |
| `bracket` | Bracket on one side | `data-side`: `left`, `right`. `data-kind`: `curly`, `square`, `round` | `redfelt` |
| `check` | Check mark (size is the smaller side) | none | `greenfelt` |
| `cross` | Cross mark | none | `redfelt` |
| `star` | Filled star | none | `m_tangerine` |
| `burst` | Starburst | none | `m_tomato` |
| `fill` | Marker sweep fill (buttons, pills) | `data-color` | `hi` |
| `wash` | Flat watercolor wash | `data-color` | `hi` |
| `bar` | Chart bar: flat fill plus open ink outline | `data-color`, `data-pen` | `hi`, `ink` |

All element kinds accept `data-pen` and `data-seed`. An element with a width or height of zero gets no ink.

## Connectors

A connector is any `data-ink="arrow"` or `data-ink="line"` element with `data-from` or `data-to`. The runtime draws all connectors of one `[data-ink-canvas]` container (or of `<body>`) into one SVG above the nodes.

| Attribute | Values | Effect |
|---|---|---|
| `data-from`, `data-to` | element ids | The two ends. A missing id goes into `status.unresolved`, and `check.mjs` fails. |
| `data-from-port`, `data-to-port` | `t`, `r`, `b`, `l` | The side to attach to. The default side faces the other node. |
| `data-route` | `elbow` | Right-angle route. The default is a direct line. |
| `data-head` | `v`, `two`, `open`, `solid`, `none` | Arrowhead style (`line` always uses `none`). |
| `data-curve` | number, for example `0.2` | Bow of the last segment. |
| `data-pen` | any pen | Stroke pen. |

The text inside the connector becomes a label. The runtime centers the label on the middle segment, and the label gets a paper background. An empty connector stays hidden.

## Pens (`data-pen`)

`ink`, `blue`, `pencil`, `bluepencil`, `redfelt`, `greenfelt`, `focus`, `red`, `green`, `orange`, `terracotta`, and `hi`. Add `.fine` for a thin line or `.brush` for a thick line, for example `ink.fine` or `redfelt.brush`. The markers are `m_<accent>` and the felts are `f_<accent>`.

The accent names are `tomato`, `tangerine`, `lemon`, `grass`, `teal`, `sky`, `grape`, and `bubblegum`.

## Colors (`data-color`)

Any Looseleaf paint key: `hi`, `marker`, `red`, `green`, `focus`, `ink-you`, `pencil-mark`, `tape`, the accents above, and `sticky-yellow`, `sticky-green`, `sticky-orange`, `sticky-pink`, `sticky-blue`. Each key maps to `var(--ll-<key>)`.

## JavaScript API (`window.LooseleafInk`)

- `status`: `{ ready, drawn, unresolved, unknown }`. The runtime also sets `html[data-ink-ready="true"]` after the first render.
- `render()`: redraws all ink. Call it after you change the DOM. The runtime redraws by itself when the viewport size changes.
- `define(name, (ink, w, h, params) => void)`: registers a new element kind. It cannot replace `arrow` or `line`.
- `Ink`, `shapes`, `fills`, `PENS`, `inkViewBox`: the Looseleaf engine, for custom kinds. `shapes` has `box`, `loop`, `arrow`, `squiggle`, `underline`, and more.
