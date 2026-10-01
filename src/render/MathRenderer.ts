/**
 * Pluggable math (LaTeX) rendering for labels and node text.
 *
 * A math renderer is always **injected** — jikz never reads a global
 * `katex` or `MathJax`, so a page that merely loads one of them from a
 * `<script>` tag gets the plain-text fallback until it says so:
 *
 * ```ts
 * import katex from 'katex'
 * import { picture, katexAdapter, setDefaultMathRenderer } from 'jikz'
 *
 * picture({ mathRenderer: katexAdapter(katex) })     // this picture
 * setDefaultMathRenderer(katexAdapter(katex))        // every picture on the page
 * ```
 *
 * {@link katexAdapter} (HTML in a `foreignObject`, for live pages) and
 * {@link mathjaxAdapter} (SVG glyph paths, for anything an SVG goes)
 * are the two shipped adapters.
 */
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
 * to match. Either may hand back MathJax's own `<mjx-container>`
 * wrapper, as an element or as markup; the adapter unwraps it.
 */
export interface MathJaxLike {
  tex2svg(tex: string, options?: { display?: boolean }): { outerHTML?: string } | string
}

/**
 * MathJax sizes its SVG in `ex`; jikz places it in px. MathJax's own
 * default is 1ex = 0.5em, and a label's em is its font size.
 */
const MATHJAX_EX_TO_EM = 0.5

/** Formulas repeat (every tick, every node); convert each once. */
const MATHJAX_CACHE_LIMIT = 500

/**
 * The formula's own `<svg>…</svg>` out of whatever `tex2svg` returned.
 * MathJax wraps its output in an `<mjx-container>` (with an assistive
 * MathML copy beside it in the browser): an HTML element, which is
 * nothing at all inside an SVG tree — inlined as it comes, the
 * formula renders 0×0.
 */
function mathjaxSvg(out: { outerHTML?: string } | string): string {
  const markup = typeof out === 'string' ? out : (out.outerHTML ?? '')
  const start = markup.indexOf('<svg')
  const end = markup.lastIndexOf('</svg>')
  return start === -1 || end === -1 ? markup : markup.slice(start, end + '</svg>'.length)
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
 *
 * The adapter takes `tex2svg`'s output as it comes — the
 * `<mjx-container>` element of the browser bundle, or serialized
 * markup from `mathjax-full` — keeps the formula's own `<svg>`, lets
 * it fill the box jikz places it in, and measures that box from the
 * `ex` size MathJax gave it. Configure MathJax with
 * `svg: { fontCache: 'none' }` (or `'local'`): the default global
 * cache draws glyphs through `<use>` references into a page-level
 * sprite, which a standalone SVG does not carry.
 */
export function mathjaxAdapter(mathjax: MathJaxLike): MathRenderer {
  const cache = new Map<string, string>()
  const convert = (tex: string, display: boolean): string => {
    const key = `${display ? 'D' : 'I'}:${tex}`
    let svg = cache.get(key)
    if (svg === undefined) {
      svg = mathjaxSvg(mathjax.tex2svg(tex, { display }))
      if (cache.size >= MATHJAX_CACHE_LIMIT) cache.clear()
      cache.set(key, svg)
    }
    return svg
  }
  /** The root tag's size in ex, or undefined when MathJax gave none. */
  const sizeOf = (svg: string): { width: number; height: number } | undefined => {
    const tag = /^<svg\b[^>]*>/.exec(svg)?.[0] ?? ''
    const w = /\swidth="([\d.]+)ex"/.exec(tag)
    const h = /\sheight="([\d.]+)ex"/.exec(tag)
    return w && h ? { width: Number(w[1]), height: Number(h[1]) } : undefined
  }
  return {
    output: 'svg',
    renderToString: (tex, options) =>
      // Let the formula fill the box jikz sized from `measure`; its
      // own viewBox keeps the aspect, so nothing distorts.
      convert(tex, options?.displayMode ?? false).replace(/^<svg\b[^>]*>/, (tag) =>
        tag.replace(/\swidth="[^"]*"/, ' width="100%"').replace(/\sheight="[^"]*"/, ' height="100%"')
      ),
    measure: (tex, options) => {
      const ex = sizeOf(convert(tex, options?.displayMode ?? false))
      if (!ex) return undefined
      // One factor for both axes, so the aspect ratio survives.
      const px = (options?.fontSize ?? 14) * MATHJAX_EX_TO_EM
      return { width: ex.width * px, height: ex.height * px }
    },
  }
}

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
 * 2. the module default from {@link setDefaultMathRenderer}.
 *
 * A global `katex` is never read (it was, with a deprecation warning,
 * before 1.0): inject the renderer you want.
 */
export function resolveMathRenderer(injected?: MathRenderer): MathRenderer | undefined {
  return injected ?? defaultMathRenderer
}
