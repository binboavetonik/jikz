/**
 * Canvas-level picture transform (TikZ canvas transformation):
 * geometry stays in user space; the SVG backend wraps the scene in a
 * transformed root group.
 */
import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { Transform } from '../../src/core/Transform'
import { point } from '../../src/core/Point'
import { SVGRenderer } from '../../src/render/SVGRenderer'
import { rectNode } from '../../src/node/Node'

describe('picture({ transform / scale })', () => {
  it('scale wraps the scene in a scaling group', () => {
    const svg = picture({ scale: 2 })
      .node('A', { at: point(50, 50), width: 20, height: 20, text: 'A' })
      .toSVG({ width: 200, height: 200 })

    expect(svg).toContain('<g transform="matrix(2 0 0 2 0 0)">')
    // Geometry stays in USER space — the path is not pre-scaled.
    expect(svg).toContain('M 40 40')
  })

  it('explicit Transform is emitted as an SVG matrix', () => {
    const svg = picture({ transform: Transform.translation(10, 20) })
      .node('A', { at: point(50, 50), width: 20, height: 20 })
      .toSVG({ width: 200, height: 200 })

    expect(svg).toContain('<g transform="matrix(1 0 0 1 10 20)">')
  })

  it('scale composes with an explicit transform', () => {
    const svg = picture({
      transform: Transform.translation(10, 0),
      scale: 3,
    })
      .node('A', { at: point(0, 0), width: 10, height: 10 })
      .toSVG({ width: 100, height: 100 })

    // translation(10,0).scale(3) → matrix(3 0 0 3 10 0)
    expect(svg).toContain('<g transform="matrix(3 0 0 3 10 0)">')
  })

  it('no transform → no wrapper group (unchanged output)', () => {
    const svg = picture()
      .node('A', { at: point(50, 50), width: 20, height: 20 })
      .toSVG({ width: 100, height: 100 })
    expect(svg).not.toContain('matrix(')
  })

  it('anchors/geometry APIs are unaffected by the canvas transform', () => {
    const pic = picture({ scale: 4 }).node('A', {
      at: point(50, 50),
      width: 20,
      height: 20,
    })
    // resolve() reports user-space coordinates.
    expect(pic.resolve('A.east').x).toBeCloseTo(60, 6)
    expect(pic.resolve('A.east').y).toBeCloseTo(50, 6)
  })
})

describe('SVGRenderer transform option (renderer-level seam)', () => {
  it('wraps render output in a transformed root group', () => {
    const r = new SVGRenderer(undefined, undefined, {
      transform: Transform.scaling(2),
    })
    r.renderNode(rectNode({ at: point(50, 50), width: 20, height: 20, text: 'A' }))
    const svg = r.toSVG({ width: 200, height: 200 })
    expect(svg).toContain('<g transform="matrix(2 0 0 2 0 0)">')
  })
})
