/**
 * Strict anchor parsing: unknown specs throw AnchorError — no silent
 * warn-and-default-to-east fallback. Also covers the custom-port
 * interception pattern that strictness is designed to protect, and the
 * explicit EdgeAnchorSpec ('auto') typing.
 */
import { describe, it, expect } from 'vitest'
import {
  parseAnchorSpec,
  AnchorError,
  anchorOnRect,
  type AnchorSpec,
} from '../../src/core/Anchor'
import { Point, point } from '../../src/core/Point'
import type { PointLike } from '../../src/core/types'
import type { Shape } from '../../src/geometry/Shape'
import { rectFromCenter, type Rectangle } from '../../src/geometry/Rectangle'
import { rectNode } from '../../src/node/Node'
import { edge } from '../../src/node/Edge'

describe('parseAnchorSpec is strict', () => {
  it('throws AnchorError on unknown names', () => {
    expect(() => parseAnchorSpec('norte')).toThrowError(AnchorError)
    expect(() => parseAnchorSpec('bogus')).toThrowError(/Unknown anchor/)
  })

  it('AnchorError carries the offending spec and guidance', () => {
    try {
      parseAnchorSpec('emiter') // typo'd port name
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(AnchorError)
      expect((e as AnchorError).spec).toBe('emiter')
      expect((e as AnchorError).name).toBe('AnchorError')
      // Points custom-shape authors at the interception pattern.
      expect((e as AnchorError).message).toMatch(/intercepted/)
    }
  })

  it('still accepts all valid spec forms', () => {
    expect(parseAnchorSpec('north')).toBe(270)
    expect(parseAnchorSpec('ne')).toBe(315)
    expect(parseAnchorSpec('northeast')).toBe(315)
    expect(parseAnchorSpec('c')).toBe(null)
    expect(parseAnchorSpec('center')).toBe(null)
    expect(parseAnchorSpec(30)).toBe(30)
    expect(parseAnchorSpec('30deg')).toBe(30)
    expect(parseAnchorSpec('45')).toBe(45)
    expect(parseAnchorSpec(-90)).toBe(270)
  })

  it('shapes propagate the error through anchor()', () => {
    const n = rectNode({ at: point(0, 0), width: 40, height: 20 })
    expect(() => n.anchor('norht')).toThrowError(AnchorError)
  })
})

describe('custom port names: interception pattern under strict parsing', () => {
  /**
   * A minimal "circuit symbol" shape: box-like border anchors via
   * anchorOnRect, plus named ports intercepted BEFORE delegating.
   * Strict parsing makes typos on port names throw while custom names
   * keep working.
   */
  class TwoPortShape implements Shape {
    readonly type = 'two-port'
    private box: Rectangle

    constructor(
      center: PointLike = point(0, 0),
      width = 60,
      height = 20
    ) {
      this.box = rectFromCenter(center, width, height)
    }

    get center() {
      return this.box.center
    }
    get width() {
      return this.box.width
    }
    get height() {
      return this.box.height
    }
    get bounds() {
      return this.box.bounds
    }

    anchor(spec: AnchorSpec): Point {
      if (typeof spec === 'string') {
        const name = spec.toLowerCase().trim()
        if (name === 'in') return this.box.west
        if (name === 'out') return this.box.east
      }
      // Everything else (cardinals, angles) delegates — unknown names
      // throw AnchorError from here.
      return anchorOnRect(this.center, this.width, this.height, spec)
    }

    boundaryPoint(angle: number): Point {
      return this.box.boundaryPoint(angle)
    }
    contains(p: PointLike): boolean {
      return this.box.contains(p)
    }
    toSVGPath(): string {
      return this.box.toSVGPath()
    }
    moveTo(c: PointLike): Shape {
      return new TwoPortShape(c, this.width, this.height)
    }
    resize(w: number, h: number): Shape {
      return new TwoPortShape(this.center, w, h)
    }
  }

  it('custom names resolve; typos throw', () => {
    const s = new TwoPortShape()
    expect(s.anchor('in')).toEqual(point(-30, 0))
    expect(s.anchor('out')).toEqual(point(30, 0))
    expect(s.anchor('north').x).toBeCloseTo(0, 10)
    expect(s.anchor('north').y).toBeCloseTo(-10, 10)
    expect(() => s.anchor('otu')).toThrowError(AnchorError)
  })
})

describe('EdgeAnchorSpec: explicit auto', () => {
  it("'auto' is accepted explicitly and resolves to the border", () => {
    const a = rectNode({ at: point(0, 0), width: 40, height: 40 })
    const b = rectNode({ at: point(100, 0), width: 40, height: 40 })
    const e = edge(a, b, { fromAnchor: 'auto', toAnchor: 'auto' })
    expect(e.from.x).toBeCloseTo(20, 6)
    expect(e.to.x).toBeCloseTo(80, 6)
    expect(e.fromAnchor).toBe('auto')
    expect(e.toAnchor).toBe('auto')
  })
})
