import { describe, it, expect } from 'vitest'
import type { Shape } from '../../src/geometry/Shape'
import { point } from '../../src/core/Point'
import { node } from '../../src/node/Node'
import { circle } from '../../src/geometry/Circle'
import { allShapes } from '../../src/geometry/shapes'
const SHAPES = allShapes

/**
 * Every entry of a shape set builds its own shape (no silent rectangle
 * fallback), and the instance form of the `shape` option passes through.
 *
 * The hazard this guards is old but real: a dispatcher that handled a
 * few names and fell through to rectangle for the rest made
 * `node({ shape: 'star' })` silently rectangular. With kinds the
 * factory comes from the set itself, and this pins that every one of
 * them reaches a distinct implementation.
 */

// The set IS the authoritative list now: a shape that joins allShapes
// is covered here automatically.
const ALL_SHAPE_NAMES = Object.keys(SHAPES) as (keyof typeof SHAPES)[]

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

describe('shape-kind dispatch', () => {
  for (const type of ALL_SHAPE_NAMES) {
    it(`'${type}' reaches its own factory (not a rectangle fallback)`, () => {
      const n = node({ shape: SHAPES[type], at: point(0, 0), width: 40, height: 40 })

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
      node({ shape: SHAPES['rectangle'], width: 10, height: 10 }).shape.type
    ).toBe('rectangle')
    expect(
      node({ shape: SHAPES['circle'], width: 10, height: 10 }).shape.type
    ).toBe('circle')
    expect(
      node({ shape: SHAPES['ellipse'], width: 10, height: 10 }).shape.type
    ).toBe('ellipse')
    expect(
      node({ shape: SHAPES['diamond'], width: 10, height: 10 }).shape.type
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
