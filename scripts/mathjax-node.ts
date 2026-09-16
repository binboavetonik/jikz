/**
 * A synchronous MathJax **SVG** renderer for the headless tools.
 *
 * Why MathJax here and not KaTeX: these tools write standalone `.svg`
 * files that the cookbook shows through an `<img>` tag, and an
 * `<img>`-loaded SVG loads no stylesheet and no web fonts. KaTeX emits
 * HTML that needs both — measured 2026-09-15, and what you get without
 * them is the visual markup and the MathML copy rendering on top of
 * each other. MathJax's SVG output is glyph paths: self-contained, so
 * it survives the `<img>` boundary.
 *
 * `fontCache: 'none'` is the load-bearing setting. The default caches
 * glyphs in `<defs>` and references them with `<use>`, which breaks
 * twice here: the ids collide once several formulas are inlined into
 * one picture, and a cached glyph referenced across an `<img>`
 * boundary has nothing to resolve against.
 */
import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js'
import type { MathRenderer } from '../src/index'

/** MathJax sizes its output in `ex`; jikz places it in px. */
const EX_TO_PX = 0.5

let cached: MathRenderer | undefined

/** A {@link MathRenderer} backed by MathJax's SVG output. */
export function nodeMathJax(): MathRenderer {
  if (cached) return cached

  const adaptor = liteAdaptor()
  RegisterHTMLHandler(adaptor)
  const doc = mathjax.document('', {
    InputJax: new TeX({ packages: AllPackages }),
    OutputJax: new SVG({ fontCache: 'none' }),
  })

  const convert = (tex: string, display: boolean): string =>
    adaptor.innerHTML(doc.convert(tex, { display }))

  cached = {
    output: 'svg',
    renderToString: (tex, options) => {
      const svg = convert(tex, options?.displayMode ?? false)
      // Let the formula fill the box jikz sized from `measure` below;
      // its own viewBox keeps the aspect, so nothing distorts.
      return svg.replace(/^(<svg[^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, '$1 width="100%" height="100%"')
    },
    measure: (tex, options) => {
      const svg = convert(tex, options?.displayMode ?? false)
      const w = /\swidth="([\d.]+)ex"/.exec(svg)
      const h = /\sheight="([\d.]+)ex"/.exec(svg)
      if (!w || !h) return undefined
      // One factor for both axes, so the aspect ratio survives.
      const px = (options?.fontSize ?? 14) * EX_TO_PX
      return { width: Number(w[1]) * px, height: Number(h[1]) * px }
    },
  }
  return cached
}
