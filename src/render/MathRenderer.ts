/**
 * Pluggable math (LaTeX) rendering for labels and node text.
 *
 * Inject an implementation into `SVGRenderer` via
 * `new SVGRenderer(draw, style, { mathRenderer })` — typically
 * {@link katexAdapter} wrapping a KaTeX instance:
 *
 * ```ts
 * import katex from 'katex'
 * import { SVGRenderer, katexAdapter } from 'jikz'
 *
 * new SVGRenderer(undefined, undefined, { mathRenderer: katexAdapter(katex) })
 * ```
 *
 * Previously the renderer read an ambient global `katex` binding, which
 * was uninjectable and untestable. The global is still honored as a
 * deprecated fallback (with a one-time warning) for one release.
 */
import { warn } from '../core/errors'
export interface MathRendererOptions {
  /** Display mode (centered, larger) */
  displayMode?: boolean
  /** Throw on parse error instead of rendering an error message */
  throwOnError?: boolean
  /** Color for parse errors */
  errorColor?: string
  /** Macro definitions */
  macros?: Record<string, string>
}

/**
 * How a renderer's markup gets carried into the SVG tree.
 *
 * SVG offers exactly two ways to hold foreign content, which is why
 * this has two values rather than an arbitrary set: a `foreignObject`
 * for HTML, or native SVG elements inlined directly.
 *
 * - `'html'` (the default) goes in a `foreignObject`. Right for KaTeX,
 *   whose output is HTML and CSS — but a `foreignObject` needs that
 *   CSS and its web fonts, so it renders only in a live document, not
 *   in a standalone `.svg` opened through an `<img>` tag.
 * - `'svg'` is inlined as-is. Right for MathJax's SVG output, which is
 *   glyph *paths*: no stylesheet, no fonts, nothing external, so it
 *   renders anywhere an SVG renders.
 */
export type MathOutput = 'html' | 'svg'

/**
 * Anything that can turn a TeX string into markup.
 *
 * Structural, with every member beyond `renderToString` optional, so
 * your own adapter is a plain object — see {@link katexAdapter} and
 * {@link mathjaxAdapter} for the two shipped ones, which get no
 * privileged access and are written against this same interface.
 */
export interface MathRenderer {
  renderToString(tex: string, options?: MathRendererOptions): string
  /**
   * What {@link renderToString} produces. Defaults to `'html'`, so an
   * adapter written before this existed keeps working unchanged.
   *
   * A value this version of jikz does not recognise is treated as
   * `'html'` rather than throwing, so a newer adapter degrades on an
   * older jikz instead of breaking it.
   */
  readonly output?: MathOutput
  /**
   * Measured size of the rendered formula in px. Optional and
   * browser-only (renders offscreen); return undefined when
   * measurement is unavailable — callers fall back to estimates.
   * Placement code (`placeText`, label gap math) uses this to make
   * `distance` exact for math labels.
   */
  measure?(
    tex: string,
    options?: MathRendererOptions & { fontSize?: number }
  ): { width: number; height: number } | undefined
}

/**
 * Structural type for a KaTeX instance (matches `katex.renderToString`).
 */
export interface KaTeXLike {
  renderToString(tex: string, options?: MathRendererOptions): string
}

/**
 * Wrap a KaTeX instance as a {@link MathRenderer}.
 *
 * `measure` renders into a hidden absolutely-positioned probe span and
 * reads its bounding box — browser-only; headless it returns undefined
 * and callers fall back to font-metric estimates.
 */
export function katexAdapter(katex: KaTeXLike): MathRenderer {
  return {
    renderToString: (tex, options) => katex.renderToString(tex, options),
    measure: (tex, options) => {
      if (typeof document === 'undefined') return undefined
      const probe = document.createElement('span')
      probe.style.position = 'absolute'
      probe.style.visibility = 'hidden'
      probe.style.whiteSpace = 'nowrap'
      if (options?.fontSize) probe.style.fontSize = `${options.fontSize}px`
      probe.innerHTML = katex.renderToString(tex, {
        ...options,
        throwOnError: false,
      })
      document.body.appendChild(probe)
      try {
        const r = probe.getBoundingClientRect()
        return { width: r.width, height: r.height }
      } finally {
        probe.remove()
      }
    },
  }
}

/**
 * Structural type for a MathJax instance with SVG output — the browser
 * bundle's `MathJax.tex2svg`, or `mathjax-full`'s document API wrapped
 * to match.
 */
export interface MathJaxLike {
  tex2svg(tex: string, options?: { display?: boolean }): { outerHTML?: string } | string
}

/**
 * Wrap MathJax's **SVG output** as a {@link MathRenderer}.
 *
 * The reason to reach for this over {@link katexAdapter}: MathJax's
 * SVG output is glyph paths, so it needs no stylesheet and no web
 * fonts and survives anywhere an SVG goes — a standalone `.svg`, an
 * `<img>` tag, Inkscape, a PDF converter. KaTeX cannot do this at all;
 * its outputs are HTML+CSS and MathML, and both need a live document.
 *
 * ```ts
 * import { mathjaxAdapter } from '@ozan.e/jikz'
 * picture({ shapes, mathRenderer: mathjaxAdapter(MathJax) })
 * ```
 *
 * For the live DOM, KaTeX is still the lighter, faster choice. Pick
 * per picture; the two coexist in one process.
 */
export function mathjaxAdapter(mathjax: MathJaxLike): MathRenderer {
  return {
    output: 'svg',
    renderToString: (tex, options) => {
      const out = mathjax.tex2svg(tex, { display: options?.displayMode ?? false })
      // The browser bundle hands back an element; a wrapped
      // mathjax-full hands back serialized markup already.
      return typeof out === 'string' ? out : (out.outerHTML ?? '')
    },
  }
}

let warnedAboutGlobal = false

/**
 * Check if text contains LaTeX (inline math `$...$`, display math
 * `$$...$$`, or LaTeX commands like `\frac`).
 */
export function isLaTeX(text: string): boolean {
  return /\$.*\$|\\[a-zA-Z]+/.test(text)
}

/**
 * Extract TeX content from delimiters: `$$...$$` (display mode),
 * `$...$` (inline), or raw TeX with no delimiters.
 */
export function extractLaTeX(text: string): { tex: string; displayMode: boolean } {
  // Display mode: $$...$$
  const displayMatch = text.match(/^\$\$(.*)\$\$$/s)
  if (displayMatch) {
    return { tex: displayMatch[1]!, displayMode: true }
  }

  // Inline mode: $...$
  const inlineMatch = text.match(/^\$(.*)\$$/s)
  if (inlineMatch) {
    return { tex: inlineMatch[1]!, displayMode: false }
  }

  // Raw LaTeX (no delimiters)
  return { tex: text, displayMode: false }
}

let defaultMathRenderer: MathRenderer | undefined

/**
 * Set the math renderer used by pictures that do not name one of their
 * own. Call it once, as early as you like:
 *
 * ```ts
 * import katex from 'katex'
 * import { setDefaultMathRenderer, katexAdapter } from '@ozan.e/jikz'
 *
 * setDefaultMathRenderer(katexAdapter(katex))
 * ```
 *
 * **Prefer `picture({ mathRenderer })`** where you own the code that
 * builds the picture — explicit beats ambient, and two pictures can
 * then differ. This exists for the case that option cannot reach: a
 * harness rendering pictures it does not own. jikz's own cookbook
 * builder is exactly that, and so is any SSR host rendering
 * third-party examples.
 *
 * KaTeX is an optional peer, and `toSVG()` is synchronous, so jikz
 * cannot import it for you: a static import would make it mandatory
 * for everyone, and a dynamic one is async. Hence injection.
 *
 * Pass `undefined` to clear it — useful between tests.
 */
export function setDefaultMathRenderer(renderer: MathRenderer | undefined): void {
  defaultMathRenderer = renderer
}

/** The renderer {@link setDefaultMathRenderer} installed, if any. */
export function getDefaultMathRenderer(): MathRenderer | undefined {
  return defaultMathRenderer
}

/**
 * Resolve the effective math renderer, most specific first:
 *
 * 1. the one injected into this renderer (per-call or per-picture),
 * 2. the module default from {@link setDefaultMathRenderer},
 * 3. an ambient global `katex` — deprecated, warns once.
 *
 * Step 2 is what step 3's deprecation was missing: the replacement it
 * points at was only reachable through `new SVGRenderer(...)`, which
 * the picture layer never exposed.
 */
export function resolveMathRenderer(injected?: MathRenderer): MathRenderer | undefined {
  if (injected) return injected
  if (defaultMathRenderer) return defaultMathRenderer

  const globalKaTeX = (globalThis as { katex?: KaTeXLike }).katex
  if (globalKaTeX) {
    if (!warnedAboutGlobal) {
      warnedAboutGlobal = true
      warn(
        'jikz: reading KaTeX from the global scope is deprecated and will be ' +
        'removed in a future release. Inject it explicitly instead: ' +
        "new SVGRenderer(undefined, undefined, { mathRenderer: katexAdapter(katex) })"
      )
    }
    return katexAdapter(globalKaTeX)
  }

  return undefined
}
