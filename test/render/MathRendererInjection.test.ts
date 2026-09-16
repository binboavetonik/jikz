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
  mathjaxAdapter,
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

describe('output kind', () => {
  const svgOut: MathRenderer = {
    output: 'svg',
    renderToString: (tex) => `<svg viewBox="0 0 10 10"><path d="M0 0" data-tex="${tex}"/></svg>`,
  }

  it('wraps html output in a foreignObject, as before', () => {
    const svg = draw(picture({ shapes: basicShapes, mathRenderer: tagged('html') }))
    expect(svg).toContain('foreignObject')
  })

  it('inlines svg output instead, with no foreignObject at all', () => {
    // The whole point: a foreignObject needs a live document's CSS and
    // fonts. Inlined SVG needs nothing, so it survives an <img> tag.
    const svg = draw(picture({ shapes: basicShapes, mathRenderer: svgOut }))
    expect(svg).not.toContain('foreignObject')
    expect(svg).toContain('data-tex="x^2"')
  })

  it('positions inlined svg the same way it positions a foreignObject', () => {
    const svg = draw(picture({ shapes: basicShapes, mathRenderer: svgOut }))
    // Centred on the text point (40,20) with the default 200×50 box.
    expect(svg).toMatch(/<svg[^>]*x="-60"[^>]*y="-5"/)
    expect(svg).toContain('overflow="visible"')
  })

  it('treats an unrecognised output kind as html rather than throwing', () => {
    // A newer adapter must be able to ship ahead of a jikz release.
    // The roadmap calls out the opposite pattern — a closed union
    // ending in `throw new Error('Unknown …')` — as a seam that is not
    // really a seam.
    const future = {
      output: 'webgpu-canvas' as unknown as 'svg',
      renderToString: () => '<span>later</span>',
    }
    const svg = draw(picture({ shapes: basicShapes, mathRenderer: future }))
    expect(svg).toContain('foreignObject')
    expect(svg).toContain('later')
  })

  it('defaults to html when an adapter names no output at all', () => {
    // Every adapter written before `output` existed, including the
    // fake in RendererCollaborators.test.ts.
    const legacy: MathRenderer = { renderToString: (tex) => `<b>${tex}</b>` }
    expect(draw(picture({ shapes: basicShapes, mathRenderer: legacy }))).toContain('foreignObject')
  })
})

describe('third-party adapters', () => {
  it('needs nothing from jikz but the interface', () => {
    // Written the way a user would write one: a plain object, no
    // import from jikz internals, no registration step.
    const mine: MathRenderer = {
      output: 'svg',
      renderToString: (tex, o) =>
        `<svg><text data-display="${o?.displayMode ?? false}">${tex}</text></svg>`,
    }
    const svg = draw(picture({ shapes: basicShapes, mathRenderer: mine }))
    expect(svg).toContain('data-display="false"')
  })

  it('wraps a MathJax-shaped object, element or string', () => {
    const asElement = mathjaxAdapter({ tex2svg: () => ({ outerHTML: '<svg id="el"/>' }) })
    const asString = mathjaxAdapter({ tex2svg: () => '<svg id="str"/>' })
    expect(asElement.output).toBe('svg')
    expect(asElement.renderToString('x')).toBe('<svg id="el"/>')
    expect(asString.renderToString('x')).toBe('<svg id="str"/>')
  })

  it('passes displayMode through to MathJax as `display`', () => {
    let seen: unknown
    const adapter = mathjaxAdapter({
      tex2svg: (_tex, o) => {
        seen = o?.display
        return '<svg/>'
      },
    })
    adapter.renderToString('x', { displayMode: true })
    expect(seen).toBe(true)
  })
})
