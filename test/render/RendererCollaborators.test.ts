/**
 * Tests for the renderer collaborators extracted from SVGRenderer:
 * DefsManager (idempotent defs), LayerStack (layer routing), and
 * MathRenderer injection (no ambient global needed).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { createSVGBuilder } from '../../src/render/SVGBuilder'
import { DefsManager } from '../../src/render/DefsManager'
import { LayerStack } from '../../src/render/LayerStack'
import { SVGRenderer } from '../../src/render/SVGRenderer'
import { katexAdapter, type MathRenderer } from '../../src/render/MathRenderer'

afterEach(() => {
  // Clean up any global katex a test installed
  delete (globalThis as { katex?: unknown }).katex
})

describe('DefsManager', () => {
  it('builds each def id exactly once and returns url() references', () => {
    const builder = createSVGBuilder()
    const defs = new DefsManager(builder)
    const build = vi.fn((d: ReturnType<typeof createSVGBuilder>) => {
      d.el('marker', { id: 'm1' })
    })

    expect(defs.ensure('m1', build)).toBe('url(#m1)')
    expect(defs.ensure('m1', build)).toBe('url(#m1)')
    expect(build).toHaveBeenCalledTimes(1)
    expect(defs.has('m1')).toBe(true)
  })

  it('clear() forgets built defs so they rebuild', () => {
    const builder = createSVGBuilder()
    const defs = new DefsManager(builder)
    const build = vi.fn()
    defs.ensure('x', build)
    defs.clear()
    expect(defs.has('x')).toBe(false)
    defs.ensure('x', build)
    expect(build).toHaveBeenCalledTimes(2)
  })
})

describe('LayerStack', () => {
  it('defines layers in paint order and routes the current layer', () => {
    const builder = createSVGBuilder()
    const layers = new LayerStack(builder)
    layers.define(['background', 'main', 'foreground'])

    expect(layers.names()).toEqual(['background', 'main', 'foreground'])
    expect(layers.currentLayerName).toBe('main')
    expect(layers.current()).toBe(layers.get('main'))

    layers.set('background')
    expect(layers.current()).toBe(layers.get('background'))
  })

  it('onLayer restores the previous layer', () => {
    const builder = createSVGBuilder()
    const layers = new LayerStack(builder)
    layers.define(['background', 'main'])

    layers.set('background')
    const seen = layers.onLayer('main', () => layers.currentLayerName)
    expect(seen).toBe('main')
    expect(layers.currentLayerName).toBe('background')
  })

  it('throws on unknown layer names', () => {
    const layers = new LayerStack(createSVGBuilder())
    layers.define(['main'])
    expect(() => layers.set('nope')).toThrow('Unknown layer: nope')
  })
})

describe('MathRenderer injection', () => {
  const fakeMath: MathRenderer = {
    renderToString: (tex) => `<span class="math">${tex}</span>`,
  }

  it('uses the injected math renderer for LaTeX node text', () => {
    const spy = vi.spyOn(fakeMath, 'renderToString')
    const renderer = new SVGRenderer(undefined, undefined, { mathRenderer: fakeMath })
    renderer.renderText('$x^2$', point(50, 50))
    const svg = renderer.toSVG({ width: 100, height: 100 })
    expect(spy).toHaveBeenCalledWith('x^2', expect.objectContaining({ displayMode: false }))
    expect(svg).toContain('<span class="math">x^2</span>')
    expect(svg).toContain('foreignObject')
    spy.mockRestore()
  })

  it('katexAdapter forwards renderToString calls', () => {
    const katexLike = { renderToString: vi.fn(() => '<b>y</b>') }
    const adapter = katexAdapter(katexLike)
    expect(adapter.renderToString('y', { displayMode: true })).toBe('<b>y</b>')
    expect(katexLike.renderToString).toHaveBeenCalledWith('y', { displayMode: true })
  })

  it('falls back to a global katex with a one-time deprecation warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ;(globalThis as { katex?: unknown }).katex = {
      renderToString: () => '<i>g</i>',
    }

    const renderer = new SVGRenderer()
    renderer.renderText('$g$', point(10, 10))
    const svg = renderer.toSVG({ width: 20, height: 20 })
    expect(svg).toContain('<i>g</i>')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('deprecated'))
    warn.mockRestore()
  })

  it('renders italic fallback text when no math renderer is available', () => {
    const renderer = new SVGRenderer()
    renderer.renderText('$x$', point(10, 10))
    const svg = renderer.toSVG({ width: 20, height: 20 })
    expect(svg).toContain('$x$')
    expect(svg).not.toContain('foreignObject')
  })

  it('sizes the foreignObject from mathRenderer.measure when available', () => {
    const measuring: MathRenderer = {
      renderToString: (tex) => `<span class="math">${tex}</span>`,
      measure: () => ({ width: 42.2, height: 17.1 }),
    }
    const renderer = new SVGRenderer(undefined, undefined, { mathRenderer: measuring })
    renderer.renderText('$x^2$', point(50, 50))
    const svg = renderer.toSVG({ width: 100, height: 100 })
    // box = ceil(measured) = 43×18, centered on the position
    expect(svg).toContain('width="43"')
    expect(svg).toContain('height="18"')
    expect(svg).toContain('x="28.5"')
    expect(svg).toContain('y="41"')
  })

  it('katexAdapter.measure returns undefined headless (no document)', () => {
    const adapter = katexAdapter({ renderToString: () => '<b>y</b>' })
    expect(adapter.measure?.('y')).toBeUndefined()
  })
})

describe('SVGRenderer with collaborators', () => {
  it('clear() resets defs and layers so rendering restarts cleanly', () => {
    const renderer = new SVGRenderer()
    renderer.defineLayers(['background', 'main'])
    renderer.setLayer('background')
    renderer.renderCircle(circle(point(50, 50), 20))
    renderer.clear()
    expect(renderer.getLayers()).toEqual([])
    const svg = renderer.toSVG({ width: 100, height: 100 })
    expect(svg).not.toContain('data-layer')
  })
})
