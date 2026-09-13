import { describe, it, expect } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { allShapes } from '../../src/geometry/shapes'
const SHAPES = allShapes

const PULSE = {
  attributeName: 'opacity',
  values: '1;0.35;1',
  dur: '1.2s',
  repeatCount: 'indefinite',
} as const

describe('SMIL animation emission', () => {
  it('emits <animate> as a child of a drawn shape', () => {
    const svg = picture({ shapes: SHAPES })
      .draw(circle(point(10, 10), 5), { animate: PULSE })
      .toSVG({ width: 40, height: 40 })

    expect(svg).toContain(
      '<animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" values="1;0.35;1"/>'
    )
    // child of the shape element, not the document root
    expect(svg).toMatch(/<circle [^>]*><animate [^>]*\/><\/circle>/)
  })

  it('emits into text elements via TextOptions', () => {
    const svg = picture({ shapes: SHAPES })
      .text(point(0, 0), '?', { animate: PULSE })
      .toSVG({ width: 20, height: 20 })
    // text content first, then the animate child
    expect(svg).toMatch(/<text [^>]*>\?<animate [^>]*\/><\/text>/)
  })

  it('emits into the group wrapping a node (shape + label pulse together)', () => {
    const svg = picture({ shapes: SHAPES })
      .node('A', { at: point(0, 0), ...rectNodeOptions(), text: 'A' }, { animate: PULSE })
      .toSVG({ width: 40, height: 40 })
    expect(svg).toMatch(/<g><path [^>]*\/><text [^>]*>A<\/text><animate [^>]*\/><\/g>/)
  })

  it('supports an array of animations on one element', () => {
    const svg = picture({ shapes: SHAPES })
      .draw(circle(point(0, 0), 5), {
        animate: [PULSE, { attributeName: 'fill', from: '#000', to: '#f00', dur: '2s', fill: 'freeze' }],
      })
      .toSVG({ width: 20, height: 20 })
    expect(svg).toContain('repeatCount="indefinite"')
    expect(svg).toContain(
      '<animate attributeName="fill" dur="2s" fill="freeze" from="#000" to="#f00"/>'
    )
  })

  it('kind: animateTransform switches the tag', () => {
    const svg = picture({ shapes: SHAPES })
      .draw(circle(point(0, 0), 5), {
        animate: {
          kind: 'animateTransform',
          attributeName: 'transform',
          values: '0;10;0',
          dur: '1s',
          repeatCount: 'indefinite',
        },
      })
      .toSVG({ width: 20, height: 20 })
    expect(svg).toContain('<animateTransform attributeName="transform"')
  })

  it('passes keyTimes/calcMode/keySplines/begin through', () => {
    const svg = picture({ shapes: SHAPES })
      .draw(circle(point(0, 0), 5), {
        animate: {
          attributeName: 'opacity',
          values: '0;1',
          keyTimes: '0;1',
          calcMode: 'spline',
          keySplines: '0.4 0 0.2 1',
          begin: '0.5s',
          dur: '1s',
        },
      })
      .toSVG({ width: 20, height: 20 })
    expect(svg).toContain('keyTimes="0;1"')
    expect(svg).toContain('calcMode="spline"')
    expect(svg).toContain('keySplines="0.4 0 0.2 1"')
    expect(svg).toContain('begin="0.5s"')
  })

  it('leaves elements without animate untouched', () => {
    const svg = picture({ shapes: SHAPES })
      .draw(circle(point(0, 0), 5))
      .toSVG({ width: 20, height: 20 })
    expect(svg).not.toContain('<animate')
  })
})

function rectNodeOptions() {
  return { shape: SHAPES['rectangle'] as const, width: 20, height: 12, innerSep: 0, minWidth: 0, minHeight: 0 }
}
