import { describe, it, expect } from 'vitest'
import {
  arrowDecoration,
  stealthDecoration,
  tickDecoration,
  barDecoration,
  circleDecoration,
  squareDecoration,
  decoration,
  DASH_PATTERNS,
  dashPatternToSVG,
  offsetPath,
  doublePath,
  subdividePath,
  smoothPath,
  subPath,
  joinPaths,
  bracePath,
  bracketPath,
} from '../../src/path/PathOperations'
import { path, pathFrom } from '../../src/path/Path'
import { point } from '../../src/core/Point'

describe('PathOperations', () => {
  describe('decorations', () => {
    const basePath = path().moveTo(point(0, 0)).lineTo(point(100, 0))

    describe('arrowDecoration', () => {
      it('creates arrow at end by default', () => {
        const arrow = arrowDecoration(basePath)
        expect(arrow.isEmpty).toBe(false)
        // Arrow should be near the end point (100, 0)
        const end = arrow.endPoint
        expect(end).not.toBeNull()
      })

      it('creates arrow at start', () => {
        const arrow = arrowDecoration(basePath, { position: 'start' })
        expect(arrow.isEmpty).toBe(false)
      })

      it('creates arrow at midpoint', () => {
        const arrow = arrowDecoration(basePath, { position: 'mid' })
        expect(arrow.isEmpty).toBe(false)
      })

      it('creates arrow at custom position', () => {
        const arrow = arrowDecoration(basePath, { position: 0.25 })
        expect(arrow.isEmpty).toBe(false)
      })

      it('respects size option', () => {
        const small = arrowDecoration(basePath, { size: 5 })
        const large = arrowDecoration(basePath, { size: 20 })
        // Both should exist
        expect(small.isEmpty).toBe(false)
        expect(large.isEmpty).toBe(false)
      })

      it('respects flip option', () => {
        const normal = arrowDecoration(basePath)
        const flipped = arrowDecoration(basePath, { flip: true })
        // Both should exist but point different directions
        expect(normal.isEmpty).toBe(false)
        expect(flipped.isEmpty).toBe(false)
      })
    })

    describe('stealthDecoration', () => {
      it('creates filled stealth arrow', () => {
        const stealth = stealthDecoration(basePath)
        expect(stealth.isClosed).toBe(true) // Filled shape
      })
    })

    describe('tickDecoration', () => {
      it('creates perpendicular tick', () => {
        const tick = tickDecoration(basePath)
        expect(tick.isEmpty).toBe(false)
        // Tick is a short line segment
        expect(tick.segments).toHaveLength(2) // M and L
      })

      it('tick at different positions', () => {
        const tickStart = tickDecoration(basePath, { position: 'start' })
        const tickMid = tickDecoration(basePath, { position: 'mid' })
        const tickEnd = tickDecoration(basePath, { position: 'end' })

        expect(tickStart.startPoint?.x).toBeCloseTo(0, 0)
        expect(tickMid.startPoint?.x).toBeCloseTo(50, 0)
        expect(tickEnd.startPoint?.x).toBeCloseTo(100, 0)
      })
    })

    describe('barDecoration', () => {
      it('creates bar/stop decoration', () => {
        const bar = barDecoration(basePath)
        expect(bar.isEmpty).toBe(false)
      })
    })

    describe('circleDecoration', () => {
      it('creates circle decoration', () => {
        const circ = circleDecoration(basePath)
        expect(circ.isClosed).toBe(true)
        expect(circ.toSVGPath()).toContain('A') // Arc commands
      })
    })

    describe('squareDecoration', () => {
      it('creates square decoration', () => {
        const sq = squareDecoration(basePath)
        expect(sq.isClosed).toBe(true)
        expect(sq.segments).toHaveLength(5) // M, L, L, L, Z
      })
    })

    describe('decoration factory', () => {
      it('creates arrow type', () => {
        const d = decoration('arrow', basePath)
        expect(d.isEmpty).toBe(false)
      })

      it('creates stealth type', () => {
        const d = decoration('stealth', basePath)
        expect(d.isClosed).toBe(true)
      })

      it('creates tick type', () => {
        const d = decoration('tick', basePath)
        expect(d.isEmpty).toBe(false)
      })

      it('creates bar type', () => {
        const d = decoration('bar', basePath)
        expect(d.isEmpty).toBe(false)
      })

      it('creates circle type', () => {
        const d = decoration('circle', basePath)
        expect(d.isClosed).toBe(true)
      })

      it('creates square type', () => {
        const d = decoration('square', basePath)
        expect(d.isClosed).toBe(true)
      })
    })
  })

  describe('dash patterns', () => {
    it('DASH_PATTERNS contains common patterns', () => {
      expect(DASH_PATTERNS.solid.pattern).toEqual([])
      expect(DASH_PATTERNS.dashed.pattern).toEqual([8, 4])
      expect(DASH_PATTERNS.dotted.pattern).toEqual([2, 4])
      expect(DASH_PATTERNS.dashDot.pattern).toEqual([8, 4, 2, 4])
    })

    it('dashPatternToSVG converts to SVG format', () => {
      expect(dashPatternToSVG(DASH_PATTERNS.solid)).toBe('')
      expect(dashPatternToSVG(DASH_PATTERNS.dashed)).toBe('8 4')
      expect(dashPatternToSVG(DASH_PATTERNS.dotted)).toBe('2 4')
      expect(dashPatternToSVG(DASH_PATTERNS.dashDot)).toBe('8 4 2 4')
    })
  })

  describe('path operations', () => {
    describe('offsetPath', () => {
      it('creates parallel path', () => {
        const p = path().moveTo(point(0, 0)).lineTo(point(100, 0))
        const offset = offsetPath(p, 10)

        expect(offset.isEmpty).toBe(false)
        // Offset path should be 10 units away (perpendicular)
        const startY = offset.startPoint?.y ?? 0
        expect(Math.abs(startY)).toBeCloseTo(10)
      })

      it('negative offset goes other direction', () => {
        const p = path().moveTo(point(0, 0)).lineTo(point(100, 0))
        const offsetPos = offsetPath(p, 10)
        const offsetNeg = offsetPath(p, -10)

        const posY = offsetPos.startPoint?.y ?? 0
        const negY = offsetNeg.startPoint?.y ?? 0
        expect(posY).toBeCloseTo(-negY)
      })
    })

    describe('doublePath', () => {
      it('creates two parallel paths', () => {
        const p = path().moveTo(point(0, 0)).lineTo(point(100, 0))
        const [p1, p2] = doublePath(p, 20)

        expect(p1.isEmpty).toBe(false)
        expect(p2.isEmpty).toBe(false)

        const y1 = p1.startPoint?.y ?? 0
        const y2 = p2.startPoint?.y ?? 0
        expect(Math.abs(y1 - y2)).toBeCloseTo(20)
      })
    })

    describe('subdividePath', () => {
      it('subdivides path into segments', () => {
        const p = path().moveTo(point(0, 0)).lineTo(point(100, 0))
        const subdivided = subdividePath(p, 10)

        // Should have more segments now
        expect(subdivided.segments.length).toBeGreaterThan(p.segments.length)
      })

      it('maintains path endpoints', () => {
        const p = path().moveTo(point(0, 0)).lineTo(point(100, 0))
        const subdivided = subdividePath(p, 5)

        expect(subdivided.startPoint?.x).toBeCloseTo(0)
        expect(subdivided.endPoint?.x).toBeCloseTo(100)
      })
    })

    describe('smoothPath', () => {
      it('converts to smooth curves', () => {
        const p = path()
          .moveTo(point(0, 0))
          .lineTo(point(50, 50))
          .lineTo(point(100, 0))
        const smooth = smoothPath(p)

        expect(smooth.isEmpty).toBe(false)
        // Should contain curve segments
        expect(smooth.toSVGPath()).toContain('C')
      })
    })

    describe('subPath', () => {
      it('extracts portion of path', () => {
        const p = path().moveTo(point(0, 0)).lineTo(point(100, 0))
        const sub = subPath(p, 0.25, 0.75)

        const startX = sub.startPoint?.x ?? 0
        const endX = sub.endPoint?.x ?? 0
        expect(startX).toBeCloseTo(25)
        expect(endX).toBeCloseTo(75)
      })
    })

    describe('joinPaths', () => {
      it('joins multiple paths', () => {
        const p1 = path().moveTo(point(0, 0)).lineTo(point(50, 0))
        const p2 = path().moveTo(point(50, 0)).lineTo(point(100, 0))
        const joined = joinPaths([p1, p2])

        expect(joined.startPoint?.x).toBe(0)
        expect(joined.endPoint?.x).toBe(100)
      })

      it('can close joined path', () => {
        const p1 = path().moveTo(point(0, 0)).lineTo(point(100, 0))
        const p2 = path().moveTo(point(100, 0)).lineTo(point(50, 80))
        const joined = joinPaths([p1, p2], true)

        expect(joined.isClosed).toBe(true)
      })
    })
  })

  describe('brace and bracket', () => {
    describe('bracePath', () => {
      it('creates curly brace between points', () => {
        const brace = bracePath(point(0, 0), point(100, 0))
        expect(brace.isEmpty).toBe(false)
        expect(brace.toSVGPath()).toContain('C') // Curves
      })

      it('brace on left side', () => {
        const brace = bracePath(point(0, 0), point(100, 0), 20, 'left')
        expect(brace.isEmpty).toBe(false)
      })

      it('brace on right side', () => {
        const brace = bracePath(point(0, 0), point(100, 0), 20, 'right')
        expect(brace.isEmpty).toBe(false)
      })

      it('respects amplitude', () => {
        const small = bracePath(point(0, 0), point(100, 0), 10)
        const large = bracePath(point(0, 0), point(100, 0), 30)
        // Both should create valid paths
        expect(small.isEmpty).toBe(false)
        expect(large.isEmpty).toBe(false)
      })
    })

    describe('bracketPath', () => {
      it('creates square bracket', () => {
        const bracket = bracketPath(point(0, 0), point(0, 100))
        expect(bracket.isEmpty).toBe(false)
        expect(bracket.segments).toHaveLength(4) // M, L, L, L
      })

      it('bracket on left side', () => {
        const bracket = bracketPath(point(0, 0), point(0, 100), 15, 'left')
        expect(bracket.isEmpty).toBe(false)
      })

      it('bracket on right side', () => {
        const bracket = bracketPath(point(0, 0), point(0, 100), 15, 'right')
        expect(bracket.isEmpty).toBe(false)
      })
    })
  })

  describe('with curved paths', () => {
    it('decorations work on bezier paths', () => {
      const curved = path()
        .moveTo(point(0, 0))
        .curveTo(point(25, 50), point(75, 50), point(100, 0))

      const arrow = arrowDecoration(curved)
      expect(arrow.isEmpty).toBe(false)

      const tick = tickDecoration(curved, { position: 'mid' })
      expect(tick.isEmpty).toBe(false)
    })

    it('offset works on curved paths', () => {
      const curved = path()
        .moveTo(point(0, 0))
        .curveTo(point(25, 50), point(75, 50), point(100, 0))

      const offset = offsetPath(curved, 10)
      expect(offset.isEmpty).toBe(false)
    })
  })
})
