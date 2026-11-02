import { Ink, inkViewBox } from '@/lib/ink/builder'
import * as S from '@/lib/ink/shapes'
import { flatFill, highlight, sweepFill, wash } from '@/lib/ink/fills'
import { inkDefsSvg, textureCssVars } from '@/lib/ink/textures'
import type { PaintKey } from '@/lib/ink/paint'
import type { PenName } from '@/lib/ink/types'
import { FACES, FILES } from 'kstack:fonts'

export interface Params {
  el: HTMLElement
  pen?: PenName
  color: PaintKey
  kind?: string
  side?: 'left' | 'right'
}
export type Primitive = (ink: Ink, w: number, h: number, p: Params) => void
type Side = 't' | 'r' | 'b' | 'l'
type Pt = [number, number]
type Box = { x: number; y: number; w: number; h: number }

const GAP = 6
const SVG_NS = 'http://www.w3.org/2000/svg'

const PRIMITIVES: Record<string, Primitive> = {
  box: (ink, w, h, p) => S.box(ink, 0, 0, w, h, { pen: p.pen }),
  dashed: (ink, w, h, p) => S.dashedBox(ink, 0, 0, w, h, { pen: p.pen ?? 'pencil' }),
  loop: (ink, w, h, p) => S.loop(ink, w / 2, h / 2, w / 2 + 8, h / 2 + 6, { pen: p.pen ?? 'redfelt' }),
  cloud: (ink, w, h, p) => S.cloud(ink, w / 2, h / 2, w, h, { pen: p.pen }),
  underline: (ink, w, h, p) => S.underline(ink, 0, h + 1, w, { pen: p.pen ?? 'redfelt', kind: p.kind as 'single' | 'double' | 'wavy' | undefined }),
  strike: (ink, w, h, p) => S.strike(ink, 0, h / 2, w, { pen: p.pen ?? 'redfelt', double: p.kind === 'double' }),
  highlight: (ink, w, h, p) => highlight(ink, 0, h * 0.1, w, h * 0.85, { pen: p.pen ?? 'hi' }),
  scribble: (ink, w, h, p) => S.scribble(ink, 0, 0, w, h, { pen: p.pen ?? 'pencil' }),
  bracket: (ink, w, h, p) =>
    S.bracket(ink, p.side === 'right' ? w + 4 : -4, 0, h, { pen: p.pen ?? 'redfelt', kind: (p.kind ?? 'curly') as 'square' | 'curly' | 'round', dir: p.side === 'right' ? -1 : 1 }),
  check: (ink, w, h, p) => S.check(ink, 0, 0, Math.min(w, h), { pen: p.pen ?? 'greenfelt' }),
  cross: (ink, w, h, p) => S.cross(ink, 0, 0, Math.min(w, h), { pen: p.pen ?? 'redfelt' }),
  star: (ink, w, h, p) => S.star(ink, w / 2, h / 2, Math.min(w, h) / 2, { pen: p.pen ?? 'm_tangerine' }),
  burst: (ink, w, h, p) => S.burst(ink, w / 2, h / 2, Math.min(w, h) / 2, { pen: p.pen ?? 'm_tomato' }),
  fill: (ink, w, h, p) => void sweepFill(ink, 0, 0, w, h, p.color),
  wash: (ink, w, h, p) => void wash(ink, [[0, 0], [w, 0], [w, h], [0, h]], p.color),
  // Same construction as Looseleaf's chart-ink bars: a flat rounded fill under an open ink outline.
  bar: (ink, w, h, p) => {
    const r = Math.min(3, Math.min(w, h) * 0.35)
    const arc = (cx: number, cy: number, a0: number): Pt[] =>
      Array.from({ length: 6 }, (_, i) => [cx + Math.cos(a0 + (i / 5) * (Math.PI / 2)) * r, cy + Math.sin(a0 + (i / 5) * (Math.PI / 2)) * r])
    flatFill(ink, [[0, h], ...arc(r, r, Math.PI), ...arc(w - r, r, Math.PI * 1.5), [w, h]], p.color, 0.95)
    ink.stroke([[0, h], [0, 0], [w, 0], [w, h]], p.pen ?? 'ink', { poly: true, round: r, wobble: 0.15, dry: 0, end: 'soft', start: 'soft' })
  },
}

const CONNECTORS: Record<string, true> = { arrow: true, line: true }

export interface InkStatus {
  ready: boolean
  drawn: number
  unresolved: string[]
  unknown: string[]
}
export const status: InkStatus = { ready: false, drawn: 0, unresolved: [], unknown: [] }

export function define(name: string, fn: Primitive): void {
  if (CONNECTORS[name]) throw new Error(`kstack ink: "${name}" is a connector and cannot be redefined`)
  PRIMITIVES[name] = fn
}

function seedFor(el: HTMLElement, kind: string, seen: Map<string, number>): string {
  if (el.dataset.seed) return el.dataset.seed
  const base = `${kind}|${el.id}|${el.dataset.from ?? ''}>${el.dataset.to ?? ''}|${(el.textContent ?? '').trim().slice(0, 32)}`
  const n = seen.get(base) ?? 0
  seen.set(base, n + 1)
  return `${base}#${n}`
}

function svgFor(ink: Ink, w: number, h: number): SVGSVGElement {
  const res = ink.toSvg({ w, h })
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('data-ll-ink', '')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('viewBox', inkViewBox(res))
  svg.setAttribute('width', String(w + 2 * res.pad))
  svg.setAttribute('height', String(h + 2 * res.pad))
  svg.style.cssText = `position:absolute;left:${-res.pad}px;top:${-res.pad}px;overflow:visible;pointer-events:none`
  svg.innerHTML = res.svg
  return svg
}

function drawElement(el: HTMLElement, kind: string, seed: string): void {
  const fn = PRIMITIVES[kind]
  if (!fn) {
    status.unknown.push(kind)
    return
  }
  const w = el.offsetWidth, h = el.offsetHeight
  if (!w || !h) return
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
  const d = el.dataset
  const ink = new Ink(seed)
  fn(ink, w, h, { el, pen: d.pen as PenName | undefined, color: (d.color ?? 'hi') as PaintKey, kind: d.kind, side: d.side === 'right' ? 'right' : 'left' })
  const svg = svgFor(ink, w, h)
  svg.style.zIndex = '-1'
  el.prepend(svg)
  status.drawn++
}

function rel(el: Element, canvas: HTMLElement): Box {
  const r = el.getBoundingClientRect(), c = canvas.getBoundingClientRect()
  return { x: r.left - c.left + canvas.scrollLeft - canvas.clientLeft, y: r.top - c.top + canvas.scrollTop - canvas.clientTop, w: r.width, h: r.height }
}

function autoSides(a: Box, b: Box): [Side, Side] {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2), dy = b.y + b.h / 2 - (a.y + a.h / 2)
  const gapX = Math.abs(dx) - (a.w + b.w) / 2, gapY = Math.abs(dy) - (a.h + b.h) / 2
  if (gapX >= gapY) return dx >= 0 ? ['r', 'l'] : ['l', 'r']
  return dy >= 0 ? ['b', 't'] : ['t', 'b']
}

function port(b: Box, s: Side): Pt {
  if (s === 't') return [b.x + b.w / 2, b.y - GAP]
  if (s === 'b') return [b.x + b.w / 2, b.y + b.h + GAP]
  if (s === 'l') return [b.x - GAP, b.y + b.h / 2]
  return [b.x + b.w + GAP, b.y + b.h / 2]
}

const horizontal = (s: Side) => s === 'l' || s === 'r'

function route(p1: Pt, s1: Side, p2: Pt, s2: Side, elbow: boolean): Pt[] {
  if (!elbow) return [p1, p2]
  if (horizontal(s1) && horizontal(s2)) {
    const mx = (p1[0] + p2[0]) / 2
    return [p1, [mx, p1[1]], [mx, p2[1]], p2]
  }
  if (!horizontal(s1) && !horizontal(s2)) {
    const my = (p1[1] + p2[1]) / 2
    return [p1, [p1[0], my], [p2[0], my], p2]
  }
  return horizontal(s1) ? [p1, [p2[0], p1[1]], p2] : [p1, [p1[0], p2[1]], p2]
}

function drawConnectors(canvas: HTMLElement, conns: HTMLElement[], seen: Map<string, number>): void {
  if (getComputedStyle(canvas).position === 'static') canvas.style.position = 'relative'
  const W = Math.max(canvas.scrollWidth, canvas.clientWidth), H = Math.max(canvas.scrollHeight, canvas.clientHeight)
  const ink = new Ink(`canvas|${canvas.id}|${conns.length}`)
  for (const el of conns) {
    const d = el.dataset
    const a = d.from ? document.getElementById(d.from) : null
    const b = d.to ? document.getElementById(d.to) : null
    if (!a || !b) {
      status.unresolved.push(`${d.from ?? '?'} -> ${d.to ?? '?'}`)
      continue
    }
    const A = rel(a, canvas), B = rel(b, canvas)
    const [s1, s2] = autoSides(A, B)
    const from = (d.fromPort?.[0] as Side | undefined) ?? s1, to = (d.toPort?.[0] as Side | undefined) ?? s2
    const pts = route(port(A, from), from, port(B, to), to, d.route === 'elbow')
    const sub = new Ink(seedFor(el, d.ink!, seen))
    const pen = (d.pen ?? 'ink') as PenName
    const head = d.ink === 'line' ? 'none' : ((d.head ?? 'v') as 'v' | 'two' | 'open' | 'solid' | 'none')
    for (let i = 0; i < pts.length - 2; i++) S.line(sub, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], { pen })
    const q = pts[pts.length - 2], r = pts[pts.length - 1]
    S.arrow(sub, q[0], q[1], r[0], r[1], { pen, head, curve: d.curve !== undefined ? Number(d.curve) : pts.length > 2 ? 0 : 0.05 })
    ink.raw(sub.toSvg({ w: W, h: H }).svg, 'top')
    if ((el.textContent ?? '').trim()) {
      const k = Math.floor((pts.length - 1) / 2)
      el.style.left = `${(pts[k][0] + pts[k + 1][0]) / 2}px`
      el.style.top = `${(pts[k][1] + pts[k + 1][1]) / 2}px`
      el.dataset.placed = ''
    }
    status.drawn++
  }
  const svg = svgFor(ink, W, H)
  svg.style.zIndex = '1'
  canvas.prepend(svg)
}

function ensureDefs(): void {
  if (document.getElementById('ll-ink-defs')) return
  const style = document.createElement('style')
  style.id = 'll-tex-vars'
  style.textContent = textureCssVars()
  document.head.append(style)
  const holder = document.createElement('div')
  holder.id = 'll-ink-defs'
  holder.innerHTML = inkDefsSvg()
  document.body.prepend(holder)
}

async function loadFonts(): Promise<void> {
  const buffers: Record<string, ArrayBuffer> = {}
  for (const [file, b64] of Object.entries(FILES)) buffers[file] = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer
  await Promise.all(
    FACES.map(async ({ family, file, desc }) => {
      const face = new FontFace(family, buffers[file], desc)
      document.fonts.add(face)
      await face.load()
    }),
  )
}

export function render(): InkStatus {
  ensureDefs()
  document.querySelectorAll('svg[data-ll-ink]').forEach((s) => s.remove())
  status.drawn = 0
  status.unresolved = []
  status.unknown = []
  const seen = new Map<string, number>()
  const byCanvas = new Map<HTMLElement, HTMLElement[]>()
  for (const el of document.querySelectorAll<HTMLElement>('[data-ink]')) {
    const kind = el.dataset.ink!
    if (CONNECTORS[kind] && (el.dataset.from || el.dataset.to)) {
      const canvas = el.closest<HTMLElement>('[data-ink-canvas]') ?? document.body
      byCanvas.set(canvas, [...(byCanvas.get(canvas) ?? []), el])
    } else {
      drawElement(el, kind, seedFor(el, kind, seen))
    }
  }
  for (const [canvas, conns] of byCanvas) drawConnectors(canvas, conns, seen)
  return status
}

async function boot(): Promise<void> {
  const fonts = loadFonts()
  if (document.readyState === 'loading') {
    const { promise, resolve } = Promise.withResolvers<void>()
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
    await promise
  }
  await fonts
  await document.fonts.ready
  render()
  status.ready = true
  document.documentElement.dataset.inkReady = 'true'
  let frame = 0
  let last = `${innerWidth}x${innerHeight}`
  new ResizeObserver(() => {
    const now = `${innerWidth}x${innerHeight}`
    if (now === last) return
    last = now
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => render())
  }).observe(document.documentElement)
}

if (typeof document !== 'undefined') void boot()
