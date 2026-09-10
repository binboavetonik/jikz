/**
 * SVGBuilder — a minimal structured AST for SVG emission.
 *
 * Two exits:
 *   - `toSVG(viewBox?)` returns an SVG string (runs in any environment,
 *     including Node with zero DOM dependency).
 *   - `mount(domContainer)` creates real DOM elements via
 *     `document.createElementNS` (browser only, ~50 LOC).
 *
 * SVGBuilder also satisfies the subset of the SVG.js API that SVGRenderer
 * uses (`circle`, `line`, `rect`, `ellipse`, `path`, `text`, `group`,
 * `foreignObject`, `defs`, `marker`, `.attr`, `.addClass`, `.id`, `.font`,
 * `.move`, `.center`). Existing renderer code continues to call those
 * methods unchanged.
 */

import type { SVGAnimation } from './Renderer'

export type Attrs = Record<string, unknown>

/**
 * Root viewport for `toSVG`/`mount`: emitted as
 * `viewBox="x y width height"`. `x`/`y` default to 0 — a non-zero
 * origin is how content that lives in negative coordinates (or any
 * auto-fit bounding box) maps into the viewport.
 */
export interface ViewBoxSpec {
  x?: number
  y?: number
  width: number
  height: number
}

/** A child of an {@link SVGNode}: a nested element or a raw, unescaped markup fragment. */
export type SVGChild = SVGNode | { readonly raw: string }

/** Plain-data SVG element: tag, attributes, and children. The DOM-free tree the builder assembles. */
export interface SVGNode {
  tag: string
  attrs: Attrs
  children: SVGChild[]
  /** When set, serializes as `<tag attrs>text</tag>` with text-content escaping. */
  text?: string
}

/**
 * Wrapper over an {@link SVGNode} with the chainable element API
 * (`attr`, `add`, `text`, …). Base class of {@link SVGBuilder}.
 */
export class SVGElement {
  constructor(public node: SVGNode) {}

  attr(a: Attrs): this {
    for (const [k, v] of Object.entries(a)) {
      this.node.attrs[k] = v
    }
    return this
  }

  addClass(className: string): this {
    const existing = this.node.attrs.class as string | undefined
    this.node.attrs.class = existing ? `${existing} ${className}` : className
    return this
  }

  id(value: string): this {
    this.node.attrs.id = value
    return this
  }

  /**
   * Append a SMIL `<animate>`/`<animateTransform>` child. Plain data —
   * serializes via toString() and mounts via createDOM like any child.
   */
  animate(spec: SVGAnimation): this {
    const attrs: Attrs = { attributeName: spec.attributeName, dur: spec.dur }
    if (spec.values !== undefined) attrs.values = spec.values
    if (spec.from !== undefined) attrs.from = spec.from
    if (spec.to !== undefined) attrs.to = spec.to
    if (spec.repeatCount !== undefined) attrs.repeatCount = spec.repeatCount
    if (spec.begin !== undefined) attrs.begin = spec.begin
    if (spec.keyTimes !== undefined) attrs.keyTimes = spec.keyTimes
    if (spec.calcMode !== undefined) attrs.calcMode = spec.calcMode
    if (spec.keySplines !== undefined) attrs.keySplines = spec.keySplines
    if (spec.fill !== undefined) attrs.fill = spec.fill
    if (spec.type !== undefined) attrs.type = spec.type
    this.node.children.push({ tag: spec.kind ?? 'animate', attrs, children: [] })
    return this
  }

  /**
   * SVG.js-style font options. Maps the SVG.js key aliases (family/size/
   * weight/anchor/style) onto the actual SVG attribute names.
   */
  font(opts: Attrs): this {
    const keyMap: Record<string, string> = {
      family: 'font-family',
      size: 'font-size',
      weight: 'font-weight',
      style: 'font-style',
      anchor: 'text-anchor',
      leading: 'data-leading',
      fill: 'fill',
    }
    for (const [k, v] of Object.entries(opts)) {
      const mapped = keyMap[k] ?? k
      this.node.attrs[mapped] = v
    }
    return this
  }

  move(x: number, y: number): this {
    this.node.attrs.x = x
    this.node.attrs.y = y
    return this
  }

  /**
   * SVG.js semantics: positions the element's center at (x, y). For text
   * we record middle alignment attributes; the rasterizer (or mount()
   * target) interprets them the same way SVG natively would.
   */
  center(x: number, y: number): this {
    this.node.attrs['text-anchor'] = 'middle'
    this.node.attrs['dominant-baseline'] = 'middle'
    this.node.attrs.x = x
    this.node.attrs.y = y
    return this
  }
}

/**
 * The string-first SVG assembler at the bottom of the stack: a
 * DOM-free element tree that serializes to markup via `toString()`
 * (Node/SSR) or attaches live via `mount()` (browser). `picture()`
 * and `SVGRenderer` both compile through this class.
 */
export class SVGBuilder extends SVGElement {
  constructor(node?: SVGNode) {
    super(node ?? { tag: 'svg', attrs: {}, children: [] })
  }

  // ───────────────────────────────────────────────────────────────
  // Generic element construction
  // ───────────────────────────────────────────────────────────────

  /**
   * Append a child element with the given tag and attrs. Returns a
   * builder anchored at the new element so further calls chain.
   */
  el(tag: string, attrs: Attrs = {}): SVGBuilder {
    const child: SVGNode = { tag, attrs, children: [] }
    this.node.children.push(child)
    return new SVGBuilder(child)
  }

  /**
   * Append a verbatim XML string. Used for content whose structure is
   * controlled elsewhere (e.g. pattern definitions assembled as strings
   * in FillPattern/Gradient). The string is emitted as-is by `toSVG()`
   * and parsed into DOM by `mount()`.
   *
   * The caller is responsible for ensuring the string is well-formed
   * XML and is safe to embed (escape user input before calling).
   */
  raw(xml: string): this {
    this.node.children.push({ raw: xml })
    return this
  }

  /**
   * Append a child that has already been constructed as an SVGNode. Used
   * when one subsystem builds a pattern/gradient/filter tree and wants
   * to graft it into a parent (typically `<defs>`).
   */
  appendNode(child: SVGNode): void {
    this.node.children.push(child)
  }

  // ───────────────────────────────────────────────────────────────
  // SVG.js-compatible container API
  // ───────────────────────────────────────────────────────────────

  circle(diameter: number): SVGElement {
    return new SVGElement(this.pushChild({
      tag: 'circle',
      attrs: { r: diameter / 2 },
      children: [],
    }))
  }

  line(x1: number, y1: number, x2: number, y2: number): SVGElement {
    return new SVGElement(
      this.pushChild({ tag: 'line', attrs: { x1, y1, x2, y2 }, children: [] })
    )
  }

  rect(width: number, height: number): SVGElement {
    return new SVGElement(
      this.pushChild({ tag: 'rect', attrs: { width, height }, children: [] })
    )
  }

  ellipse(width: number, height: number): SVGElement {
    return new SVGElement(
      this.pushChild({
        tag: 'ellipse',
        attrs: { rx: width / 2, ry: height / 2 },
        children: [],
      })
    )
  }

  path(d: string): SVGElement {
    return new SVGElement(
      this.pushChild({ tag: 'path', attrs: { d }, children: [] })
    )
  }

  text(content: string): SVGElement {
    return new SVGElement(
      this.pushChild({ tag: 'text', attrs: {}, children: [], text: content })
    )
  }

  group(): SVGBuilder {
    const g: SVGNode = { tag: 'g', attrs: {}, children: [] }
    this.node.children.push(g)
    return new SVGBuilder(g)
  }

  foreignObject(width: number, height: number): SVGBuilder {
    // Returns a full builder (not just SVGElement) so callers can append
    // children — e.g. KaTeX HTML via .raw() — without touching the DOM.
    return new SVGBuilder(
      this.pushChild({
        tag: 'foreignObject',
        attrs: { width, height },
        children: [],
      })
    )
  }

  clear(): void {
    this.node.children.length = 0
  }

  /**
   * Returns a builder over the <defs> child of this element, creating it
   * on first access. <defs> is unshifted to the front so output order is
   * stable (defs first, then content).
   */
  defs(): SVGBuilder {
    const existing = this.node.children.find(
      (c): c is SVGNode => !('raw' in c) && c.tag === 'defs'
    )
    if (existing) {
      return new SVGBuilder(existing)
    }
    const defs: SVGNode = { tag: 'defs', attrs: {}, children: [] }
    this.node.children.unshift(defs)
    return new SVGBuilder(defs)
  }

  /**
   * SVG.js-compatible marker creator. `callback` receives a builder over
   * the new <marker> so the caller can populate its contents (`add.path(d)`
   * etc.). Sets viewBox="0 0 w h" like SVG.js does — without it the
   * artwork is NOT scaled into the markerWidth x markerHeight viewport,
   * and strict renderers clip the overflow (bottom-clipped arrowheads).
   */
  marker(
    width: number,
    height: number,
    callback: (add: SVGBuilder) => void
  ): SVGElement {
    const m: SVGNode = {
      tag: 'marker',
      attrs: {
        markerWidth: width,
        markerHeight: height,
        viewBox: `0 0 ${width} ${height}`,
      },
      children: [],
    }
    this.node.children.push(m)
    callback(new SVGBuilder(m))
    return new SVGElement(m)
  }

  // ───────────────────────────────────────────────────────────────
  // Exits
  // ───────────────────────────────────────────────────────────────

  /**
   * Serialize the tree to an SVG string. When this builder is the SVG
   * root, pass `viewBox` to emit `xmlns`, `width`, `height`, and `viewBox`
   * attributes; they'll be merged with any attributes already set.
   */
  toSVG(viewBox?: ViewBoxSpec): string {
    const root: SVGNode = {
      ...this.node,
      attrs: {
        xmlns: 'http://www.w3.org/2000/svg',
        ...(viewBox
          ? {
              width: viewBox.width,
              height: viewBox.height,
              viewBox: `${viewBox.x ?? 0} ${viewBox.y ?? 0} ${viewBox.width} ${viewBox.height}`,
            }
          : {}),
        ...this.node.attrs,
      },
    }
    return serialize(root)
  }

  /**
   * Mount this tree into a DOM container, creating real SVG elements
   * with `document.createElementNS`. Browser-only.
   *
   * When `viewBox` is provided, the root element's xmlns, width, height,
   * and viewBox attributes are set before mounting — matching the shape
   * of `toSVG(viewBox)`.
   */
  mount(
    container: Element,
    viewBox?: ViewBoxSpec
  ): globalThis.SVGElement {
    if (typeof document === 'undefined') {
      throw new Error(
        'SVGBuilder.mount requires a DOM (document) — use toSVG() in Node.'
      )
    }
    if (viewBox) {
      this.attr({
        xmlns: 'http://www.w3.org/2000/svg',
        width: viewBox.width,
        height: viewBox.height,
        viewBox: `${viewBox.x ?? 0} ${viewBox.y ?? 0} ${viewBox.width} ${viewBox.height}`,
      })
    }
    const root = createDOM(this.node) as globalThis.SVGElement
    container.appendChild(root)
    return root
  }

  private pushChild(child: SVGNode): SVGNode {
    this.node.children.push(child)
    return child
  }
}

/**
 * Create a new top-level SVG builder rooted at `<svg>`.
 */
export function createSVGBuilder(): SVGBuilder {
  return new SVGBuilder()
}

// ─────────────────────────────────────────────────────────────────
// Serialization (pure string — runs in any JS environment)
// ─────────────────────────────────────────────────────────────────

function serialize(el: SVGNode): string {
  const attrPairs = Object.entries(el.attrs)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}="${escape(String(v))}"`)
  const open = [el.tag, ...attrPairs].join(' ')

  // Text content and children (e.g. <animate>) coexist: text first.
  if (el.text !== undefined && el.children.length === 0) {
    return `<${open}>${escape(el.text)}</${el.tag}>`
  }
  if (el.text === undefined && el.children.length === 0) {
    return `<${open}/>`
  }
  const inner =
    (el.text !== undefined ? escape(el.text) : '') +
    el.children.map((c) => ('raw' in c ? c.raw : serialize(c))).join('')
  return `<${open}>${inner}</${el.tag}>`
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─────────────────────────────────────────────────────────────────
// DOM construction (browser-only)
// ─────────────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg'
const XHTML_NS = 'http://www.w3.org/1999/xhtml'

function createDOM(node: SVGNode): globalThis.Element {
  const el = document.createElementNS(SVG_NS, node.tag)
  for (const [k, v] of Object.entries(node.attrs)) {
    if (v !== undefined && v !== null) el.setAttribute(k, String(v))
  }
  // Text first (a text node — assigning textContent would wipe children),
  // then children such as <animate>.
  if (node.text !== undefined) {
    el.appendChild(document.createTextNode(node.text))
  }
  for (const child of node.children) {
    if ('raw' in child) {
      // Parse the raw XML string and append its top-level elements.
      // Using innerHTML on a temporary SVG root handles the parse.
      const tmp = document.createElementNS(SVG_NS, 'g')
      tmp.innerHTML = child.raw
      while (tmp.firstChild) el.appendChild(tmp.firstChild)
    } else if (child.tag === 'foreignObject') {
      // foreignObject content lives in the XHTML namespace. Default to
      // SVG namespace for children; callers using .raw() in XHTML
      // should emit the xmlns explicitly.
      const fo = document.createElementNS(SVG_NS, 'foreignObject')
      for (const [k, v] of Object.entries(child.attrs)) {
        if (v !== undefined && v !== null) fo.setAttribute(k, String(v))
      }
      for (const sub of child.children) {
        if ('raw' in sub) {
          const tmp = document.createElementNS(XHTML_NS, 'div')
          tmp.innerHTML = sub.raw
          while (tmp.firstChild) fo.appendChild(tmp.firstChild)
        } else {
          fo.appendChild(createDOM(sub))
        }
      }
      el.appendChild(fo)
    } else {
      el.appendChild(createDOM(child))
    }
  }
  return el
}
