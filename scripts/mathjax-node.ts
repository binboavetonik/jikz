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
import { mathjaxAdapter, type MathRenderer } from '../src/index'

let cached: MathRenderer | undefined

/**
 * A {@link MathRenderer} backed by MathJax's SVG output: the public
 * `mathjaxAdapter` over `mathjax-full`'s document API, serialized as
 * MathJax hands it over — `<mjx-container>` wrapper and all. The
 * adapter unwraps, scales and measures; nothing here is private to
 * the build.
 */
export function nodeMathJax(): MathRenderer {
  if (cached) return cached

  const adaptor = liteAdaptor()
  RegisterHTMLHandler(adaptor)
  const doc = mathjax.document('', {
    InputJax: new TeX({ packages: AllPackages }),
    OutputJax: new SVG({ fontCache: 'none' }),
  })

  cached = mathjaxAdapter({
    tex2svg: (tex, options) => adaptor.outerHTML(doc.convert(tex, { display: options?.display ?? false })),
  })
  return cached
}
