/**
 * The key registry: TikZ option keys → jikz options, 1:1 onto the
 * typed API (plan M3 owns the breadth; this is the M2 core).
 *
 * Each key names what it maps to. A key the registry does not know is
 * returned in `unknown`, and the caller decides: the DSL throws, the
 * eject path notes it. Nothing here invents vocabulary — every entry
 * points at a key of `PenOptions`, `NodeOptions`, `EdgeOptions`,
 * `ScopeOptions` or `RenderStyle`.
 */
import { allShapes, color, length, pt } from 'jikz'
import type { Option } from './ast'
import type { IrRecord, IrTransform, IrValue } from './ir'

export type KeyContext = 'path' | 'node' | 'to' | 'scope'

export interface MappedOptions {
  /** `RenderStyle` entries in order (later wins), for `style:`. */
  style: (string | IrRecord)[]
  /** `TextStyle` — `text=`, `font=`. */
  textStyle: IrRecord
  /** Node geometry and placement keys (`NodeOptions` + `PlacementOptions`). */
  node: IrRecord
  /** Path-node keys that ride the segment: `pos`, and the anchor for `above` etc. */
  pos?: number
  sloped?: boolean
  /** `ArrowSpec`s from `->`-style keys. */
  arrowStart?: IrValue
  arrowEnd?: IrValue
  /** `to[…]` routing (`BezierRouteOptions`). */
  to: IrRecord
  /** `shorten <`/`shorten >`, px. */
  shortenStart?: number
  shortenEnd?: number
  /** Scope transform keys. */
  transform?: IrTransform
  /** Labels from `label=` and the quotes syntax. */
  labels: IrRecord[]
  /** `name=` on a node. */
  name?: string
  unknown: Option[]
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
  '>': 'to',
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
  '<': 'to',
}

const SHAPE_ALIASES: Record<string, string> = {
  circle: 'circle',
  rectangle: 'rectangle',
  ellipse: 'ellipse',
  diamond: 'diamond',
}

function shapeNamed(key: string): string | undefined {
  if (SHAPE_ALIASES[key]) return SHAPE_ALIASES[key]
  const camel = key.replace(/ (\w)/g, (_, c: string) => c.toUpperCase())
  return camel in allShapes ? camel : undefined
}

/** A TikZ length to frame units (`unit` px per unit). Bare numbers are pt in TikZ key values. */
function lengthPx(value: string): number {
  return /[a-z]$/i.test(value.trim()) ? length(value) : pt(Number(value))
}

function numberValue(value: string | undefined, key: string): number {
  const n = Number(value)
  if (value === undefined || !Number.isFinite(n)) throw new KeyError(`${key}: expected a number, got "${value ?? ''}"`)
  return n
}

export class KeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KeyError'
  }
}

function tryColor(expr: string): string | undefined {
  try {
    return color(expr)
  } catch {
    return undefined
  }
}

function parseArrows(key: string): { start?: IrValue; end?: IrValue } | undefined {
  // `->`, `<->`, `-stealth`, `stealth-stealth`, `-{Stealth[length=3pt]}`, `<<-`
  const m = /^(\{[^}]*\}|[^-{}]*)-(\{[^}]*\}|[^-{}]*)$/.exec(key)
  if (!m) return undefined
  const side = (spec: string, reversedIsStart: boolean): IrValue | undefined | false => {
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
        if (k === 'length' && v) record.length = lengthPx(v)
        else if (k === 'width' && v) record.width = lengthPx(v)
        else if (k === 'open') record.open = true
        else if (k === 'reversed') record.reversed = true
        else if (k === 'fill' && v) record.fill = color(v)
        else if (k === 'scale' && v) record.scale = Number(v)
        else return false
      }
      return record
    }
    // Legacy: `>` is the arrow head; `<` at the start means the same tip pointing outward.
    const simple = reversedIsStart ? spec.replace(/</g, '>') : spec
    if (simple === '>>' || simple === '<<') return ['to', 'to']
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
export function mapOptions(options: readonly Option[], context: KeyContext): MappedOptions {
  const out: MappedOptions = { style: [], textStyle: {}, node: {}, to: {}, labels: [], unknown: [] }
  let transform: IrTransform | undefined
  // TikZ `color=` (and a bare colour name) sets the colour that a later
  // bare `draw`/`fill` uses and the text colour; on a `\draw` path it is
  // the stroke, on a `\fill` the fill — so on a path it sets both.
  let current: string | undefined
  for (const o of options) {
    const { key, value } = o
    if (o.quoted) {
      const inner = mapOptions(o.quoted.options, 'node')
      const anchor = inner.node.anchor
      out.labels.push({
        text: o.quoted.text,
        ...(anchor !== undefined ? { at: opposite(String(anchor)) } : {}),
        ...(inner.pos !== undefined ? { pos: inner.pos } : {}),
        ...(inner.sloped ? { sloped: true } : {}),
        ...(Object.keys(inner.textStyle).length ? { style: inner.textStyle } : {}),
      })
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
    const bare = value === undefined && !shapeNamed(key) ? tryColor(key) : undefined
    if ((key === 'color' && value !== undefined) || bare !== undefined) {
      current = bare ?? color(value!)
      if (context !== 'node') out.style.push({ stroke: current, fill: current })
      out.textStyle = { ...out.textStyle, fill: current }
      continue
    }
    if (key === 'text' && value !== undefined) {
      out.textStyle = { ...out.textStyle, fill: color(value) }
      continue
    }
    if (key === 'line width' && value !== undefined) {
      out.style.push({ strokeWidth: lengthPx(value) })
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
    if (key === 'rounded corners') {
      out.style.push({ roundedCorners: value === undefined ? pt(4) : lengthPx(value) })
      continue
    }
    if (key === 'sharp corners') {
      out.style.push({ roundedCorners: 0 })
      continue
    }
    if (key === 'double' && value === undefined) {
      out.style.push('double')
      continue
    }
    if (key === 'shorten <' && value !== undefined) {
      out.shortenStart = lengthPx(value)
      continue
    }
    if (key === 'shorten >' && value !== undefined) {
      out.shortenEnd = lengthPx(value)
      continue
    }
    if (key === 'font' && value !== undefined) {
      const ts: Record<string, IrValue> = {}
      if (/\\bfseries|\\bf\b/.test(value)) ts.fontWeight = 'bold'
      if (/\\itshape|\\it\b|\\em\b/.test(value)) ts.fontStyle = 'italic'
      if (/\\tiny/.test(value)) ts.fontSize = pt(5)
      else if (/\\scriptsize/.test(value)) ts.fontSize = pt(7)
      else if (/\\footnotesize/.test(value)) ts.fontSize = pt(8)
      else if (/\\small/.test(value)) ts.fontSize = pt(9)
      else if (/\\large/i.test(value)) ts.fontSize = pt(12)
      else if (/\\huge/i.test(value)) ts.fontSize = pt(20)
      else if (/\\ttfamily|\\tt\b/.test(value)) ts.fontFamily = 'monospace'
      else if (/\\sffamily/.test(value)) ts.fontFamily = 'sans-serif'
      if (Object.keys(ts).length === 0) {
        out.unknown.push(o)
        continue
      }
      out.textStyle = { ...out.textStyle, ...ts }
      continue
    }
    if (value === undefined) {
      const arrows = parseArrows(key)
      if (arrows) {
        if (arrows.start !== undefined) out.arrowStart = arrows.start
        if (arrows.end !== undefined) out.arrowEnd = arrows.end
        if (arrows.start === undefined && arrows.end === undefined) {
          // `-` alone: no tips.
          out.arrowStart = 'none'
          out.arrowEnd = 'none'
        }
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

    // ── nodes ──
    if (context === 'node' || context === 'path') {
      if (key === 'name' && value !== undefined) {
        out.name = value
        continue
      }
      const shape = value === undefined ? shapeNamed(key) : key === 'shape' && value !== undefined ? shapeNamed(value) : undefined
      if (shape !== undefined) {
        out.node = { ...out.node, shape }
        continue
      }
      if (key === 'minimum size' && value !== undefined) {
        const n = lengthPx(value)
        out.node = { ...out.node, minWidth: n, minHeight: n }
        continue
      }
      if (key === 'minimum width' && value !== undefined) {
        out.node = { ...out.node, minWidth: lengthPx(value) }
        continue
      }
      if (key === 'minimum height' && value !== undefined) {
        out.node = { ...out.node, minHeight: lengthPx(value) }
        continue
      }
      if (key === 'inner sep' && value !== undefined) {
        out.node = { ...out.node, innerSep: lengthPx(value) }
        continue
      }
      if (key === 'outer sep' && value !== undefined) {
        out.node = { ...out.node, outerSep: lengthPx(value) }
        continue
      }
      if (key === 'text width' && value !== undefined) {
        out.node = { ...out.node, textWidth: lengthPx(value) }
        continue
      }
      if (key === 'align' && value !== undefined) {
        out.node = { ...out.node, align: value === 'flush left' ? 'left' : value === 'flush right' ? 'right' : value }
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
          out.node = { ...out.node, [dir]: m[2]!.trim(), ...(m[1] ? { distance: lengthPx(m[1]) } : {}) }
          continue
        }
        // `above=2pt`: an anchor plus a gap.
        if (/^[\d.]+\s*[a-z]*$/i.test(value)) {
          out.node = { ...out.node, anchor: placement, labelDistance: lengthPx(value) }
          continue
        }
      }
      const deprecated = /^(above|below|left|right|above left|above right|below left|below right) of$/.exec(key)
      if (deprecated && value !== undefined) {
        out.node = { ...out.node, [PLACEMENT_OF[deprecated[1]!]!]: value.trim() }
        continue
      }
      if (key === 'label' && value !== undefined) {
        out.labels.push(parseLabel(value))
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
        transform = { ...transform, shift: { dx: (transform?.shift?.dx ?? 0) + lengthPx(value), dy: transform?.shift?.dy ?? 0 } }
        continue
      }
      if (key === 'yshift' && value !== undefined) {
        transform = { ...transform, shift: { dx: transform?.shift?.dx ?? 0, dy: (transform?.shift?.dy ?? 0) + lengthPx(value) } }
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
    }

    out.unknown.push(o)
  }
  if (transform) out.transform = transform
  return out
}

/** `label=above:text`, `label={[red]below:text}`, `label=text`. */
function parseLabel(value: string): IrRecord {
  let rest = value.trim()
  let opts: MappedOptions | undefined
  if (rest.startsWith('[')) {
    const close = rest.indexOf(']')
    opts = mapOptions(parseInlineOptions(rest.slice(1, close)), 'node')
    rest = rest.slice(close + 1).trim()
  }
  const colon = rest.indexOf(':')
  const at = colon === -1 ? undefined : rest.slice(0, colon).trim()
  const text = colon === -1 ? rest : rest.slice(colon + 1).trim()
  // `label=above:` puts the label north of the node: the placement word
  // names the side, an anchor name or angle names it directly.
  const side = at !== undefined ? PLACEMENT_ANCHOR[at] : undefined
  return {
    text,
    ...(at ? { at: side !== undefined ? opposite(side) : /^-?[\d.]+$/.test(at) ? Number(at) : at } : {}),
    ...(opts && Object.keys(opts.textStyle).length ? { style: opts.textStyle } : {}),
  }
}

function parseInlineOptions(text: string): Option[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf('=')
      return eq === -1 ? { key: part } : { key: part.slice(0, eq).trim(), value: part.slice(eq + 1).trim() }
    })
}

/** The label position opposite an anchor: a node placed `above` has anchor south. */
function opposite(anchor: string): string {
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
