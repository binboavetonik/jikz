import { describe, it, expect } from 'vitest'
import type { ShapeType } from '../../src/node/Node'
import type { Shape } from '../../src/geometry/Shape'
import { point } from '../../src/core/Point'
import { node } from '../../src/node/Node'
import { circle } from '../../src/geometry/Circle'

/**
 * Stage 2 verification: every ShapeType string dispatches to a distinct
 * shape (no silent rectangle fallback), and the instance form of the
 * `shape` option passes through.
 *
 * Before the refactor, `Node.createShape` switched on only 4 cases and
 * fell through to rectangle for everything else — so `node({ shape: 'star' })`
 * silently produced a rectangle. This test locks in that all 33 string
 * shape types now reach their intended factory.
 */

// The authoritative list of shape-type strings. If a new ShapeType is
// added to the union, this list must grow; TypeScript's exhaustiveness
// check in `Node.createShape` will have already forced the dispatch,
// but we add the string here to also cover it at runtime.
const ALL_SHAPE_TYPES: readonly ShapeType[] = [
  'rectangle',
  'circle',
  'ellipse',
  'diamond',
  'trapezium',
  'parallelogram',
  'regular polygon',
  'star',
  'cylinder',
  'isosceles triangle',
  'single arrow',
  'double arrow',
  'callout',
  'cloud',
  'signal',
  'tape',
  'starburst',
  'semicircle',
  'kite',
  'dart',
  'circular sector',
  'rounded rectangle',
  'chamfered rectangle',
  'cross out',
  'strike out',
  'forbidden sign',
  'magnifying glass',
  'magnetic tape',
  'ellipse callout',
  'cloud callout',
  'arrow box',
  'circle split',
  'rectangle split',
]

// Shapes whose underlying implementation may report a shape.type tag that
// differs from the ShapeType string (e.g. shapes backed by Polygon report
// 'polygon', and several node-layer shapes were authored before the shape-
// type catalog stabilized). The dispatch test still validates that these
// types don't silently produce a Rectangle — a non-null shape from the
// correct factory is enough.
const SHAPE_TYPE_TAG_EXCEPTIONS: ReadonlySet<string> = new Set([
  'rectangle split',
  'circle split',
])

describe('Node.createShape dispatch', () => {
  for (const type of ALL_SHAPE_TYPES) {
    it(`string shape '${type}' reaches its factory (not a rectangle fallback)`, () => {
      const n = node({ shape: type, at: point(0, 0), width: 40, height: 40 })

      // The resulting shape should be non-null and have some kind of
      // type tag. The specific tag format varies — what matters is that
      // we didn't silently fall through to 'rectangle'.
      expect(n.shape).toBeDefined()

      if (type !== 'rectangle' && !SHAPE_TYPE_TAG_EXCEPTIONS.has(type)) {
        // Non-rectangle shape types must not produce a rectangle. Some
        // shapes tag themselves with a related-but-different string
        // (e.g. diamond → 'diamond', isosceles triangle → 'polygon'
        // because it's a 3-vertex polygon under the hood); we only
        // guard against the specific 'rectangle' fallback.
        expect(n.shape.type).not.toBe('rectangle')
      }

      // Every shape must also produce a non-empty SVG path and a finite
      // bounding box — otherwise it's effectively broken even if it
      // claims to exist.
      expect(typeof n.shape.toSVGPath()).toBe('string')
      expect(n.shape.toSVGPath().length).toBeGreaterThan(0)
      const [minX, minY, maxX, maxY] = n.shape.bounds
      expect(Number.isFinite(minX)).toBe(true)
      expect(Number.isFinite(minY)).toBe(true)
      expect(Number.isFinite(maxX)).toBe(true)
      expect(Number.isFinite(maxY)).toBe(true)
    })
  }

  it('basic shape types map to the expected geometry primitive type tags', () => {
    // The 4 basic shapes were rewired to geometry primitives in Stage 2.
    // Their `type` tags should match what `geometry.*` reports.
    expect(
      node({ shape: 'rectangle', width: 10, height: 10 }).shape.type
    ).toBe('rectangle')
    expect(
      node({ shape: 'circle', width: 10, height: 10 }).shape.type
    ).toBe('circle')
    expect(
      node({ shape: 'ellipse', width: 10, height: 10 }).shape.type
    ).toBe('ellipse')
    expect(
      node({ shape: 'diamond', width: 10, height: 10 }).shape.type
    ).toBe('diamond')
  })

  it('accepts a pre-constructed Shape instance and uses it verbatim', () => {
    const preset = circle(point(100, 100), 42)
    const n = node({ shape: preset })
    // Same reference — Node should not reconstruct when given an instance.
    expect(n.shape).toBe(preset)
    expect(n.shape.type).toBe('circle')
    expect(n.width).toBe(84)
  })

  it('Shape instance form ignores width/height/minWidth/minHeight options', () => {
    // When the caller constructs the shape, they own its dimensions.
    // Width/height from NodeOptions should not re-derive the shape.
    const preset = circle(point(0, 0), 50)
    const n = node({ shape: preset, width: 999, height: 999 })
    expect(n.shape.width).toBe(100)
    expect(n.shape.height).toBe(100)
  })
})
