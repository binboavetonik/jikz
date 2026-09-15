import { describe, it, expect } from 'vitest'
import { line } from '../../src/geometry/Line'
import { circle, circleThrough } from '../../src/geometry/Circle'
import { triangle } from '../../src/geometry/Triangle'
import { point } from '../../src/core/Point'
import { intersectLineCircle, intersectCircleCircle } from '../../src/geometry/intersect'

/**
 * Regression tests for scale-dependent floating point behaviour.
 *
 * Coordinates in jikz are SVG pixels, so values in the hundreds to
 * thousands are the normal case, not an edge case. Predicates built on
 * cross products, determinants and discriminants grow quadratically (or
 * worse) with coordinate magnitude, so a fixed absolute tolerance that
 * works at scale 10 stops meaning anything at scale 2000.
 */
describe('numeric robustness', () => {
  describe('Triangle angles stay in the acos domain', () => {
    it('returns finite angles for a degenerate (collinear) triangle', () => {
      const t = triangle(point(0, 0), point(100, 100), point(200, 200))

      expect(Number.isNaN(t.angleA)).toBe(false)
      expect(Number.isNaN(t.angleB)).toBe(false)
      expect(Number.isNaN(t.angleC)).toBe(false)
    })

    it('never produces NaN for collinear triangles at any scale', () => {
      let nan = 0
      let total = 0
      for (const s of [1, 10, 100, 800, 2000]) {
        for (let deg = 0; deg < 360; deg += 1) {
          const a = (deg * Math.PI) / 180
          const ux = Math.cos(a)
          const uy = Math.sin(a)
          const t = triangle(
            point(500, 400),
            point(500 + ux * s, 400 + uy * s),
            point(500 + ux * 2 * s, 400 + uy * 2 * s)
          )
          if (Number.isNaN(t.angleA) || Number.isNaN(t.angleB) || Number.isNaN(t.angleC)) nan++
          total++
        }
      }
      expect({ nan, total }).toEqual({ nan: 0, total })
    })

    it('keeps angles and isRight usable on a degenerate triangle', () => {
      const t = triangle(point(0, 0), point(100, 100), point(200, 200))

      expect(t.angles.every((x) => !Number.isNaN(x))).toBe(true)
      expect(t.isRight).toBe(false)
    })
  })

  describe('Line parallel / perpendicular at SVG pixel scale', () => {
    it('detects parallel lines with direction length 2000', () => {
      const a = (3 * Math.PI) / 180
      const d = { x: Math.cos(a) * 2000, y: Math.sin(a) * 2000 }
      const l1 = line(point(0, 0), point(d.x, d.y))
      const l2 = line(point(300, 150), point(300 + d.x * 1.3, 150 + d.y * 1.3))

      expect(l1.isParallelTo(l2)).toBe(true)
    })

    it('detects perpendicular lines with direction length 2000', () => {
      const a = (6.5 * Math.PI) / 180
      const l1 = line(point(0, 0), point(Math.cos(a) * 2000, Math.sin(a) * 2000))
      const l2 = line(
        point(50, 60),
        point(50 - Math.sin(a) * 2600, 60 + Math.cos(a) * 2600)
      )

      expect(l1.isPerpendicularTo(l2)).toBe(true)
    })

    it('stays correct across a full sweep at scale 2000', () => {
      let parallelMissed = 0
      let perpMissed = 0
      for (let deg = 0; deg < 360; deg += 0.5) {
        const a = (deg * Math.PI) / 180
        const d = { x: Math.cos(a) * 2000, y: Math.sin(a) * 2000 }
        const l1 = line(point(0, 0), point(d.x, d.y))
        const par = line(point(300, 150), point(300 + d.x * 1.3, 150 + d.y * 1.3))
        const perp = line(point(50, 60), point(50 - d.y * 1.3, 60 + d.x * 1.3))
        if (!l1.isParallelTo(par)) parallelMissed++
        if (!l1.isPerpendicularTo(perp)) perpMissed++
      }
      expect({ parallelMissed, perpMissed }).toEqual({ parallelMissed: 0, perpMissed: 0 })
    })

    it('still rejects lines that are genuinely not parallel', () => {
      const l1 = line(point(0, 0), point(2000, 0))
      const l2 = line(point(0, 0), point(2000, 1))

      expect(l1.isParallelTo(l2)).toBe(false)
      expect(l1.isPerpendicularTo(line(point(0, 0), point(1, 2000)))).toBe(false)
    })
  })

  describe('collinearity determinants at SVG pixel scale', () => {
    it('circleThrough returns null for collinear points at scale 2000', () => {
      const a = (1 * Math.PI) / 180
      const ux = Math.cos(a)
      const uy = Math.sin(a)
      const result = circleThrough(
        point(1500, 1200),
        point(1500 + ux * 2000, 1200 + uy * 2000),
        point(1500 + ux * 4000, 1200 + uy * 4000)
      )

      expect(result).toBeNull()
    })

    it('circumcenter falls back to the centroid for collinear points', () => {
      const a = (0.5 * Math.PI) / 180
      const ux = Math.cos(a)
      const uy = Math.sin(a)
      const t = triangle(
        point(1500, 1200),
        point(1500 + ux * 2000, 1200 + uy * 2000),
        point(1500 + ux * 4000, 1200 + uy * 4000)
      )
      const cc = t.circumcenter

      expect(cc.x).toBeCloseTo(t.centroid.x, 6)
      expect(cc.y).toBeCloseTo(t.centroid.y, 6)
    })

    it('still finds a real circumcircle for a non-degenerate large triangle', () => {
      const t = triangle(point(0, 0), point(2000, 0), point(1000, 1500))
      const cc = t.circumcenter

      expect(cc.x).toBeCloseTo(1000, 6)
      expect(Number.isFinite(cc.y)).toBe(true)
      expect(circleThrough(point(0, 0), point(2000, 0), point(1000, 1500))).not.toBeNull()
    })
  })

  describe('intersectLineCircle tangency', () => {
    it('detects a tangent line at an arbitrary angle', () => {
      const R = 300
      const a = (1 * Math.PI) / 180
      const tx = 512 + R * Math.cos(a)
      const ty = 384 + R * Math.sin(a)
      const ux = -Math.sin(a)
      const uy = Math.cos(a)
      const l = line(point(tx - ux * 600, ty - uy * 600), point(tx + ux * 600, ty + uy * 600))

      const result = intersectLineCircle(l, circle(point(512, 384), R))

      expect(result.points).toHaveLength(1)
      expect(result.points[0]!.x).toBeCloseTo(tx, 6)
      expect(result.points[0]!.y).toBeCloseTo(ty, 6)
    })

    it('detects tangency across a full sweep at several radii', () => {
      let missed = 0
      let total = 0
      for (const [R, len] of [
        [50, 100],
        [300, 600],
        [1000, 2000],
      ] as const) {
        for (let deg = 0; deg < 360; deg += 1) {
          const a = (deg * Math.PI) / 180
          const tx = 512 + R * Math.cos(a)
          const ty = 384 + R * Math.sin(a)
          const ux = -Math.sin(a)
          const uy = Math.cos(a)
          const l = line(
            point(tx - ux * len, ty - uy * len),
            point(tx + ux * len, ty + uy * len)
          )
          if (intersectLineCircle(l, circle(point(512, 384), R)).points.length !== 1) missed++
          total++
        }
      }
      expect({ missed, total }).toEqual({ missed: 0, total })
    })

    it('still returns two points for a secant and none for a miss', () => {
      const c = circle(point(0, 0), 100)

      expect(intersectLineCircle(line(point(-200, 0), point(200, 0)), c).points).toHaveLength(2)
      expect(intersectLineCircle(line(point(-200, 300), point(200, 300)), c).points).toHaveLength(0)
    })
  })

  describe('intersectCircleCircle', () => {
    it('never returns NaN coordinates near the tangency boundary', () => {
      const r1 = 522.6133387975639
      const r2 = 0.07898464444227148
      const d = 522.5343541533332
      const ang = 4.559744456290958
      const result = intersectCircleCircle(
        circle(point(500, 400), r1),
        circle(point(500 + d * Math.cos(ang), 400 + d * Math.sin(ang)), r2)
      )

      expect(result.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
    })

    it('survives an adversarial sweep around both tangency boundaries', () => {
      let bad = 0
      let total = 0
      for (let i = 0; i < 20000; i++) {
        const r1 = ((i * 37) % 1000) + 0.01
        const r2 = ((i * 53) % 1000) + 0.01
        const mode = i % 3
        const base =
          mode === 0 ? r1 + r2 : mode === 1 ? Math.abs(r1 - r2) : ((i * 11) % 100) / 100
        const d = base + (((i % 17) - 8) / 8) * 1e-9
        if (d < 0) continue
        const ang = (i % 360) * (Math.PI / 180)
        const result = intersectCircleCircle(
          circle(point(500, 400), r1),
          circle(point(500 + d * Math.cos(ang), 400 + d * Math.sin(ang)), r2)
        )
        if (!result.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) bad++
        total++
      }
      expect({ bad, total }).toEqual({ bad: 0, total })
    })

    it('reports a single accurate point for externally tangent circles', () => {
      let worst = 0
      let single = 0
      let total = 0
      for (const [r1, r2] of [
        [5, 3],
        [50, 30],
        [1000, 700],
      ] as const) {
        for (let deg = 0; deg < 360; deg += 1) {
          const a = (deg * Math.PI) / 180
          const d = r1 + r2
          const c2 = point(500 + d * Math.cos(a), 400 + d * Math.sin(a))
          const result = intersectCircleCircle(circle(point(500, 400), r1), circle(c2, r2))
          const truth = point(500 + r1 * Math.cos(a), 400 + r1 * Math.sin(a))
          if (result.points.length === 1) single++
          for (const p of result.points) {
            worst = Math.max(worst, Math.hypot(p.x - truth.x, p.y - truth.y))
          }
          total++
        }
      }
      expect(single).toBe(total)
      expect(worst).toBeLessThan(1e-9)
    })

    it('keeps reporting coincident circles that differ only by FP noise', () => {
      const result = intersectCircleCircle(
        circle(point(1000, 800), 50),
        circle(point(1000 + 1e-13, 800), 50 + 1e-11)
      )

      expect(result.coincident).toBe(true)
    })

    it('still returns two points for ordinary overlapping circles', () => {
      const result = intersectCircleCircle(
        circle(point(0, 0), 100),
        circle(point(120, 0), 100)
      )

      expect(result.points).toHaveLength(2)
      expect(result.coincident).toBe(false)
    })
  })
})
