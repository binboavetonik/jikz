/**
 * `mathjaxAdapter` against MathJax's REAL output shape. The adapter's
 * other tests fake `tex2svg` with a bare `<svg>`; real MathJax wraps
 * its SVG in an `<mjx-container>`, and inlined as it came that wrapper
 * rendered the formula 0×0 in every browser. These run `mathjax-full`
 * itself, so the shape can never be assumed again.
 */
import { describe, it, expect } from 'vitest'
import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js'
import { mathjaxAdapter, type MathJaxLike } from '../../src/render/MathRenderer'
import { picture } from '../../src/picture/Picture'
import { basicShapes } from '../../src/geometry/shapes/basic'
import { point } from '../../src/core/Point'

const adaptor = liteAdaptor()
RegisterHTMLHandler(adaptor)
const doc = mathjax.document('', {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: 'none' }),
})
let calls = 0
/** MathJax as it hands output over: the container, serialized. */
const real: MathJaxLike = {
  tex2svg: (tex, options) => {
    calls++
    return adaptor.outerHTML(doc.convert(tex, { display: options?.display ?? false }))
  },
}

describe('mathjaxAdapter with real MathJax output', () => {
  it('the precondition: MathJax wraps its svg in an mjx-container', () => {
    expect(real.tex2svg('x^2') as string).toMatch(/^<mjx-container[^>]*><svg /)
  })

  it('unwraps to the formula svg and lets it fill its box', () => {
    const out = mathjaxAdapter(real).renderToString('e^{i\\pi}+1=0')
    expect(out).toMatch(/^<svg /)
    expect(out).toMatch(/<\/svg>$/)
    expect(out).not.toContain('mjx-container')
    expect(out).toMatch(/^<svg [^>]*width="100%"[^>]*height="100%"/)
    expect(out).toMatch(/viewBox="/)
    expect(out).toContain('<path') // glyph paths: nothing external
    expect(out).not.toMatch(/\dex"/) // no ex sizes left on the root
  })

  it('measures the box from the ex size, scaled by the font size', () => {
    const adapter = mathjaxAdapter(real)
    const at14 = adapter.measure!('e^{i\\pi}+1=0')!
    const at28 = adapter.measure!('e^{i\\pi}+1=0', { fontSize: 28 })!
    expect(at14.width).toBeGreaterThan(40)
    expect(at14.height).toBeGreaterThan(8)
    expect(at14.width).toBeGreaterThan(at14.height)
    expect(at28.width).toBeCloseTo(at14.width * 2, 6)
    expect(at28.height).toBeCloseTo(at14.height * 2, 6)
    // A taller formula measures taller.
    expect(adapter.measure!('\\frac{a}{b}')!.height).toBeGreaterThan(adapter.measure!('a')!.height)
  })

  it('converts each formula once, however often it is rendered and measured', () => {
    const adapter = mathjaxAdapter(real)
    calls = 0
    adapter.measure!('q_1')
    adapter.renderToString('q_1')
    adapter.renderToString('q_1')
    expect(calls).toBe(1)
    adapter.renderToString('q_1', { displayMode: true }) // display is another conversion
    expect(calls).toBe(2)
  })

  it("unwraps the browser bundle's element too, assistive MathML and all", () => {
    const inner = mathjaxAdapter(real).renderToString('x')
    const element = {
      outerHTML:
        `<mjx-container class="MathJax" jax="SVG" tabindex="0">` +
        (real.tex2svg('x') as string).replace(/^<mjx-container[^>]*>|<\/mjx-container>$/g, '') +
        `<mjx-assistive-mml unselectable="on"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math></mjx-assistive-mml>` +
        `</mjx-container>`,
    }
    const out = mathjaxAdapter({ tex2svg: () => element }).renderToString('x')
    expect(out).toBe(inner)
    expect(out).not.toContain('mjx-')
  })

  it('in a picture: a nested svg sized from the measurement, glyphs inside', () => {
    const svg = picture({ shapes: basicShapes, mathRenderer: mathjaxAdapter(real) })
      .node('E', { at: point(100, 50), shape: 'rectangle', width: 140, height: 50, text: '$e^{i\\pi}+1=0$' })
      .toSVG({ width: 200, height: 100 })
    expect(svg).not.toContain('mjx-container')
    expect(svg).not.toContain('$')
    const nested = svg.match(/<svg color="[^"]+" height="([\d.]+)" overflow="visible" width="([\d.]+)" x="([\d.]+)" y="([\d.]+)"><svg /)!
    expect(nested).not.toBeNull()
    const [h, w, x, y] = nested.slice(1).map(Number)
    // Not the 200×50 no-measure default, and centred on the node.
    expect(w).toBeLessThan(140)
    expect(h).toBeLessThan(40)
    expect(x + w / 2).toBeCloseTo(100, 0)
    expect(y + h / 2).toBeCloseTo(50, 0)
    expect(svg).toContain('<path')
  })
})
