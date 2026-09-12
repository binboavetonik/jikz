/**
 * Arrow tip registry.
 *
 * Arrowheads are SVG `<marker>` defs. Because SVG marker paint cannot
 * inherit the referencing path's stroke, markers are defined per
 * (tip kind, color, position) — see SVGRenderer.ensureMarker.
 *
 * `end` artwork points +x (placed with orient=auto). `start` artwork
 * is the same shape pre-mirrored to point −x — we do NOT rely on
 * orient="auto-start-reverse" for start markers because some renderers
 * (older WebKit/QuickLook) apply the reversal to the wrong markers,
 * which flips every arrowhead on the page.
 *
 * Register your own tips with {@link registerArrowTip}:
 *
 * ```ts
 * registerArrowTip('pennant', {
 *   filled: true,
 *   end:   { d: 'M 0 0 L 10 5 L 0 5 Z', refX: 9 },
 *   start: { d: 'M 10 0 L 0 5 L 10 5 Z', refX: 1 },
 * })
 * edge(a, b, { arrowEnd: 'pennant' })
 * ```
 */

/**
 * Marker artwork for one end of a path. `d` is SVG path data drawn in
 * a 10×10 viewBox centered vertically on y=5; `refX` is the x that
 * sits on the path endpoint.
 */
export interface ArrowTipArtwork {
  d: string
  refX: number
}

/**
 * Definition of a named arrow tip. `filled` shapes take the edge color
 * as fill; the rest take it as stroke (with `strokeWidth`, default 1.5).
 */
export interface ArrowTipDefinition {
  filled: boolean
  strokeWidth?: number
  end: ArrowTipArtwork
  start: ArrowTipArtwork
}

const registry = new Map<string, ArrowTipDefinition>()

/**
 * Register an arrow tip under a name. Later registrations replace
 * earlier ones under the same name.
 */
export function registerArrowTip(name: string, def: ArrowTipDefinition): void {
  ensureBuiltins()
  registry.set(name, def)
}

/**
 * Look up a registered arrow tip (undefined when absent).
 */
export function getArrowTip(name: string): ArrowTipDefinition | undefined {
  ensureBuiltins()
  return registry.get(name)
}

/**
 * Whether an arrow tip is registered under `name`.
 */
export function hasArrowTip(name: string): boolean {
  ensureBuiltins()
  return registry.has(name)
}

/**
 * All registered arrow tip names.
 */
export function registeredArrowTips(): readonly string[] {
  ensureBuiltins()
  return Array.from(registry.keys())
}

/**
 * Normalize ArrowTip aliases to a marker kind.
 *
 * TikZ-style whole-path specs reach here only if an Edge wasn't
 * involved (e.g. manual renderPath markers) — they all mean the
 * plain triangular tip; direction is positional.
 */
export function resolveArrowTipKind(arrowType: string): string {
  if (arrowType === '>' || arrowType === '->' || arrowType === '<-' || arrowType === '<->') return 'to'
  if (arrowType === '|') return 'bar'
  if (arrowType === '||') return 'doubleBar'
  if (arrowType === '*') return 'circle'
  if (arrowType === 'o') return 'openCircle'
  return arrowType
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in tips. Geometry matches TikZ's tips at markerWidth/Height 6
// with default (strokeWidth-scaled) markerUnits.
// ─────────────────────────────────────────────────────────────────────────────

let builtinsRegistered = false

/**
 * Register the built-ins on first use. Every public function of this
 * registry calls this first, so built-ins are always present and always
 * registered BEFORE anything the caller adds — a user registration under
 * a built-in name still wins, exactly as when built-ins registered at
 * import time.
 *
 * Deferring to first use is what makes the package tree-shakeable
 * (`"sideEffects": false`): loading this module no longer mutates any
 * table, so a bundle that never resolves a name by string can drop the
 * shapes/artwork this function references.
 */
function ensureBuiltins(): void {
  if (builtinsRegistered) return
  builtinsRegistered = true
  registerArrowTip('stealth', {
    filled: true,
    end: { d: 'M 0 0 L 10 5 L 0 10 L 3 5 z', refX: 9 },
    start: { d: 'M 10 0 L 0 5 L 10 10 L 7 5 z', refX: 1 },
  })

  registerArrowTip('latex', {
    filled: false,
    strokeWidth: 1.5,
    end: { d: 'M 0 0 L 10 5 L 0 10', refX: 9 },
    start: { d: 'M 10 0 L 0 5 L 10 10', refX: 1 },
  })

  registerArrowTip('to', {
    filled: true,
    end: { d: 'M 0 0 L 10 5 L 0 10 z', refX: 9 },
    start: { d: 'M 10 0 L 0 5 L 10 10 z', refX: 1 },
  })

  registerArrowTip('bar', {
    filled: false,
    strokeWidth: 2,
    end: { d: 'M 5 0 L 5 10', refX: 5 },
    start: { d: 'M 5 0 L 5 10', refX: 5 },
  })

  // Double bar — two parallel stops (TikZ `||`).
  registerArrowTip('doubleBar', {
    filled: false,
    strokeWidth: 2,
    end: { d: 'M 4 0 L 4 10 M 6 0 L 6 10', refX: 5 },
    start: { d: 'M 4 0 L 4 10 M 6 0 L 6 10', refX: 5 },
  })

  // Filled circle, centered on the path endpoint (TikZ `Circle` / `*`).
  // Two 180° arcs (same sweep) close into a full circle around (5, 5).
  const CIRCLE_D = 'M 7.5 5 A 2.5 2.5 0 0 0 2.5 5 A 2.5 2.5 0 0 0 7.5 5 Z'

  registerArrowTip('circle', {
    filled: true,
    end: { d: CIRCLE_D, refX: 5 },
    start: { d: CIRCLE_D, refX: 5 },
  })

  // Hollow circle — the `o` open-dot tip (TikZ `Circle[open]`).
  registerArrowTip('openCircle', {
    filled: false,
    strokeWidth: 1.5,
    end: { d: CIRCLE_D, refX: 5 },
    start: { d: CIRCLE_D, refX: 5 },
  })

  // Filled square, centered on the path endpoint (TikZ `Square`).
  registerArrowTip('square', {
    filled: true,
    end: { d: 'M 2.5 2.5 L 7.5 2.5 L 7.5 7.5 L 2.5 7.5 Z', refX: 5 },
    start: { d: 'M 2.5 2.5 L 7.5 2.5 L 7.5 7.5 L 2.5 7.5 Z', refX: 5 },
  })

  // Filled diamond with the long axis along the path (TikZ `Diamond`).
  registerArrowTip('diamond', {
    filled: true,
    end: { d: 'M 0 5 L 5 0 L 10 5 L 5 10 Z', refX: 9 },
    start: { d: 'M 10 5 L 5 0 L 0 5 L 5 10 Z', refX: 1 },
  })

  // Filled round cap — a half-disc bulging forward (TikZ `Round Cap`).
  registerArrowTip('roundCap', {
    filled: true,
    end: { d: 'M 5 2.5 A 2.5 2.5 0 0 1 5 7.5 Z', refX: 5 },
    start: { d: 'M 5 2.5 A 2.5 2.5 0 0 0 5 7.5 Z', refX: 5 },
  })
}
