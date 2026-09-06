import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import {
  singleArrow,
  doubleArrow,
  callout,
  cloud,
  signal,
  tape,
  starburst,
} from '../../src/geometry/complex'

describe('SingleArrow', () => {
  it('creates with default options', () => {
    const shape = singleArrow()
    expect(shape.type).toBe('single arrow')
    expect(shape.center.x).toBe(0)
    expect(shape.center.y).toBe(0)
    expect(shape.direction).toBe('east')
  })

  it('creates with custom direction', () => {
    const shape = singleArrow({ direction: 'north' })
    expect(shape.direction).toBe('north')
  })

  it('has vertices forming arrow shape', () => {
    const shape = singleArrow({ width: 80, height: 40 })
    const verts = shape.vertices
    expect(verts.length).toBeGreaterThanOrEqual(7) // Arrow has at least 7 vertices
  })

  it('has tip anchor', () => {
    const shape = singleArrow({ center: point(100, 100), direction: 'east' })
    const tip = shape.anchor('tip')
    expect(tip.x).toBeGreaterThan(shape.center.x) // Tip is to the east
  })

  it('generates valid SVG path', () => {
    const shape = singleArrow()
    const path = shape.toSVGPath()
    expect(path).toMatch(/^M .* Z$/)
  })

  it('contains center point', () => {
    const shape = singleArrow({ center: point(50, 50) })
    expect(shape.contains(point(50, 50))).toBe(true)
  })

  it('can be moved', () => {
    const shape = singleArrow({ center: point(0, 0) })
    const moved = shape.moveTo(point(100, 100))
    expect(moved.center.x).toBe(100)
    expect(moved.center.y).toBe(100)
  })
})

describe('DoubleArrow', () => {
  it('creates with default options', () => {
    const shape = doubleArrow()
    expect(shape.type).toBe('double arrow')
    expect(shape.direction).toBe('horizontal')
  })

  it('creates vertical double arrow', () => {
    const shape = doubleArrow({ direction: 'vertical' })
    expect(shape.direction).toBe('vertical')
  })

  it('has two tips', () => {
    const shape = doubleArrow({ center: point(100, 100) })
    const tip1 = shape.tip1
    const tip2 = shape.tip2
    expect(tip1.x).toBeLessThan(shape.center.x)
    expect(tip2.x).toBeGreaterThan(shape.center.x)
  })

  it('has tip anchors', () => {
    const shape = doubleArrow()
    expect(shape.anchor('tip1')).toBeDefined()
    expect(shape.anchor('tip2')).toBeDefined()
  })

  it('generates valid SVG path', () => {
    const shape = doubleArrow()
    const path = shape.toSVGPath()
    expect(path).toMatch(/^M .* Z$/)
  })

  it('bounds include both tips', () => {
    const shape = doubleArrow({ center: point(100, 100), width: 80 })
    const bounds = shape.bounds
    expect(bounds[2] - bounds[0]).toBeGreaterThanOrEqual(80)
  })
})

describe('Callout', () => {
  it('creates with default options', () => {
    const shape = callout()
    expect(shape.type).toBe('callout')
    expect(shape.pointerPosition).toBe('south')
  })

  it('creates with custom pointer position', () => {
    const shape = callout({ pointerPosition: 'north' })
    expect(shape.pointerPosition).toBe('north')
  })

  it('has pointer tip below center when south', () => {
    const shape = callout({ center: point(100, 100), pointerPosition: 'south' })
    const tip = shape.pointerTip
    expect(tip.y).toBeGreaterThan(shape.center.y)
  })

  it('has pointer anchor', () => {
    const shape = callout()
    const tip = shape.anchor('pointer')
    expect(tip).toBeDefined()
    expect(tip).toEqual(shape.pointerTip)
  })

  it('generates valid SVG path', () => {
    const shape = callout()
    const path = shape.toSVGPath()
    expect(path).toMatch(/^M .* Z$/)
  })

  it('contains center point', () => {
    const shape = callout({ center: point(50, 50) })
    expect(shape.contains(point(50, 50))).toBe(true)
  })

  it('pointer offset moves pointer along edge', () => {
    const left = callout({ pointerOffset: -0.8 })
    const right = callout({ pointerOffset: 0.8 })
    expect(left.pointerTip.x).toBeLessThan(right.pointerTip.x)
  })
})

describe('Cloud', () => {
  it('creates with default options', () => {
    const shape = cloud()
    expect(shape.type).toBe('cloud')
    expect(shape.puffs).toBe(10)
  })

  it('creates with custom puff count', () => {
    const shape = cloud({ puffs: 6 })
    expect(shape.puffs).toBe(6)
  })

  it('has puff centers', () => {
    const shape = cloud({ puffs: 8 })
    const centers = shape.puffCenters
    expect(centers.length).toBe(8)
  })

  it('has puff outer points', () => {
    const shape = cloud({ puffs: 8 })
    const outerPoints = shape.puffOuterPoints
    expect(outerPoints.length).toBe(8)
  })

  it('has puff anchors', () => {
    const shape = cloud({ puffs: 5 })
    const puff1 = shape.anchor('puff 1')
    const puff2 = shape.anchor('puff 2')
    expect(puff1).toBeDefined()
    expect(puff2).toBeDefined()
  })

  it('generates valid SVG path with arcs', () => {
    const shape = cloud()
    const path = shape.toSVGPath()
    expect(path).toMatch(/^M .* A .* Z$/)
  })

  it('contains center point', () => {
    const shape = cloud({ center: point(50, 50) })
    expect(shape.contains(point(50, 50))).toBe(true)
  })
})

describe('Signal', () => {
  it('creates with default options', () => {
    const shape = signal()
    expect(shape.type).toBe('signal')
    expect(shape.from).toBe('west')
    expect(shape.to).toBe('east')
  })

  it('creates with custom from/to', () => {
    const shape = signal({ from: 'north', to: 'south' })
    expect(shape.from).toBe('north')
    expect(shape.to).toBe('south')
  })

  it('has vertices', () => {
    const shape = signal()
    const verts = shape.vertices
    expect(verts.length).toBeGreaterThanOrEqual(4)
  })

  it('generates valid SVG path', () => {
    const shape = signal()
    const path = shape.toSVGPath()
    expect(path).toMatch(/^M .* Z$/)
  })

  it('contains center point', () => {
    const shape = signal({ center: point(50, 50) })
    expect(shape.contains(point(50, 50))).toBe(true)
  })

  it('east tip is at boundary when to=east', () => {
    const shape = signal({ center: point(100, 100), to: 'east' })
    const east = shape.anchor('east')
    expect(east.x).toBeGreaterThan(shape.center.x)
  })
})

describe('Tape', () => {
  it('creates with default options', () => {
    const shape = tape()
    expect(shape.type).toBe('tape')
    expect(shape.bendHeight).toBe(8)
    expect(shape.bendPosition).toBe(0.5)
  })

  it('creates with custom bend height', () => {
    const shape = tape({ bendHeight: 15 })
    expect(shape.bendHeight).toBe(15)
  })

  it('bounds equal the declared box (wave bends inward)', () => {
    const shape = tape({ center: point(100, 100), width: 60, height: 40, bendHeight: 10 })
    const bounds = shape.bounds
    // The wavy edge bends INWARD from the declared box, so the box is
    // the true extent regardless of bendHeight.
    expect(bounds).toEqual([70, 80, 130, 120])
  })

  it('generates SVG path with curves', () => {
    const shape = tape()
    const path = shape.toSVGPath()
    expect(path).toMatch(/Q/) // Has quadratic bezier curves
  })

  it('contains center point', () => {
    const shape = tape({ center: point(50, 50) })
    expect(shape.contains(point(50, 50))).toBe(true)
  })

  it('north anchor sits on the declared top edge', () => {
    const noBend = tape({ center: point(100, 100), height: 40, bendHeight: 0 })
    const withBend = tape({ center: point(100, 100), height: 40, bendHeight: 15 })
    // Both touch the declared top edge; the wave dips inward between corners.
    expect(noBend.north.y).toBeCloseTo(80)
    expect(withBend.north.y).toBeCloseTo(80)
  })
})

describe('Starburst', () => {
  it('creates with default options', () => {
    const shape = starburst()
    expect(shape.type).toBe('starburst')
    expect(shape.points).toBe(10)
    expect(shape.innerRadiusRatio).toBe(0.5)
    expect(shape.randomness).toBe(0)
  })

  it('creates with custom point count', () => {
    const shape = starburst({ points: 12 })
    expect(shape.points).toBe(12)
  })

  it('has alternating inner/outer vertices', () => {
    const shape = starburst({ points: 5 })
    const verts = shape.vertices
    expect(verts.length).toBe(10) // 5 outer + 5 inner
  })

  it('has point anchors', () => {
    const shape = starburst({ points: 8 })
    const point1 = shape.anchor('point 1')
    const point2 = shape.anchor('point 2')
    expect(point1).toBeDefined()
    expect(point2).toBeDefined()
  })

  it('generates valid SVG path', () => {
    const shape = starburst()
    const path = shape.toSVGPath()
    expect(path).toMatch(/^M .* Z$/)
  })

  it('contains center point', () => {
    const shape = starburst({ center: point(50, 50) })
    expect(shape.contains(point(50, 50))).toBe(true)
  })

  it('randomness creates irregular shapes', () => {
    const regular = starburst({ points: 6, seed: 42, randomness: 0 })
    const irregular = starburst({ points: 6, seed: 42, randomness: 0.5 })

    const regVerts = regular.vertices
    const irregVerts = irregular.vertices

    // At least some vertices should differ
    let hasDifference = false
    for (let i = 0; i < regVerts.length; i++) {
      if (Math.abs(regVerts[i]!.x - irregVerts[i]!.x) > 0.1 ||
          Math.abs(regVerts[i]!.y - irregVerts[i]!.y) > 0.1) {
        hasDifference = true
        break
      }
    }
    expect(hasDifference).toBe(true)
  })

  it('seeded randomness is reproducible', () => {
    const shape1 = starburst({ points: 6, seed: 12345, randomness: 0.3 })
    const shape2 = starburst({ points: 6, seed: 12345, randomness: 0.3 })

    const verts1 = shape1.vertices
    const verts2 = shape2.vertices

    for (let i = 0; i < verts1.length; i++) {
      expect(verts1[i]!.x).toBeCloseTo(verts2[i]!.x, 5)
      expect(verts1[i]!.y).toBeCloseTo(verts2[i]!.y, 5)
    }
  })
})
