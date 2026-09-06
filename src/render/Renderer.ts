import type { Point } from '../core/Point'
import type { Path } from '../path/Path'
import type { Line } from '../geometry/Line'
import type { Circle } from '../geometry/Circle'
import type { Arc } from '../geometry/Arc'
import type { Rectangle } from '../geometry/Rectangle'
import type { Ellipse } from '../geometry/Ellipse'
import type { Shape } from '../geometry/Shape'
import type { Polygon } from '../geometry/Polygon'
import type { Node } from '../node/Node'
import type { Edge } from '../node/Edge'
import type { StyleSpec } from './StyleMapper'
import type { LayerName } from './Layer'

/**
 * Renderable types. Any geometry {@link Shape} is renderable — types
 * without a dedicated render method (Triangle, Parabola, Hyperbola,
 * Plot, complex shapes, …) fall back to path rendering via toSVGPath().
 */
export type Renderable =
  | Point
  | Path
  | Line
  | Circle
  | Arc
  | Ellipse
  | Rectangle
  | Polygon
  | Node
  | Edge
  | Shape

/**
 * Options for rendering
 */
export interface RenderOptions {
  /**
   * Style overrides
   */
  style?: StyleSpec

  /**
   * Text style overrides for nodes
   */
  textStyle?: {
    fill?: string
    fontSize?: number
    fontFamily?: string
    fontWeight?: string
  }

  /**
   * CSS class to apply
   */
  className?: string

  /**
   * Element ID
   */
  id?: string

  /**
   * Custom attributes
   */
  attributes?: Record<string, string | number>
}

/**
 * Text rendering options
 */
export interface TextOptions extends RenderOptions {
  /**
   * Font family
   */
  fontFamily?: string

  /**
   * Font size in pixels
   */
  fontSize?: number

  /**
   * Font weight
   */
  fontWeight?: 'normal' | 'bold' | number

  /**
   * Text anchor (horizontal alignment)
   */
  textAnchor?: 'start' | 'middle' | 'end'

  /**
   * Dominant baseline (vertical alignment)
   */
  dominantBaseline?: 'auto' | 'middle' | 'hanging' | 'alphabetic'
}

/**
 * Group options
 */
export interface GroupOptions {
  /**
   * Group ID
   */
  id?: string

  /**
   * CSS class
   */
  className?: string

  /**
   * Transform to apply to the group
   */
  transform?: string
}

/**
 * Abstract renderer interface.
 * Implementations can target SVG, Canvas, or other backends.
 *
 * @typeParam TEl  The element handle render methods return
 *                 (SVGRenderer: {@link SVGElement}).
 * @typeParam TCtx The drawing-context/group type (SVGRenderer:
 *                 {@link SVGBuilder}).
 */
export interface Renderer<TEl = unknown, TCtx = unknown> {
  // ─────────────────────────────────────────────────────────────────────────────
  // Primitive rendering
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Render a point (as a small circle or dot)
   */
  renderPoint(p: Point, options?: RenderOptions): TEl

  /**
   * Render a line segment
   */
  renderLine(line: Line, options?: RenderOptions): TEl

  /**
   * Render a circle
   */
  renderCircle(circle: Circle, options?: RenderOptions): TEl

  /**
   * Render an ellipse (native <ellipse> when axis-aligned, path when rotated)
   */
  renderEllipse(ellipse: Ellipse, options?: RenderOptions): TEl

  /**
   * Render an arc
   */
  renderArc(arc: Arc, options?: RenderOptions): TEl

  /**
   * Render a rectangle
   */
  renderRect(rect: Rectangle, options?: RenderOptions): TEl

  /**
   * Render a polygon
   */
  renderPolygon(polygon: Polygon, options?: RenderOptions): TEl

  /**
   * Render a path
   */
  renderPath(path: Path, options?: RenderOptions): TEl

  // ─────────────────────────────────────────────────────────────────────────────
  // Node system rendering
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Render a node (shape + optional text)
   */
  renderNode(node: Node, options?: RenderOptions): TEl

  /**
   * Render an edge (path + optional arrows)
   */
  renderEdge(edge: Edge, options?: RenderOptions): TEl

  // ─────────────────────────────────────────────────────────────────────────────
  // Text
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Render text at a position
   */
  renderText(text: string, position: Point, options?: TextOptions): TEl

  // ─────────────────────────────────────────────────────────────────────────────
  // Grouping
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a group for organizing elements
   */
  group(options?: GroupOptions): TCtx

  /**
   * Set the current group for subsequent renders
   */
  setGroup(group: TCtx): void

  /**
   * Clear the current group (render to root)
   */
  clearGroup(): void

  // ─────────────────────────────────────────────────────────────────────────────
  // Layers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Define layers in order (bottom to top)
   */
  defineLayers(layers: LayerName[], defaultLayer?: LayerName): void

  /**
   * Set the current layer for subsequent renders
   */
  setLayer(name: LayerName): void

  /**
   * Get a layer's container by name
   */
  getLayer(name: LayerName): TCtx | undefined

  /**
   * Reset to the default layer
   */
  resetLayer(): void

  /**
   * Execute callback on a specific layer, then restore previous layer
   */
  onLayer<T>(name: LayerName, callback: () => T): T

  /**
   * Get the current layer name
   */
  getCurrentLayer(): LayerName

  /**
   * Get all layer names in order
   */
  getLayers(): LayerName[]

  // ─────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Render any supported object
   */
  render(obj: Renderable, options?: RenderOptions): TEl

  /**
   * Clear all rendered content
   */
  clear(): void

  /**
   * Get the underlying drawing context
   */
  getContext(): TCtx
}

/**
 * Discriminator tag of a renderable: the `kind` field (Point, Path,
 * Line, Arc, Node, Edge) or the `type` field (Shape implementors:
 * Circle, Ellipse, Rectangle, Polygon, complex shapes). Returns
 * undefined for foreign objects, which fall back to structural checks.
 */
function tagOf(obj: unknown): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined
  const o = obj as { kind?: unknown; type?: unknown }
  if (typeof o.kind === 'string') return o.kind
  if (typeof o.type === 'string') return o.type
  return undefined
}

/**
 * Type guard to check if an object is a Point
 */
export function isPoint(obj: unknown): obj is Point {
  const tag = tagOf(obj)
  if (tag !== undefined) return tag === 'point'
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'x' in obj &&
    'y' in obj &&
    typeof (obj as Point).distanceTo === 'function'
  )
}

/**
 * Type guard to check if an object is a Path
 */
export function isPath(obj: unknown): obj is Path {
  const tag = tagOf(obj)
  if (tag !== undefined) return tag === 'path'
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'segments' in obj &&
    typeof (obj as Path).toSVGPath === 'function'
  )
}

/**
 * Type guard to check if an object is a Line
 */
export function isLine(obj: unknown): obj is Line {
  const tag = tagOf(obj)
  if (tag !== undefined) return tag === 'line'
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'start' in obj &&
    'end' in obj &&
    typeof (obj as Line).at === 'function' &&
    !('arrowEnd' in obj)
  )
}

/**
 * Type guard to check if an object is a Circle
 */
export function isCircle(obj: unknown): obj is Circle {
  const tag = tagOf(obj)
  if (tag !== undefined) return tag === 'circle'
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'center' in obj &&
    'radius' in obj &&
    typeof (obj as Circle).pointAt === 'function' &&
    !('startAngle' in obj)
  )
}

/**
 * Type guard to check if an object is an Arc
 */
export function isArc(obj: unknown): obj is Arc {
  const tag = tagOf(obj)
  if (tag !== undefined) return tag === 'arc'
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'center' in obj &&
    'radius' in obj &&
    'startAngle' in obj &&
    'endAngle' in obj
  )
}

/**
 * Type guard to check if an object is a Rectangle
 */
export function isRectangle(obj: unknown): obj is Rectangle {
  const tag = tagOf(obj)
  if (tag !== undefined) return tag === 'rectangle'
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'x' in obj &&
    'y' in obj &&
    'width' in obj &&
    'height' in obj &&
    typeof (obj as Rectangle).anchor === 'function'
  )
}

/**
 * Type guard to check if an object is an Ellipse
 */
export function isEllipse(obj: unknown): obj is Ellipse {
  const tag = tagOf(obj)
  if (tag !== undefined) return tag === 'ellipse'
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'center' in obj &&
    'a' in obj &&
    'b' in obj &&
    typeof (obj as Ellipse).pointAt === 'function'
  )
}

/**
 * Type guard to check if an object is a Polygon
 */
export function isPolygon(obj: unknown): obj is Polygon {
  const tag = tagOf(obj)
  if (tag !== undefined) return tag === 'polygon'
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'vertices' in obj &&
    Array.isArray((obj as Polygon).vertices) &&
    typeof (obj as Polygon).toSVGPath === 'function'
  )
}

/**
 * Type guard to check if an object is a Node
 */
export function isNode(obj: unknown): obj is Node {
  const tag = tagOf(obj)
  if (tag !== undefined) return tag === 'node'
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'shape' in obj &&
    'center' in obj &&
    typeof (obj as Node).anchor === 'function'
  )
}

/**
 * Type guard to check if an object is an Edge
 */
export function isEdge(obj: unknown): obj is Edge {
  const tag = tagOf(obj)
  if (tag !== undefined) return tag === 'edge'
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'from' in obj &&
    'to' in obj &&
    'arrowEnd' in obj &&
    typeof (obj as Edge).toSVGPath === 'function'
  )
}
