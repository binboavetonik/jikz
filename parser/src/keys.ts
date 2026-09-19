/**
 * The key registry: TikZ option keys → jikz options, one to one onto
 * the typed API (plan §4, M3).
 *
 * Each entry names what it maps to. A key the registry does not know
 * comes back in `unknown` with the nearest known key as a hint, and
 * the caller decides: the DSL throws, the eject path notes it.
 * Nothing here invents vocabulary — every mapping lands on a key of
 * `PenOptions`, `NodeOptions`, `EdgeOptions`, `ScopeOptions`,
 * `RenderStyle` or `TextStyle`.
 *
 * Style *definitions* (`name/.style={…}`) and their expansion live in
 * `lower.ts`, because they are scoped state; by the time options reach
 * `mapOptions` every style has been inlined, as TikZ does.
 */
import { allShapes, color, length, mix, pt } from 'jikz'
import type { Option } from './ast'
import type { IrRecord, IrTransform, IrValue } from './ir'

export type KeyContext = 'path' | 'node' | 'to' | 'scope' | 'edge' | 'label'

export interface KeyEnv {
  /** The tip `>` stands for — TikZ `>=stealth`. Default `to`. */
  tip?: string
}

export interface MappedOptions {
  /** `RenderStyle` entries in order (later wins), for `style:`. */
  style: (string | IrRecord)[]
  /** `TextStyle` — `text=`, `font=`. */
  textStyle: IrRecord
  /** Node geometry and placement keys (`NodeOptions` + `PlacementOptions`). */
  node: IrRecord
  /** `xshift`/`yshift` on a node, px. */
  shiftPx?: { dx: number; dy: number }
  /** Path-node keys that ride the segment. */
  pos?: number
  sloped?: boolean
  /** `ArrowSpec`s from `->`-style keys. */
  arrowStart?: IrValue
  arrowEnd?: IrValue
  /** `to[…]`/`edge[…]` routing (`BezierRouteOptions`) and `loop`. */
  to: IrRecord
  loop?: string
  /** `shorten <`/`shorten >`. */
  shortenStart?: IrValue
  shortenEnd?: IrValue
  /** Scope transform keys. */
  transform?: IrTransform
  /** Labels and pins from `label=`, `pin=` and the quotes syntax. */
  labels: IrRecord[]
  pins: IrRecord[]
  /** `name=` on a node. */
  name?: string
  /** Scope-level state: `>=`, `node distance=`. */
  tip?: string
  nodeDistance?: IrValue
  /** `label distance=` inside a label's own options. */
  labelDistance?: IrValue
  /** Shading colours (`\shade`, `top color=` …), resolved to a gradient at the end. */
  gradient?: IrRecord
  /** `step`/`xstep`/`ystep` on the path, for its `grid` operations. */
  grid?: IrRecord
  unknown: (Option & { hint?: string })[]
}

const THICKNESS: Record<string, string> = {
  'ultra thin': 'ultra thin',
  'very thin': 'very thin',
  thin: 'thin',
  semithick: 'semithick',
  thick: 'thick',
  'very thick': 'very thick',
  'ultra thick': 'ultra thick',
}

const DASHES: Record<string, string> = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  'dash dot': 'dashdotted',
  'densely dashed': 'densely dashed',
  'loosely dashed': 'loosely dashed',
  'densely dotted': 'densely dotted',
  'loosely dotted': 'loosely dotted',
}

/** Bare placement keys → the node anchor that puts it there. */
const PLACEMENT_ANCHOR: Record<string, string> = {
  above: 'south',
  below: 'north',
  left: 'east',
  right: 'west',
  'above left': 'south east',
  'above right': 'south west',
  'below left': 'north east',
  'below right': 'north west',
  centered: 'center',
}

/** The unit step a placement word moves along, for `above=2pt`. */
const PLACEMENT_STEP: Record<string, { dx: number; dy: number }> = {
  above: { dx: 0, dy: 1 },
  below: { dx: 0, dy: -1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  'above left': { dx: -1, dy: 1 },
  'above right': { dx: 1, dy: 1 },
  'below left': { dx: -1, dy: -1 },
  'below right': { dx: 1, dy: -1 },
}

/** `right=of A` → `rightOf: 'A'`. */
const PLACEMENT_OF: Record<string, string> = {
  above: 'above',
  below: 'below',
  left: 'leftOf',
  right: 'rightOf',
  'above left': 'aboveLeft',
  'above right': 'aboveRight',
  'below left': 'belowLeft',
  'below right': 'belowRight',
}

const POS: Record<string, number> = {
  'at start': 0,
  'very near start': 0.125,
  'near start': 0.25,
  midway: 0.5,
  'near end': 0.75,
  'very near end': 0.875,
  'at end': 1,
}

/** Arrow tip names of the `arrows.meta` and legacy vocabularies → `ArrowTip`. */
const TIPS: Record<string, string> = {
  to: 'to',
  stealth: 'stealth',
  Stealth: 'stealth',
  latex: 'latex',
  Latex: 'latex',
  Triangle: 'to',
  '|': '|',
  Bar: '|',
  '||': '||',
  '*': 'circle',
  Circle: 'circle',
  o: 'openCircle',
}

const PATTERNS = new Set([
  'horizontal lines', 'vertical lines', 'north east lines', 'north west lines', 'grid', 'crosshatch', 'dots',
  'crosshatch dots', 'fivepointed stars', 'sixpointed stars', 'bricks', 'checkerboard',
])

const FADINGS = new Set(['west', 'east', 'north', 'south', 'fade out', 'fade in', 'circle with fuzzy edge'])

const SHAPE_ALIASES: Record<string, string> = {
  circle: 'circle',
  rectangle: 'rectangle',
  ellipse: 'ellipse',
  diamond: 'diamond',
}

/** Every key the registry answers to, per context, for the unknown-key hint. */
export const KNOWN_KEYS: Record<KeyContext, readonly string[]> = (() => {
  const paint = [
    'draw', 'fill', 'color', 'text', 'line width', ...Object.keys(THICKNESS), ...Object.keys(DASHES), 'dash pattern',
    'dash phase', 'opacity', 'draw opacity', 'fill opacity', 'line cap', 'line join', 'miter limit', 'rounded corners',
    'sharp corners', 'double', 'double distance', 'shorten <', 'shorten >', 'font', 'arrows', '->', '<-', '<->', '-',
    'pattern', 'pattern color', 'path fading', 'even odd rule', 'nonzero rule', 'help lines', 'top color', 'bottom color',
    'left color', 'right color', 'middle color', 'inner color', 'outer color', 'ball color', 'shading', 'shading angle',
  ]
  const routing = ['bend left', 'bend right', 'out', 'in', 'looseness', 'out looseness', 'in looseness', 'loop', 'loop above', 'loop below', 'loop left', 'loop right']
  const node = [
    'name', 'shape', ...Object.keys(SHAPE_ALIASES), 'minimum size', 'minimum width', 'minimum height', 'inner sep',
    'outer sep', 'text width', 'align', 'text centered', 'text ragged', 'anchor', 'rotate', 'sloped', 'pos',
    ...Object.keys(POS), ...Object.keys(PLACEMENT_ANCHOR), 'label', 'pin', 'label distance', 'pin distance', 'xshift',
    'yshift', 'node distance', 'auto', 'swap',
  ]
  const scope = ['shift', 'xshift', 'yshift', 'rotate', 'scale', 'node distance', '>', 'every node', 'every path', 'every label', 'every edge']
  return {
    path: [...paint, ...routing, 'step', 'xstep', 'ystep', '>'],
    node: [...paint, ...node],
    label: [...paint, ...node, 'label distance'],
    to: [...paint, ...routing],
    edge: [...paint, ...routing],
    scope: [...paint, ...scope],
  }
})()

export class KeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KeyError'
  }
}

function shapeNamed(key: string): string | undefined {
  if (SHAPE_ALIASES[key]) return SHAPE_ALIASES[key]
  const camel = key.replace(/ (\w)/g, (_, c: string) => c.toUpperCase())
  return camel in allShapes ? camel : undefined
}

/** A TikZ length as an IR value: kept as written, so the printer can say `cm(2)`. */
export function len(value: string): { $len: string } {
  lengthPx(value) // validates
  return { $len: value.trim().replace(/\s+/g, '') }
}

/** A TikZ length to px. A bare number is pt, as TikZ reads it in a key value. */
export function lengthPx(value: string): number {
  const v = value.trim()
  if (/^[-+]?[\d.]+$/.test(v)) return pt(Number(v))
  if (/em$/.test(v)) return pt(10) * parseFloat(v)
  if (/ex$/.test(v)) return pt(4.3) * parseFloat(v)
  return length(v)
}

function numberValue(value: string | undefined, key: string): number {
  const n = Number(value)
  if (value === undefined || !Number.isFinite(n)) throw new KeyError(`${key}: expected a number, got "${value ?? ''}"`)
  return n
}

function tryColor(expr: string): string | undefined {
  try {
    return color(expr)
  } catch {
    return undefined
  }
}

function parseArrows(key: string, env: KeyEnv): { start?: IrValue; end?: IrValue } | undefined {
  // `->`, `<->`, `-stealth`, `stealth-stealth`, `-{Stealth[length=3pt]}`, `<<-`
  const m = /^(\{[^}]*\}|[^-{}]*)-(\{[^}]*\}|[^-{}]*)$/.exec(key)
  if (!m) return undefined
  const arrowHead = env.tip ?? 'to'
  const side = (spec: string, isStart: boolean): IrValue | undefined | false => {
    if (spec === '') return undefined
    if (spec.startsWith('{')) {
      const inner = spec.slice(1, -1)
      const [name, ...rest] = inner.split('[')
      const tip = TIPS[name!.trim()]
      if (!tip) return false
      if (rest.length === 0) return tip
      const opts = rest.join('[').replace(/\]$/, '')
      const record: Record<string, IrValue> = { tip }
      for (const part of opts.split(',')) {
        const [k, v] = part.split('=').map((x) => x.trim())
        if (k === 'length' && v) record.length = len(v)
        else if (k === 'width' && v) record.width = len(v)
        else if (k === 'open') record.open = true
        else if (k === 'reversed') record.reversed = true
        else if (k === 'fill' && v) record.fill = color(v)
        else if (k === 'scale' && v) record.scale = Number(v)
        else return false
      }
      return record
    }
    // Legacy: `>` is the arrow head; `<` at the start is the same tip pointing outward.
    const simple = isStart ? spec.replace(/</g, '>') : spec
    if (simple === '>') return arrowHead
    if (simple === '>>') return [arrowHead, arrowHead]
    const tip = TIPS[simple]
    return tip ?? false
  }
  const start = side(m[1]!, true)
  const end = side(m[2]!, false)
  if (start === false || end === false) return undefined
  return { ...(start !== undefined ? { start } : {}), ...(end !== undefined ? { end } : {}) }
}

/**
 * Map an option list. `context` decides what bare words mean —
 * `circle` is a shape on a node and nothing on a path; `above` is an
 * anchor on a node and a label position on a path node.
 */
export function mapOptions(options: readonly Option[], context: KeyContext, outerEnv: KeyEnv = {}): MappedOptions {
  const out: MappedOptions = { style: [], textStyle: {}, node: {}, to: {}, labels: [], pins: [], unknown: [] }
  // `>=stealth` names the tip that `->` uses — wherever in the list it
  // sits, since TikZ reads `->` when the path is drawn.
  let env = outerEnv
  for (const o of options) {
    if (o.key === '>' && o.value !== undefined) {
      const tip = TIPS[o.value.trim()]
      if (!tip) throw new KeyError(`>=${o.value}: not an arrow tip`)
      env = { ...env, tip }
      out.tip = tip
    }
  }
  let transform: IrTransform | undefined
  // TikZ `color=` (and a bare colour name) sets the colour that a later
  // bare `draw`/`fill` uses and the text colour; on a `\draw` path it is
  // the stroke, on a `\fill` the fill — so on a path it sets both.
  let current: string | undefined
  const shade: Record<string, string> = {}
  let shading: string | undefined
  let shadingAngle = 0
  let pattern: string | undefined
  let patternColor: string | undefined
  const nodeish = context === 'node' || context === 'label'

  for (const o of options) {
    const { key, value } = o
    if (o.quoted) {
      out.labels.push(quotedLabel(o.quoted, env))
      continue
    }

    // ── paint ──
    if (key === 'draw') {
      out.style.push({ stroke: value === undefined ? (current ?? '#000000') : value === 'none' ? 'none' : color(value) })
      continue
    }
    if (key === 'fill') {
      out.style.push({ fill: value === undefined ? (current ?? '#000000') : value === 'none' ? 'none' : color(value) })
      continue
    }
    const bare = value === undefined && !shapeNamed(key) && !PLACEMENT_ANCHOR[key] ? tryColor(key) : undefined
    if ((key === 'color' && value !== undefined) || bare !== undefined) {
      current = bare ?? color(value!)
      if (!nodeish) out.style.push({ stroke: current, fill: current })
      out.textStyle = { ...out.textStyle, fill: current }
      continue
    }
    if (key === 'text' && value !== undefined) {
      out.textStyle = { ...out.textStyle, fill: color(value) }
      continue
    }
    if (key === 'line width' && value !== undefined) {
      out.style.push({ strokeWidth: len(value) })
      continue
    }
    if (value === undefined && THICKNESS[key]) {
      out.style.push(THICKNESS[key]!)
      continue
    }
    if (value === undefined && DASHES[key]) {
      out.style.push(DASHES[key]!)
      continue
    }
    if (key === 'dash pattern' && value !== undefined) {
      // `on 2pt off 1pt on 1pt off 1pt`
      const parts = [...value.matchAll(/(on|off)\s+([\d.]+\s*[a-z]*)/g)].map((m) => lengthPx(m[2]!))
      if (parts.length === 0) throw new KeyError(`dash pattern: expected "on <len> off <len>", got "${value}"`)
      out.style.push({ strokeDasharray: parts.map((n) => Math.round(n * 1000) / 1000) })
      continue
    }
    if (key === 'dash phase' && value !== undefined) {
      out.style.push({ strokeDashoffset: len(value) })
      continue
    }
    if (key === 'opacity') {
      const n = numberValue(value, key)
      out.style.push({ strokeOpacity: n, fillOpacity: n })
      continue
    }
    if (key === 'draw opacity') {
      out.style.push({ strokeOpacity: numberValue(value, key) })
      continue
    }
    if (key === 'fill opacity') {
      out.style.push({ fillOpacity: numberValue(value, key) })
      continue
    }
    if (key === 'line cap' && value !== undefined) {
      out.style.push({ strokeLinecap: value === 'rect' ? 'square' : value })
      continue
    }
    if (key === 'line join' && value !== undefined) {
      out.style.push({ strokeLinejoin: value })
      continue
    }
    if (key === 'miter limit' && value !== undefined) {
      out.style.push({ strokeMiterlimit: numberValue(value, key) })
      continue
    }
    if (key === 'rounded corners') {
      out.style.push({ roundedCorners: len(value ?? '4pt') })
      continue
    }
    if (key === 'sharp corners') {
      out.style.push({ roundedCorners: 0 })
      continue
    }
    if (key === 'double') {
      out.style.push(value === undefined ? 'double' : { doubleLine: { spacing: len('0.6pt'), innerColor: color(value) } })
      continue
    }
    if (key === 'double distance' && value !== undefined) {
      out.style.push({ doubleLine: { spacing: len(value) } })
      continue
    }
    if (key === 'even odd rule' && value === undefined) {
      out.style.push({ fillRule: 'evenodd' })
      continue
    }
    if (key === 'nonzero rule' && value === undefined) {
      out.style.push({ fillRule: 'nonzero' })
      continue
    }
    if (key === 'help lines' && value === undefined) {
      // TikZ: `line width=0.2pt, gray!50`.
      out.style.push({ stroke: color('gray!50'), strokeWidth: len('0.2pt') })
      continue
    }
    if (key === 'pattern' && value !== undefined) {
      if (!PATTERNS.has(value)) throw new KeyError(`pattern: "${value}" is not one of ${[...PATTERNS].join(', ')}`)
      pattern = value
      continue
    }
    if (key === 'pattern color' && value !== undefined) {
      patternColor = color(value)
      continue
    }
    if (key === 'path fading' && value !== undefined) {
      if (!FADINGS.has(value)) throw new KeyError(`path fading: "${value}" is not one of ${[...FADINGS].join(', ')}`)
      out.style.push({ fading: value })
      continue
    }
    if (/^(top|bottom|left|right|middle|inner|outer|ball) color$/.test(key) && value !== undefined) {
      shade[key.split(' ')[0]!] = color(value)
      continue
    }
    if (key === 'shading' && value !== undefined) {
      shading = value
      continue
    }
    if (key === 'shading angle' && value !== undefined) {
      shadingAngle = numberValue(value, key)
      continue
    }
    if (key === 'shorten <' && value !== undefined) {
      out.shortenStart = len(value)
      continue
    }
    if (key === 'shorten >' && value !== undefined) {
      out.shortenEnd = len(value)
      continue
    }
    if (key === 'font' && value !== undefined) {
      const ts = fontStyle(value)
      if (ts === undefined) {
        out.unknown.push({ ...o, hint: 'only \\bfseries, \\itshape, \\ttfamily, \\sffamily and the size commands are read' })
        continue
      }
      out.textStyle = { ...out.textStyle, ...ts }
      continue
    }
    if (key === '>' && value !== undefined) continue // read above
    if ((key === 'step' || key === 'xstep' || key === 'ystep') && value !== undefined && context === 'path') {
      out.grid = { ...out.grid, [key]: len(value) }
      continue
    }
    if (key === 'arrows' && value !== undefined) {
      const arrows = parseArrows(value.trim(), env)
      if (!arrows) throw new KeyError(`arrows: cannot read "${value}"`)
      applyArrows(out, arrows)
      continue
    }
    if (value === undefined) {
      const arrows = parseArrows(key, env)
      if (arrows) {
        applyArrows(out, arrows)
        continue
      }
    }

    // ── routing (`to`, `edge`) ──
    if (key === 'bend left' || key === 'bend right') {
      const angle = value === undefined ? 30 : numberValue(value, key)
      out.to = { ...out.to, bend: key === 'bend left' ? angle : -angle }
      continue
    }
    if (key === 'out' || key === 'in' || key === 'looseness' || key === 'out looseness' || key === 'in looseness') {
      const k = key === 'out looseness' ? 'outLooseness' : key === 'in looseness' ? 'inLooseness' : key
      out.to = { ...out.to, [k]: numberValue(value, key) }
      continue
    }
    const loop = /^loop(?: (above|below|left|right))?$/.exec(key)
    if (loop && value === undefined) {
      out.loop = loop[1] ?? 'above'
      continue
    }

    // ── nodes ──
    if (nodeish || context === 'path') {
      if (key === 'name' && value !== undefined) {
        out.name = value
        continue
      }
      const shape = value === undefined ? shapeNamed(key) : key === 'shape' ? shapeNamed(value) : undefined
      if (shape !== undefined) {
        out.node = { ...out.node, shape }
        continue
      }
      if (key === 'minimum size' && value !== undefined) {
        out.node = { ...out.node, minWidth: len(value), minHeight: len(value) }
        continue
      }
      if (key === 'minimum width' && value !== undefined) {
        out.node = { ...out.node, minWidth: len(value) }
        continue
      }
      if (key === 'minimum height' && value !== undefined) {
        out.node = { ...out.node, minHeight: len(value) }
        continue
      }
      if (key === 'inner sep' && value !== undefined) {
        out.node = { ...out.node, innerSep: len(value) }
        continue
      }
      if (key === 'outer sep' && value !== undefined) {
        out.node = { ...out.node, outerSep: len(value) }
        continue
      }
      if (key === 'text width' && value !== undefined) {
        out.node = { ...out.node, textWidth: len(value) }
        continue
      }
      if (key === 'align' && value !== undefined) {
        out.node = { ...out.node, align: value === 'flush left' ? 'left' : value === 'flush right' ? 'right' : value === 'flush center' ? 'center' : value }
        continue
      }
      if (key === 'text centered' && value === undefined) {
        out.node = { ...out.node, align: 'center' }
        continue
      }
      if (key === 'text ragged' && value === undefined) {
        out.node = { ...out.node, align: 'left' }
        continue
      }
      if (key === 'anchor' && value !== undefined) {
        out.node = { ...out.node, anchor: value }
        continue
      }
      if (key === 'rotate' && value !== undefined) {
        out.node = { ...out.node, rotate: numberValue(value, key) }
        continue
      }
      if (key === 'sloped' && value === undefined) {
        out.sloped = true
        continue
      }
      if (key === 'pos' && value !== undefined) {
        out.pos = numberValue(value, key)
        continue
      }
      if (value === undefined && POS[key] !== undefined) {
        out.pos = POS[key]!
        continue
      }
      if ((key === 'auto' || key === 'swap') && value === undefined) {
        // `auto` places a path node beside the line; jikz labels ride
        // above by default, so `auto` is the default and `swap` flips it.
        if (key === 'swap') out.node = { ...out.node, anchor: 'north' }
        continue
      }
      if (key === 'xshift' && value !== undefined) {
        out.shiftPx = { dx: (out.shiftPx?.dx ?? 0) + lengthPx(value), dy: out.shiftPx?.dy ?? 0 }
        continue
      }
      if (key === 'yshift' && value !== undefined) {
        out.shiftPx = { dx: out.shiftPx?.dx ?? 0, dy: (out.shiftPx?.dy ?? 0) + lengthPx(value) }
        continue
      }
      const placement = PLACEMENT_ANCHOR[key]
      if (placement !== undefined) {
        if (value === undefined) {
          out.node = { ...out.node, anchor: placement }
          continue
        }
        // positioning library: `right=of A`, `right=2cm of A`
        const m = /^(?:(\S+)\s+)?of\s+(.+)$/.exec(value)
        const dir = PLACEMENT_OF[key]
        if (m && dir) {
          out.node = { ...out.node, [dir]: m[2]!.trim(), ...(m[1] ? { distance: len(m[1]) } : {}) }
          continue
        }
        // `above=2pt`: the anchor, moved that far along the direction.
        const step = PLACEMENT_STEP[key]
        if (step && /^[-\d.]+\s*[a-z]*$/i.test(value)) {
          const d = lengthPx(value)
          const unitLength = Math.hypot(step.dx, step.dy)
          out.node = { ...out.node, anchor: placement }
          out.shiftPx = {
            dx: (out.shiftPx?.dx ?? 0) + (step.dx / unitLength) * d,
            dy: (out.shiftPx?.dy ?? 0) + (step.dy / unitLength) * d,
          }
          continue
        }
      }
      const deprecated = /^(above|below|left|right|above left|above right|below left|below right) of$/.exec(key)
      if (deprecated && value !== undefined) {
        out.node = { ...out.node, [PLACEMENT_OF[deprecated[1]!]!]: value.trim() }
        continue
      }
      if (key === 'label' && value !== undefined) {
        out.labels.push(parseLabel(value, env, false))
        continue
      }
      if (key === 'pin' && value !== undefined) {
        out.pins.push(parseLabel(value, env, true))
        continue
      }
      if (key === 'label distance' && value !== undefined) {
        if (context === 'label') out.labelDistance = len(value)
        else out.node = { ...out.node, labelDistance: len(value) }
        continue
      }
      if (key === 'pin distance' && value !== undefined) {
        out.labelDistance = len(value)
        continue
      }
      if (key === 'node distance' && value !== undefined) {
        out.nodeDistance = len(value)
        continue
      }
    }

    // ── scopes ──
    if (context === 'scope') {
      if (key === 'shift' && value !== undefined) {
        const m = /^\(?\s*([-+.\d]+)\s*,\s*([-+.\d]+)\s*\)?$/.exec(value)
        if (m) {
          transform = { ...transform, shift: { dx: Number(m[1]), dy: Number(m[2]) } }
          continue
        }
      }
      if (key === 'xshift' && value !== undefined) {
        out.shiftPx = { dx: (out.shiftPx?.dx ?? 0) + lengthPx(value), dy: out.shiftPx?.dy ?? 0 }
        continue
      }
      if (key === 'yshift' && value !== undefined) {
        out.shiftPx = { dx: out.shiftPx?.dx ?? 0, dy: (out.shiftPx?.dy ?? 0) + lengthPx(value) }
        continue
      }
      if (key === 'rotate' && value !== undefined) {
        transform = { ...transform, rotate: numberValue(value, key) }
        continue
      }
      if (key === 'scale' && value !== undefined) {
        transform = { ...transform, scale: numberValue(value, key) }
        continue
      }
      if (key === 'node distance' && value !== undefined) {
        out.nodeDistance = len(value)
        continue
      }
    }

    out.unknown.push({ ...o, hint: nearest(key, KNOWN_KEYS[context]) })
  }
  if (transform) out.transform = transform
  if (pattern !== undefined) {
    out.style.push({
      fillPattern: patternColor !== undefined ? { pattern: { $pattern: pattern }, color: patternColor } : { $pattern: pattern },
    })
  } else if (patternColor !== undefined) {
    throw new KeyError('pattern color without a pattern')
  }
  const gradient = buildGradient(shade, shading, shadingAngle)
  if (gradient) out.gradient = gradient
  return out
}

function applyArrows(out: MappedOptions, arrows: { start?: IrValue; end?: IrValue }): void {
  if (arrows.start === undefined && arrows.end === undefined) {
    // `-` alone: no tips.
    out.arrowStart = 'none'
    out.arrowEnd = 'none'
    return
  }
  if (arrows.start !== undefined) out.arrowStart = arrows.start
  if (arrows.end !== undefined) out.arrowEnd = arrows.end
}

function fontStyle(value: string): IrRecord | undefined {
  const ts: Record<string, IrValue> = {}
  if (/\\bfseries|\\bf\b|\\textbf/.test(value)) ts.fontWeight = 'bold'
  if (/\\itshape|\\it\b|\\em\b|\\textit/.test(value)) ts.fontStyle = 'italic'
  if (/\\tiny/.test(value)) ts.fontSize = len('5pt')
  else if (/\\scriptsize/.test(value)) ts.fontSize = len('7pt')
  else if (/\\footnotesize/.test(value)) ts.fontSize = len('8pt')
  else if (/\\small/.test(value)) ts.fontSize = len('9pt')
  else if (/\\normalsize/.test(value)) ts.fontSize = len('10pt')
  else if (/\\LARGE/.test(value)) ts.fontSize = len('17pt')
  else if (/\\Large/.test(value)) ts.fontSize = len('14pt')
  else if (/\\large/.test(value)) ts.fontSize = len('12pt')
  else if (/\\Huge/.test(value)) ts.fontSize = len('25pt')
  else if (/\\huge/.test(value)) ts.fontSize = len('20pt')
  if (/\\ttfamily|\\tt\b|\\texttt/.test(value)) ts.fontFamily = 'monospace'
  else if (/\\sffamily|\\textsf/.test(value)) ts.fontFamily = 'sans-serif'
  else if (/\\rmfamily/.test(value)) ts.fontFamily = 'serif'
  return Object.keys(ts).length ? ts : undefined
}

/**
 * TikZ shadings → `GradientSpec`. Axis shading runs bottom→top (jikz
 * angle 90 = up) and `shading angle` turns it counter-clockwise.
 */
function buildGradient(shade: Record<string, string>, shading: string | undefined, angle: number): IrRecord | undefined {
  const has = Object.keys(shade).length > 0 || shading !== undefined
  if (!has) return undefined
  if (shade.ball !== undefined || shading === 'ball') {
    const c = shade.ball ?? '#0000ff'
    return {
      type: 'radial',
      cx: 0.5,
      cy: 0.5,
      fx: 0.35,
      fy: 0.35,
      stops: [
        // The highlight is mostly white, the rim mostly the colour.
        { offset: 0, color: mix(c, '#ffffff', 0.2) },
        { offset: 1, color: mix(c, '#000000', 0.75) },
      ],
    }
  }
  if (shade.inner !== undefined || shade.outer !== undefined || shading === 'radial') {
    return {
      type: 'radial',
      stops: [
        { offset: 0, color: shade.inner ?? '#ffffff' },
        { offset: 1, color: shade.outer ?? '#808080' },
      ],
    }
  }
  if (shade.left !== undefined || shade.right !== undefined) {
    const stops: IrRecord[] = [{ offset: 0, color: shade.left ?? '#ffffff' }]
    if (shade.middle !== undefined) stops.push({ offset: 0.5, color: shade.middle })
    stops.push({ offset: 1, color: shade.right ?? '#ffffff' })
    return { type: 'linear', angle: angle, stops }
  }
  // Axis, vertical: TikZ's default is gray at the top, white at the bottom.
  const stops: IrRecord[] = [{ offset: 0, color: shade.bottom ?? '#ffffff' }]
  if (shade.middle !== undefined) stops.push({ offset: 0.5, color: shade.middle })
  stops.push({ offset: 1, color: shade.top ?? '#808080' })
  return { type: 'linear', angle: 90 + angle, stops }
}

/**
 * `label=above:text`, `label={[red, label distance=2pt]below:text}`,
 * `label=text`, `pin=30:text`, `pin={[pin edge={->}]left:text}`.
 */
function parseLabel(value: string, env: KeyEnv, pin: boolean): IrRecord {
  let rest = value.trim()
  let opts: MappedOptions | undefined
  let edge: IrValue | undefined
  if (rest.startsWith('[')) {
    const close = rest.indexOf(']')
    const inner = parseInlineOptions(rest.slice(1, close))
    const pinEdge = inner.find((o) => o.key === 'pin edge')
    if (pinEdge?.value !== undefined) {
      const e = mapOptions(parseInlineOptions(pinEdge.value), 'path', env)
      edge = e.style
    }
    opts = mapOptions(inner.filter((o) => o.key !== 'pin edge'), 'label', env)
    if (opts.unknown.length) throw new KeyError(`${pin ? 'pin' : 'label'}: unknown key "${opts.unknown[0]!.key}"`)
    rest = rest.slice(close + 1).trim()
  }
  const colon = rest.indexOf(':')
  const at = colon === -1 ? undefined : rest.slice(0, colon).trim()
  const text = colon === -1 ? rest : rest.slice(colon + 1).trim()
  const side = at !== undefined ? PLACEMENT_ANCHOR[at] : undefined
  return {
    text,
    ...(at ? { at: side !== undefined ? opposite(side) : /^-?[\d.]+$/.test(at) ? Number(at) : at } : {}),
    ...(opts?.labelDistance !== undefined ? { distance: opts.labelDistance } : {}),
    ...(opts && Object.keys(opts.textStyle).length ? { style: opts.textStyle } : {}),
    ...(edge !== undefined ? { edge } : {}),
  }
}

/** The quotes library: `"text" above`, `"text"' {red}`. */
function quotedLabel(q: { text: string; swap: boolean; options: readonly Option[] }, env: KeyEnv): IrRecord {
  const inner = mapOptions(q.options, 'label', env)
  if (inner.unknown.length) throw new KeyError(`"${q.text}": unknown key "${inner.unknown[0]!.key}"`)
  let anchor = inner.node.anchor !== undefined ? String(inner.node.anchor) : undefined
  if (q.swap) anchor = anchor === undefined ? 'north' : opposite(anchor)
  return {
    text: q.text,
    ...(anchor !== undefined ? { at: opposite(anchor) } : {}),
    ...(inner.pos !== undefined ? { pos: inner.pos } : {}),
    ...(inner.sloped ? { sloped: true } : {}),
    ...(inner.labelDistance !== undefined ? { distance: inner.labelDistance } : {}),
    ...(Object.keys(inner.textStyle).length ? { style: inner.textStyle } : {}),
  }
}

function parseInlineOptions(text: string): Option[] {
  const out: Option[] = []
  let depth = 0
  let start = 0
  const parts: string[] = []
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (c === '{' || c === '[' || c === '(') depth++
    else if (c === '}' || c === ']' || c === ')') depth--
    else if (c === ',' && depth === 0) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  parts.push(text.slice(start))
  for (const raw of parts) {
    const part = raw.trim()
    if (!part) continue
    const eq = part.indexOf('=')
    if (eq === -1) out.push({ key: part.replace(/\s+/g, ' ') })
    else {
      let value = part.slice(eq + 1).trim()
      if (value.startsWith('{') && value.endsWith('}')) value = value.slice(1, -1)
      out.push({ key: part.slice(0, eq).trim().replace(/\s+/g, ' '), value })
    }
  }
  return out
}

/** The label position opposite an anchor: a node placed `above` has anchor south. */
export function opposite(anchor: string): string {
  const table: Record<string, string> = {
    south: 'north',
    north: 'south',
    east: 'west',
    west: 'east',
    'south east': 'north west',
    'south west': 'north east',
    'north east': 'south west',
    'north west': 'south east',
  }
  return table[anchor] ?? anchor
}

/** The closest known key, for the unknown-key message. */
function nearest(key: string, known: readonly string[]): string | undefined {
  let best: { k: string; d: number } | undefined
  for (const k of known) {
    const d = distance(key, k)
    if (best === undefined || d < best.d) best = { k, d }
  }
  return best !== undefined && best.d <= Math.max(2, Math.floor(key.length / 3)) ? `did you mean "${best.k}"?` : undefined
}

function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0]!
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1))
      last = tmp
    }
  }
  return prev[b.length]!
}
