// @vitest-environment jsdom
/**
 * How a picture gets a math renderer.
 *
 * KaTeX is an optional peer and `toSVG()` is synchronous, so jikz
 * cannot import it: a static import would make it mandatory for
 * everyone, a dynamic one is async. The caller injects, and these
 * pin the three ways of doing that and the order they resolve in.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { picture, type Picture } from '../../src/picture/Picture'
import type { ShapeSet } from '../../src/geometry/ShapeKind'
import { point } from '../../src/core/Point'
import { basicShapes } from '../../src/geometry/shapes'
import {
  setDefaultMathRenderer,
  getDefaultMathRenderer,
  type MathRenderer,
} from '../../src/render/MathRenderer'

const tagged = (tag: string): MathRenderer => ({
  renderToString: (tex) => `<span data-by="${tag}">${tex}</span>`,
})

const draw = <S extends ShapeSet>(pic: Picture<S>): string =>
  pic.text(point(40, 20), '$x^2$').toSVG({ width: 80, height: 40 })

afterEach(() => setDefaultMathRenderer(undefined))

describe('math renderer injection', () => {
  it('renders math as plain text when nothing is injected', () => {
    const svg = draw(picture({ shapes: basicShapes }))
    expect(svg).not.toContain('foreignObject')
  })

  it('takes one from the picture', () => {
    const svg = draw(picture({ shapes: basicShapes, mathRenderer: tagged('picture') }))
    expect(svg).toContain('data-by="picture"')
  })

  it('takes one from the module default', () => {
    setDefaultMathRenderer(tagged('default'))
    expect(draw(picture({ shapes: basicShapes }))).toContain('data-by="default"')
  })

  it('lets the picture beat the module default', () => {
    setDefaultMathRenderer(tagged('default'))
    const svg = draw(picture({ shapes: basicShapes, mathRenderer: tagged('picture') }))
    expect(svg).toContain('data-by="picture"')
    expect(svg).not.toContain('data-by="default"')
  })

  it('lets a single render beat both', () => {
    setDefaultMathRenderer(tagged('default'))
    const pic = picture({ shapes: basicShapes, mathRenderer: tagged('picture') })
    pic.text(point(40, 20), '$x^2$')
    const svg = pic.toSVG({ width: 80, height: 40, mathRenderer: tagged('call') })
    expect(svg).toContain('data-by="call"')
    expect(svg).not.toContain('data-by="picture"')
  })

  it('clears the default, so tests do not leak into one another', () => {
    setDefaultMathRenderer(tagged('default'))
    expect(getDefaultMathRenderer()).toBeDefined()
    setDefaultMathRenderer(undefined)
    expect(getDefaultMathRenderer()).toBeUndefined()
    expect(draw(picture({ shapes: basicShapes }))).not.toContain('foreignObject')
  })

  it('reaches mount() too, not just toSVG()', () => {
    // Same two construction sites, same option.
    const pic = picture({ shapes: basicShapes, mathRenderer: tagged('picture') })
    pic.text(point(40, 20), '$x^2$')
    const el = document.createElement('div')
    pic.mount(el, { width: 80, height: 40 })
    expect(el.innerHTML).toContain('data-by="picture"')
  })
})
