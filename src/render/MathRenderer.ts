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
 * Anything that can turn a TeX string into an HTML fragment.
 */
export interface MathRenderer {
  renderToString(tex: string, options?: MathRendererOptions): string
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

/**
 * Resolve the effective math renderer: the injected one wins; otherwise
 * fall back to an ambient global `katex` (deprecated — warn once).
 */
export function resolveMathRenderer(injected?: MathRenderer): MathRenderer | undefined {
  if (injected) return injected

  const globalKaTeX = (globalThis as { katex?: KaTeXLike }).katex
  if (globalKaTeX) {
    if (!warnedAboutGlobal) {
      warnedAboutGlobal = true
      console.warn(
        'jikz: reading KaTeX from the global scope is deprecated and will be ' +
        'removed in a future release. Inject it explicitly instead: ' +
        "new SVGRenderer(undefined, undefined, { mathRenderer: katexAdapter(katex) })"
      )
    }
    return katexAdapter(globalKaTeX)
  }

  return undefined
}
