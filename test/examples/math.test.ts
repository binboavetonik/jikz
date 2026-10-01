// @vitest-environment jsdom
/**
 * The gallery's math. jikz renders `$...$` through an INJECTED
 * renderer and never reads a global; for a release the docs site
 * loaded KaTeX from a <script> tag, injected nothing, and every math
 * label on the gallery showed its dollar signs. The snapshot suite
 * runs without a renderer, so it pinned the fallback and said nothing.
 *
 * This runs the theme's own `installMath()` — the call the site makes
 * — and asserts what a visitor should see.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { getDefaultMathRenderer, setDefaultMathRenderer } from 'jikz'
import { demos } from '../../examples/manifest'
import { installMath } from '../../docs/.vitepress/theme/math'

const DOLLARS = /\$[^$]+\$/

function render(id: string): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  demos.find((d) => d.id === id)!.render(container)
  return container
}

const rawMathTexts = (el: Element) =>
  [...el.querySelectorAll('text')].map((t) => t.textContent ?? '').filter((t) => DOLLARS.test(t))

afterEach(() => {
  setDefaultMathRenderer(undefined)
  document.body.innerHTML = ''
})

describe('gallery math', () => {
  it('without a renderer, math labels fall back to their source text', () => {
    expect(getDefaultMathRenderer()).toBeUndefined()
    expect(rawMathTexts(render('katex-math'))).toHaveLength(3)
  })

  it("the theme's installMath() sets the page-wide renderer", () => {
    installMath()
    expect(getDefaultMathRenderer()).toBeDefined()
    expect(getDefaultMathRenderer()!.output ?? 'html').toBe('html')
  })

  it('with it, the math example renders KaTeX and no dollar signs', () => {
    installMath()
    const el = render('katex-math')
    expect(rawMathTexts(el)).toEqual([])
    expect(el.querySelectorAll('foreignObject')).toHaveLength(3)
    expect(el.querySelectorAll('.katex')).toHaveLength(3)
    expect(el.querySelector('.katex')!.textContent).toContain('e')
  })

  it('no example anywhere in the gallery is left showing raw math', () => {
    // Which examples carry math at all: those with `$...$` text when
    // rendered bare.
    const withMath = demos.filter((d) => rawMathTexts(render(d.id)).length > 0).map((d) => d.id)
    expect(withMath.length).toBeGreaterThan(10)
    document.body.innerHTML = ''
    installMath()
    const stillRaw = withMath.filter((id) => rawMathTexts(render(id)).length > 0)
    expect(stillRaw).toEqual([])
  })
})
