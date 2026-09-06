/**
 * SVG §F.6.5 arc math for Path A segments — endpoint → center
 * parameterization driving Path.length / pointAt / bounds.
 *
 * Convention: jikz screen space IS SVG space (y down, angles
 * clockwise-positive, 0° = east), so sweep=true (increasing angle)
 * from (0,0) to (100,0) bulges UP — apex at (50, −50).
 */
import { describe, it, expect } from 'vitest'
import { path, circlePath, ellipsePath } from '../../src/path/Path'
import { zigzagPath } from '../../src/path/PathDecorations'
import { point } from '../../src/core/Point'

describe('arc length (circular — exact)', () => {
  it('semicircle: length = πr', () => {
    const p = path().moveTo(point(0, 0)).circularArcTo(50, false, true, point(100, 0))
    expect(p.length).toBeCloseTo(Math.PI * 50, 6)
  })

  it('quarter circle: length = πr/2', () => {
    // east point → south point of a radius-100 circle centered at (0,0),
    // traveling clockwise on screen (sweep=true), small arc
    const p = path().moveTo(point(100, 0)).circularArcTo(100, false, true, point(0, 100))
    expect(p.length).toBeCloseTo((Math.PI * 100) / 2, 6)
  })

  it('full circle via two A halves: length = 2πr', () => {
    expect(circlePath(point(0, 0), 30).length).toBeCloseTo(2 * Math.PI * 30, 6)
  })

  it('mixed path: line + arc lengths accumulate', () => {
    const p = path()
      .moveTo(point(0, 0))
      .lineTo(point(50, 0)) // 50
      .circularArcTo(25, false, true, point(100, 0)) // π·25
    expect(p.length).toBeCloseTo(50 + Math.PI * 25, 6)
  })
})

describe('arc length (elliptical — sampled)', () => {
  it('ellipse circumference ≈ Ramanujan II within 1%', () => {
    const rx = 80
    const ry = 40
    const ramanujan =
      Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)))
    const len = ellipsePath(point(0, 0), rx, ry).length
    expect(Math.abs(len - ramanujan) / ramanujan).toBeLessThan(0.01)
  })
})

describe('arc pointAt', () => {
  it('semicircle midpoint is the apex (sweep=true bulges up)', () => {
    const p = path().moveTo(point(0, 0)).circularArcTo(50, false, true, point(100, 0))
    const apex = p.pointAt(0.5)
    expect(apex.x).toBeCloseTo(50, 6)
    expect(apex.y).toBeCloseTo(-50, 6)
  })

  it('sweep=false bulges the other way', () => {
    const p = path().moveTo(point(0, 0)).circularArcTo(50, false, false, point(100, 0))
    const apex = p.pointAt(0.5)
    expect(apex.x).toBeCloseTo(50, 6)
    expect(apex.y).toBeCloseTo(50, 6)
  })

  it('quarter-circle midpoint at 45°', () => {
    const p = path().moveTo(point(100, 0)).circularArcTo(100, false, true, point(0, 100))
    const mid = p.pointAt(0.5)
    const c = 100 * Math.cos(Math.PI / 4)
    expect(mid.x).toBeCloseTo(c, 4)
    expect(mid.y).toBeCloseTo(c, 4)
  })

  it('endpoints: pointAt(0) = start, pointAt(1) = end', () => {
    const p = path().moveTo(point(10, 20)).arcTo(60, 30, 30, true, true, point(90, 80))
    expect(p.pointAt(0).x).toBeCloseTo(10, 6)
    expect(p.pointAt(0).y).toBeCloseTo(20, 6)
    expect(p.pointAt(1).x).toBeCloseTo(90, 6)
    expect(p.pointAt(1).y).toBeCloseTo(80, 6)
  })

  it('arc-length parameterization: mixed line+arc path hits the joint at the right t', () => {
    const lineLen = 50
    const arcLen = Math.PI * 25
    const p = path()
      .moveTo(point(0, 0))
      .lineTo(point(50, 0))
      .circularArcTo(25, false, true, point(100, 0))
    const joint = p.pointAt(lineLen / (lineLen + arcLen))
    expect(joint.x).toBeCloseTo(50, 4)
    expect(joint.y).toBeCloseTo(0, 4)
  })

  it('rotated ellipse: endpoints invariant under rotation', () => {
    for (const rotation of [0, 45, 90, 137]) {
      const p = path().moveTo(point(10, 20)).arcTo(60, 30, rotation, true, true, point(90, 80))
      expect(p.pointAt(1).x).toBeCloseTo(90, 4)
      expect(p.pointAt(1).y).toBeCloseTo(80, 4)
    }
  })
})

describe('arc degenerate cases (F.6.6)', () => {
  it('rx = 0 behaves as a straight line', () => {
    const p = path().moveTo(point(0, 0)).arcTo(0, 0, 0, false, true, point(60, 80))
    expect(p.length).toBeCloseTo(100, 6)
    const mid = p.pointAt(0.5)
    expect(mid.x).toBeCloseTo(30, 6)
    expect(mid.y).toBeCloseTo(40, 6)
  })

  it('from == end contributes zero length', () => {
    const p = path()
      .moveTo(point(0, 0))
      .lineTo(point(50, 0))
      .arcTo(30, 30, 0, true, true, point(50, 0))
      .lineTo(point(100, 0))
    expect(p.length).toBeCloseTo(100, 6)
  })

  it('undersized radii scale up (radius correction): chord > 2r still arcs', () => {
    // chord 100 with r=10 → radii scale to 50 → semicircle
    const p = path().moveTo(point(0, 0)).circularArcTo(10, false, true, point(100, 0))
    expect(p.length).toBeCloseTo(Math.PI * 50, 4)
    const end = p.pointAt(1)
    expect(end.x).toBeCloseTo(100, 6)
    expect(end.y).toBeCloseTo(0, 6)
  })
})

describe('arc bounds', () => {
  it('semicircle bounds include the bulge extreme', () => {
    const p = path().moveTo(point(0, 0)).circularArcTo(50, false, true, point(100, 0))
    const [minX, minY, maxX, maxY] = p.bounds
    expect(minX).toBeCloseTo(0, 9)
    expect(minY).toBeCloseTo(-50, 9)
    expect(maxX).toBeCloseTo(100, 9)
    expect(maxY).toBeCloseTo(0, 9)
  })

  it('sweep=false bulges down', () => {
    const p = path().moveTo(point(0, 0)).circularArcTo(50, false, false, point(100, 0))
    const [minX, minY, maxX, maxY] = p.bounds
    expect(minX).toBeCloseTo(0, 9)
    expect(minY).toBeCloseTo(0, 9)
    expect(maxX).toBeCloseTo(100, 9)
    expect(maxY).toBeCloseTo(50, 9)
  })

  it('full circle bounds', () => {
    const [minX, minY, maxX, maxY] = circlePath(point(10, 20), 30).bounds
    expect(minX).toBeCloseTo(-20, 9)
    expect(minY).toBeCloseTo(-10, 9)
    expect(maxX).toBeCloseTo(40, 9)
    expect(maxY).toBeCloseTo(50, 9)
  })

  it('rotated ellipse bounds include rotated extremes', () => {
    // half of an rx=60 ry=30 ellipse rotated 45°, largeArc — just check
    // the bounds contain every sample point (no bulge escapes)
    const p = path().moveTo(point(10, 20)).arcTo(60, 30, 45, true, true, point(90, 80))
    const [minX, minY, maxX, maxY] = p.bounds
    for (let i = 0; i <= 100; i++) {
      const pt = p.pointAt(i / 100)
      expect(pt.x).toBeGreaterThanOrEqual(minX - 1e-6)
      expect(pt.x).toBeLessThanOrEqual(maxX + 1e-6)
      expect(pt.y).toBeGreaterThanOrEqual(minY - 1e-6)
      expect(pt.y).toBeLessThanOrEqual(maxY + 1e-6)
    }
  })
})

describe('consumers: decorations over arcs', () => {
  it('zigzagPath over a half-circle arc — no NaN, points on/near the arc', () => {
    const base = path().moveTo(point(0, 50)).circularArcTo(50, false, true, point(100, 50))
    const zig = zigzagPath(base)
    expect(zig.segments.length).toBeGreaterThan(2)
    for (const seg of zig.segments) {
      for (const pt of seg.points) {
        expect(Number.isFinite(pt.x)).toBe(true)
        expect(Number.isFinite(pt.y)).toBe(true)
        // zigzag amplitude around the arc stays inside the disk diameter box
        expect(pt.x).toBeGreaterThanOrEqual(-20)
        expect(pt.x).toBeLessThanOrEqual(120)
        expect(pt.y).toBeGreaterThanOrEqual(-70)
        expect(pt.y).toBeLessThanOrEqual(70)
      }
    }
  })
})
