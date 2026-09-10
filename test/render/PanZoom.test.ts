import { describe, it, expect } from 'vitest'
import {
  meetFit,
  screenToScene,
  sceneToScreen,
  clampScale,
  zoomAtScreenPoint,
  panByScreenDelta,
  IDENTITY_TRANSFORM,
  type ViewBoxRect,
  type ViewportSize,
} from '../../src/render/PanZoom'

const container: ViewportSize = { width: 800, height: 600 }
const viewBox: ViewBoxRect = { x: -10, y: -10, width: 210, height: 110 }

describe('meetFit', () => {
  it('fits width-limited containers and centers vertically', () => {
    const fit = meetFit(container, viewBox)!
    expect(fit.scale).toBeCloseTo(800 / 210)
    expect(fit.offsetX).toBeCloseTo(0)
    expect(fit.offsetY).toBeCloseTo((600 - 110 * (800 / 210)) / 2)
  })

  it('fits height-limited containers and centers horizontally', () => {
    const fit = meetFit({ width: 2000, height: 600 }, viewBox)!
    expect(fit.scale).toBeCloseTo(600 / 110)
    expect(fit.offsetX).toBeCloseTo((2000 - 210 * (600 / 110)) / 2)
    expect(fit.offsetY).toBeCloseTo(0)
  })

  it('returns null for degenerate containers or viewBoxes', () => {
    expect(meetFit({ width: 0, height: 600 }, viewBox)).toBeNull()
    expect(meetFit(container, { ...viewBox, width: 0 })).toBeNull()
  })
})

describe('screenToScene / sceneToScreen', () => {
  it('maps the viewBox origin to the letterbox offset at identity', () => {
    const fit = meetFit(container, viewBox)!
    const p = screenToScene(container, viewBox, IDENTITY_TRANSFORM, fit.offsetX, fit.offsetY)!
    expect(p.x).toBeCloseTo(-10)
    expect(p.y).toBeCloseTo(-10)
  })

  it('round-trips through a pan/zoom transform', () => {
    const t = { tx: 25, ty: -40, scale: 1.8 }
    const screen = sceneToScreen(container, viewBox, t, 42, 17)!
    const back = screenToScene(container, viewBox, t, screen.x, screen.y)!
    expect(back.x).toBeCloseTo(42)
    expect(back.y).toBeCloseTo(17)
  })
})

describe('zoomAtScreenPoint', () => {
  it('keeps the scene point under the cursor fixed', () => {
    const t0 = { tx: 12, ty: -8, scale: 1.2 }
    const cursor = { x: 400, y: 300 }
    const scene = screenToScene(container, viewBox, t0, cursor.x, cursor.y)!
    const t1 = zoomAtScreenPoint(container, viewBox, t0, cursor.x, cursor.y, 1.5, 0.15, 4)
    expect(t1.scale).toBeCloseTo(1.8)
    const after = sceneToScreen(container, viewBox, t1, scene.x, scene.y)!
    expect(after.x).toBeCloseTo(cursor.x)
    expect(after.y).toBeCloseTo(cursor.y)
  })

  it('clamps to min/max scale and stops moving when clamped', () => {
    const t = zoomAtScreenPoint(container, viewBox, IDENTITY_TRANSFORM, 400, 300, 100, 0.15, 4)
    expect(t.scale).toBe(4)
    const t2 = zoomAtScreenPoint(container, viewBox, t, 400, 300, 2, 0.15, 4)
    expect(t2).toEqual(t) // already at the ceiling: no drift
  })

  it('ignores degenerate containers and non-positive factors', () => {
    const zero = { width: 0, height: 0 }
    expect(zoomAtScreenPoint(zero, viewBox, IDENTITY_TRANSFORM, 0, 0, 2, 0.15, 4)).toEqual(
      IDENTITY_TRANSFORM
    )
    expect(zoomAtScreenPoint(container, viewBox, IDENTITY_TRANSFORM, 0, 0, 0, 0.15, 4)).toEqual(
      IDENTITY_TRANSFORM
    )
  })
})

describe('panByScreenDelta', () => {
  it('converts screen px to user units through fit · scale', () => {
    const fitScale = 800 / 210
    const t = panByScreenDelta(container, viewBox, IDENTITY_TRANSFORM, fitScale * 10, 0)
    expect(t.tx).toBeCloseTo(10)
    expect(t.ty).toBeCloseTo(0)
  })

  it('is independent of the current zoom scale', () => {
    const fitScale = 800 / 210
    const t = panByScreenDelta(container, viewBox, { tx: 0, ty: 0, scale: 2 }, fitScale * 10, 0)
    expect(t.tx).toBeCloseTo(10)
  })

  it('moves the scene point under the cursor by exactly the delta', () => {
    const t0 = { tx: 5, ty: 5, scale: 1.3 }
    const scene = screenToScene(container, viewBox, t0, 100, 120)!
    const t1 = panByScreenDelta(container, viewBox, t0, 30, 40)
    const after = sceneToScreen(container, viewBox, t1, scene.x, scene.y)!
    expect(after.x).toBeCloseTo(130)
    expect(after.y).toBeCloseTo(160)
  })
})

describe('clampScale', () => {
  it('clamps into range', () => {
    expect(clampScale(0.01, 0.15, 4)).toBe(0.15)
    expect(clampScale(10, 0.15, 4)).toBe(4)
    expect(clampScale(2, 0.15, 4)).toBe(2)
  })
})
