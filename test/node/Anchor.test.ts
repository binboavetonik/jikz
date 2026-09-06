import { describe, it, expect } from 'vitest'
import {
  parseAnchorSpec,
  anchorOnRect,
  anchorOnCircle,
  anchorOnEllipse,
  anchorOnDiamond,
  oppositeAnchor,
} from '../../src/core/Anchor'
import { point } from '../../src/core/Point'

describe('Anchor', () => {
  describe('parseAnchorSpec', () => {
    it('parses numeric angles', () => {
      expect(parseAnchorSpec(0)).toBe(0)
      expect(parseAnchorSpec(45)).toBe(45)
      expect(parseAnchorSpec(90)).toBe(90)
      expect(parseAnchorSpec(360)).toBe(0) // normalized
      expect(parseAnchorSpec(-90)).toBe(270) // normalized
    })

    it('parses cardinal anchors', () => {
      expect(parseAnchorSpec('east')).toBe(0)
      expect(parseAnchorSpec('north')).toBe(270)
      expect(parseAnchorSpec('west')).toBe(180)
      expect(parseAnchorSpec('south')).toBe(90)
    })

    it('parses diagonal anchors', () => {
      expect(parseAnchorSpec('north east')).toBe(315)
      expect(parseAnchorSpec('north west')).toBe(225)
      expect(parseAnchorSpec('south west')).toBe(135)
      expect(parseAnchorSpec('south east')).toBe(45)
    })

    it('parses short aliases', () => {
      expect(parseAnchorSpec('n')).toBe(270)
      expect(parseAnchorSpec('e')).toBe(0)
      expect(parseAnchorSpec('s')).toBe(90)
      expect(parseAnchorSpec('w')).toBe(180)
      expect(parseAnchorSpec('ne')).toBe(315)
    })

    it('returns null for center', () => {
      expect(parseAnchorSpec('center')).toBeNull()
      expect(parseAnchorSpec('c')).toBeNull()
    })

    it('parses string numbers', () => {
      expect(parseAnchorSpec('45')).toBe(45)
      expect(parseAnchorSpec('45deg')).toBe(45)
    })

    it('is case insensitive', () => {
      expect(parseAnchorSpec('NORTH')).toBe(270)
      expect(parseAnchorSpec('North East')).toBe(315)
    })
  })

  describe('anchorOnRect', () => {
    const center = point(100, 100)
    const width = 80
    const height = 40

    it('returns center for center anchor', () => {
      const p = anchorOnRect(center, width, height, 'center')
      expect(p.x).toBe(100)
      expect(p.y).toBe(100)
    })

    it('returns correct cardinal anchors', () => {
      const east = anchorOnRect(center, width, height, 'east')
      expect(east.x).toBeCloseTo(140)
      expect(east.y).toBeCloseTo(100)

      const north = anchorOnRect(center, width, height, 'north')
      expect(north.x).toBeCloseTo(100)
      expect(north.y).toBeCloseTo(80)

      const west = anchorOnRect(center, width, height, 'west')
      expect(west.x).toBeCloseTo(60)
      expect(west.y).toBeCloseTo(100)

      const south = anchorOnRect(center, width, height, 'south')
      expect(south.x).toBeCloseTo(100)
      expect(south.y).toBeCloseTo(120)
    })

    it('returns correct corner anchors', () => {
      const ne = anchorOnRect(center, width, height, 'north east')
      expect(ne.x).toBeCloseTo(140)
      expect(ne.y).toBeCloseTo(80)
    })

    it('handles numeric angles', () => {
      const p = anchorOnRect(center, width, height, 0)
      expect(p.x).toBeCloseTo(140) // east
    })
  })

  describe('anchorOnCircle', () => {
    const center = point(100, 100)
    const radius = 50

    it('returns center for center anchor', () => {
      const p = anchorOnCircle(center, radius, 'center')
      expect(p.x).toBe(100)
      expect(p.y).toBe(100)
    })

    it('returns correct cardinal anchors', () => {
      const east = anchorOnCircle(center, radius, 'east')
      expect(east.x).toBeCloseTo(150)
      expect(east.y).toBeCloseTo(100)

      const north = anchorOnCircle(center, radius, 'north')
      expect(north.x).toBeCloseTo(100)
      expect(north.y).toBeCloseTo(50)
    })

    it('handles numeric angles', () => {
      const p = anchorOnCircle(center, radius, 45)
      const expected = 50 * Math.cos(Math.PI / 4)
      expect(p.x).toBeCloseTo(100 + expected)
      expect(p.y).toBeCloseTo(100 + expected)
    })
  })

  describe('anchorOnEllipse', () => {
    const center = point(100, 100)
    const rx = 60
    const ry = 30

    it('returns cardinal anchors at correct positions', () => {
      const east = anchorOnEllipse(center, rx, ry, 'east')
      expect(east.x).toBeCloseTo(160)
      expect(east.y).toBeCloseTo(100)

      const north = anchorOnEllipse(center, rx, ry, 'north')
      expect(north.x).toBeCloseTo(100)
      expect(north.y).toBeCloseTo(70)
    })
  })

  describe('anchorOnDiamond', () => {
    const center = point(100, 100)
    const width = 80
    const height = 60

    it('returns center for center anchor', () => {
      const p = anchorOnDiamond(center, width, height, 'center')
      expect(p.x).toBe(100)
      expect(p.y).toBe(100)
    })

    it('returns correct cardinal anchors (at vertices)', () => {
      const east = anchorOnDiamond(center, width, height, 'east')
      expect(east.x).toBeCloseTo(140)
      expect(east.y).toBeCloseTo(100)

      const north = anchorOnDiamond(center, width, height, 'north')
      expect(north.x).toBeCloseTo(100)
      expect(north.y).toBeCloseTo(70)
    })

    it('returns correct diagonal anchors (on edges)', () => {
      const ne = anchorOnDiamond(center, width, height, 'north east')
      // Point on the visually upper-right (NE) edge of the diamond
      expect(ne.x).toBeGreaterThan(100)
      expect(ne.y).toBeLessThan(100)
    })
  })

  describe('oppositeAnchor', () => {
    it('returns opposite cardinal anchor', () => {
      expect(oppositeAnchor('north')).toBe('south')
      expect(oppositeAnchor('south')).toBe('north')
      expect(oppositeAnchor('east')).toBe('west')
      expect(oppositeAnchor('west')).toBe('east')
    })

    it('returns opposite diagonal anchor', () => {
      expect(oppositeAnchor('north east')).toBe('south west')
      expect(oppositeAnchor('south west')).toBe('north east')
    })

    it('returns opposite angle', () => {
      expect(oppositeAnchor(0)).toBe(180)
      expect(oppositeAnchor(45)).toBe(225)
      expect(oppositeAnchor(90)).toBe(270)
    })
  })
})
