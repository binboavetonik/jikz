/**
 * Example layout checker — the automated half of "does the gallery
 * look right".
 *
 * Every defect this repo shipped in the 0.7.0 cookbook was visible in
 * the rendered SVG and invisible in the source: a label sitting on the
 * marker it names, two captions on top of each other, a curve running
 * off the edge of a hand-guessed viewBox. This renders every example
 * headlessly and measures for exactly those:
 *
 *   overlap   two text boxes intersect, or a text box sits on a point
 *             marker / node disc it is not the text of
 *   clipped   painted geometry falls outside the mounted viewBox
 *
 * Text extents come from the same font-metrics estimator the label
 * placer uses, so a finding here means the placement math disagrees
 * with itself — not that a proportional font rendered a few px wide.
 *
 * Run: npm run check:examples          (all examples)
 *      npm run check:examples -- venn  (just these ids)
 *
 * Findings are advisory: some are deliberate (text ON a path, a legend
 * over its own swatch). Silence a checked-and-intended one by adding
 * its id to ALLOWED below, WITH the reason.
 */
import { renderExamples } from './render-examples'
import { estimateLabelSize } from '../src/text/placeText'

/** Examples whose findings are intentional, and why. */
const ALLOWED: Record<string, string> = {
  'text-on-path': 'the whole point is glyphs riding the path',
  'katex-math': 'KaTeX formulas are foreignObject, not measurable here',
  'node-auto-size': 'demonstrates text filling its node exactly',
}

type Box = { x0: number; y0: number; x1: number; y1: number }
const overlaps = (a: Box, b: Box, slack = 0) =>
  a.x0 < b.x1 - slack && b.x0 < a.x1 - slack &&
  a.y0 < b.y1 - slack && b.y0 < a.y1 - slack

const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi

/**
 * Accumulated transform of an element's ancestors up to the root svg —
 * a scope's `translate`/`scale` group, and the picture-level canvas
 * transform. Without it, geometry inside a scope measures in the
 * scope's own coordinates and every scoped example reads as a pile of
 * overlapping text at the origin.
 *
 * Only the affine forms the renderer emits are handled; anything else
 * (a rotate) returns null and the element is skipped rather than
 * measured wrongly.
 */
function ancestorTransform(
  el: Element,
  root: Element
): { a: number; b: number; c: number; d: number; e: number; f: number } | null {
  let m = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const mul = (
    p: typeof m,
    q: typeof m
  ): typeof m => ({
    a: p.a * q.a + p.c * q.b,
    b: p.b * q.a + p.d * q.b,
    c: p.a * q.c + p.c * q.d,
    d: p.b * q.c + p.d * q.d,
    e: p.a * q.e + p.c * q.f + p.e,
    f: p.b * q.e + p.d * q.f + p.f,
  })
  const chain: Element[] = []
  for (let n: Element | null = el; n && n !== root; n = n.parentElement) chain.push(n)
  for (const n of chain.reverse()) {
    const t = n.getAttribute('transform')
    if (!t) continue
    for (const part of t.matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)) {
      const v = (part[2]!.match(NUM) ?? []).map(Number)
      switch (part[1]) {
        case 'translate':
          m = mul(m, { a: 1, b: 0, c: 0, d: 1, e: v[0] ?? 0, f: v[1] ?? 0 })
          break
        case 'scale':
          m = mul(m, { a: v[0] ?? 1, b: 0, c: 0, d: v[1] ?? v[0] ?? 1, e: 0, f: 0 })
          break
        case 'matrix':
          if (v.length < 6) return null
          m = mul(m, { a: v[0]!, b: v[1]!, c: v[2]!, d: v[3]!, e: v[4]!, f: v[5]! })
          break
        default:
          return null // rotate/skew: the box is no longer axis-aligned
      }
    }
  }
  return m
}

type M = NonNullable<ReturnType<typeof ancestorTransform>>
const apply = (m: M, x: number, y: number): [number, number] => [
  m.a * x + m.c * y + m.e,
  m.b * x + m.d * y + m.f,
]
const mapBox = (m: M, b: Box): Box => {
  const pts = [
    apply(m, b.x0, b.y0), apply(m, b.x1, b.y0),
    apply(m, b.x0, b.y1), apply(m, b.x1, b.y1),
  ]
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/** Boxes of the text runs in one rendered `<svg>`, with their content. */
function textBoxes(svg: Element): { box: Box; text: string }[] {
  const out: { box: Box; text: string }[] = []
  for (const el of Array.from(svg.querySelectorAll('text'))) {
    const m = ancestorTransform(el, svg)
    if (!m) continue
    const x = Number(el.getAttribute('x') ?? 0)
    const y = Number(el.getAttribute('y') ?? 0)
    const text = el.textContent ?? ''
    const fontSize = Number(el.getAttribute('font-size') ?? 12)
    const { width, height } = estimateLabelSize(text, { fontSize })
    const anchor = el.getAttribute('text-anchor') ?? 'middle'
    const x0 = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2
    out.push({
      text,
      box: mapBox(m, { x0, y0: y - height / 2, x1: x0 + width, y1: y + height / 2 }),
    })
  }
  return out
}

/**
 * Boxes of the small filled discs a picture paints for bare points and
 * dot-sized nodes — the markers labels are supposed to clear. Larger
 * shapes are skipped: a label inside a node's own box is normal.
 */
function markerBoxes(svg: Element): Box[] {
  const out: Box[] = []
  for (const el of Array.from(svg.querySelectorAll('circle'))) {
    const r = Number(el.getAttribute('r') ?? 0)
    if (r === 0 || r > 14) continue
    const m = ancestorTransform(el, svg)
    if (!m) continue
    const cx = Number(el.getAttribute('cx') ?? 0)
    const cy = Number(el.getAttribute('cy') ?? 0)
    out.push(mapBox(m, { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }))
  }
  return out
}

/** Extent of the painted geometry, ignoring text (measured above). */
function paintedBounds(svg: Element): Box | undefined {
  let b: Box | undefined
  let m: M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
  const grow = (rawX: number, rawY: number) => {
    const [x, y] = apply(m, rawX, rawY)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    b = b
      ? { x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x), y1: Math.max(b.y1, y) }
      : { x0: x, y0: y, x1: x, y1: y }
  }
  for (const el of Array.from(svg.querySelectorAll('line,rect,circle,ellipse'))) {
    if (el.closest('defs')) continue
    const t = ancestorTransform(el, svg)
    if (!t) continue
    m = t
    switch (el.tagName.toLowerCase()) {
      case 'line':
        grow(Number(el.getAttribute('x1')), Number(el.getAttribute('y1')))
        grow(Number(el.getAttribute('x2')), Number(el.getAttribute('y2')))
        break
      case 'rect': {
        const x = Number(el.getAttribute('x') ?? 0), y = Number(el.getAttribute('y') ?? 0)
        grow(x, y)
        grow(x + Number(el.getAttribute('width')), y + Number(el.getAttribute('height')))
        break
      }
      case 'circle': {
        const cx = Number(el.getAttribute('cx') ?? 0), cy = Number(el.getAttribute('cy') ?? 0)
        const r = Number(el.getAttribute('r') ?? 0)
        grow(cx - r, cy - r); grow(cx + r, cy + r)
        break
      }
      default: {
        const cx = Number(el.getAttribute('cx') ?? 0), cy = Number(el.getAttribute('cy') ?? 0)
        const rx = Number(el.getAttribute('rx') ?? 0), ry = Number(el.getAttribute('ry') ?? 0)
        grow(cx - rx, cy - ry); grow(cx + rx, cy + ry)
      }
    }
  }
  // Paths: only the ON-PATH nodes (`M`/`L` and the endpoint of a curve
  // or arc). Bezier control points and arc radii are not positions, and
  // counting them as ones reports curves as escaping when they do not.
  for (const el of Array.from(svg.querySelectorAll('path'))) {
    if (el.closest('defs')) continue
    const t = ancestorTransform(el, svg)
    if (!t) continue
    m = t
    const d = el.getAttribute('d') ?? ''
    for (const m of d.matchAll(/([MLTCSQA])([^A-Za-z]*)/gi)) {
      const nums = (m[2]!.match(NUM) ?? []).map(Number)
      const cmd = m[1]!.toUpperCase()
      if (cmd === 'M' || cmd === 'L' || cmd === 'T') {
        for (let i = 0; i + 1 < nums.length; i += 2) grow(nums[i]!, nums[i + 1]!)
      } else if (nums.length >= 2) {
        grow(nums[nums.length - 2]!, nums[nums.length - 1]!) // endpoint only
      }
    }
  }
  return b
}

let findings = 0
for (const { demo, container } of renderExamples(process.argv.slice(2))) {
  const reason = ALLOWED[demo.id]
  const problems: string[] = []

  for (const svg of Array.from(container.querySelectorAll('svg'))) {
    const texts = textBoxes(svg)
    const markers = markerBoxes(svg)

    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        if (overlaps(texts[i]!.box, texts[j]!.box, 1)) {
          problems.push(`text "${texts[i]!.text}" overlaps "${texts[j]!.text}"`)
        }
      }
      for (const m of markers) {
        if (overlaps(texts[i]!.box, m, 1)) {
          problems.push(`text "${texts[i]!.text}" sits on a marker`)
          break
        }
      }
    }

    const vb = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number)
    const painted = paintedBounds(svg)
    if (vb.length === 4 && painted) {
      const [vx, vy, vw, vh] = vb as [number, number, number, number]
      const out = [
        painted.x0 < vx - 1 && `left ${Math.round(vx - painted.x0)}px`,
        painted.y0 < vy - 1 && `top ${Math.round(vy - painted.y0)}px`,
        painted.x1 > vx + vw + 1 && `right ${Math.round(painted.x1 - vx - vw)}px`,
        painted.y1 > vy + vh + 1 && `bottom ${Math.round(painted.y1 - vy - vh)}px`,
      ].filter(Boolean)
      if (out.length) problems.push(`clipped by the viewBox: ${out.join(', ')}`)
    }
  }

  if (problems.length === 0) continue
  const unique = [...new Set(problems)]
  if (reason) {
    console.log(`· ${demo.id}: ${unique.length} allowed (${reason})`)
    continue
  }
  findings += unique.length
  console.log(`✗ ${demo.id}`)
  for (const p of unique) console.log(`    ${p}`)
}

console.log(
  findings === 0
    ? '\nno layout findings.'
    : `\n${findings} finding(s). Fix the example, then re-run — never hand-edit docs/cookbook/img/.`
)
process.exit(findings === 0 ? 0 : 1)
