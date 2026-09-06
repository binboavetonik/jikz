import { describe, it, expect, beforeEach } from 'vitest'
import { SVGRenderer, createSVGRenderer, DEFAULT_LAYERS } from '../../src/render'
import { createSVGBuilder } from '../../src/render/SVGBuilder'

/**
 * Stage 4 migration note: this suite used to rely on a ~100-line mock of
 * the SVG.js container interface. After dropping SVG.js, SVGRenderer
 * renders through the structured SVGBuilder directly — so we pass a real
 * builder here. Layer-presence checks now inspect `builder.node.attrs`
 * instead of a mock's `.attrs`.
 */

describe('Layer Management', () => {
  let renderer: SVGRenderer

  beforeEach(() => {
    renderer = createSVGRenderer(createSVGBuilder())
  })

  describe('DEFAULT_LAYERS', () => {
    it('contains background, main, and foreground', () => {
      expect(DEFAULT_LAYERS).toEqual(['background', 'main', 'foreground'])
    })

    it('has 3 layers', () => {
      expect(DEFAULT_LAYERS).toHaveLength(3)
    })
  })

  describe('defineLayers', () => {
    it('creates layer groups in order', () => {
      renderer.defineLayers(['a', 'b', 'c'])
      expect(renderer.getLayers()).toEqual(['a', 'b', 'c'])
    })

    it('sets current layer to default', () => {
      renderer.defineLayers(['bg', 'main', 'fg'], 'main')
      expect(renderer.getCurrentLayer()).toBe('main')
    })

    it('uses first layer if default not found', () => {
      renderer.defineLayers(['bg', 'mid', 'fg'], 'nonexistent')
      expect(renderer.getCurrentLayer()).toBe('bg')
    })

    it('uses first layer if no default specified and main not present', () => {
      renderer.defineLayers(['bottom', 'top'])
      expect(renderer.getCurrentLayer()).toBe('bottom')
    })

    it('uses main as default if present', () => {
      renderer.defineLayers(['background', 'main', 'foreground'])
      expect(renderer.getCurrentLayer()).toBe('main')
    })

    it('clears previous layers when called again', () => {
      renderer.defineLayers(['a', 'b'])
      renderer.defineLayers(['x', 'y', 'z'])
      expect(renderer.getLayers()).toEqual(['x', 'y', 'z'])
    })

    it('creates groups with data-layer attribute', () => {
      renderer.defineLayers(['bg', 'main'])
      const bgLayer = renderer.getLayer('bg')
      expect(bgLayer).toBeDefined()
      // Layer groups are real SVGBuilder instances now; inspect the
      // underlying node attrs rather than a mock's attrs bag.
      expect((bgLayer as { node: { attrs: Record<string, unknown> } }).node.attrs['data-layer']).toBe('bg')
    })
  })

  describe('setLayer', () => {
    beforeEach(() => {
      renderer.defineLayers(['background', 'main', 'foreground'])
    })

    it('switches current layer', () => {
      renderer.setLayer('background')
      expect(renderer.getCurrentLayer()).toBe('background')
    })

    it('throws for unknown layer', () => {
      expect(() => renderer.setLayer('nonexistent')).toThrow('Unknown layer: nonexistent')
    })

    it('allows switching between any defined layers', () => {
      renderer.setLayer('foreground')
      expect(renderer.getCurrentLayer()).toBe('foreground')
      renderer.setLayer('background')
      expect(renderer.getCurrentLayer()).toBe('background')
      renderer.setLayer('main')
      expect(renderer.getCurrentLayer()).toBe('main')
    })
  })

  describe('getLayer', () => {
    beforeEach(() => {
      renderer.defineLayers(['a', 'b', 'c'])
    })

    it('returns layer container for valid name', () => {
      const layer = renderer.getLayer('a')
      expect(layer).toBeDefined()
    })

    it('returns undefined for invalid name', () => {
      const layer = renderer.getLayer('nonexistent')
      expect(layer).toBeUndefined()
    })
  })

  describe('resetLayer', () => {
    it('resets to default layer', () => {
      renderer.defineLayers(['bg', 'main', 'fg'], 'main')
      renderer.setLayer('fg')
      expect(renderer.getCurrentLayer()).toBe('fg')
      renderer.resetLayer()
      expect(renderer.getCurrentLayer()).toBe('main')
    })

    it('resets to first layer when no explicit default', () => {
      renderer.defineLayers(['bottom', 'top'])
      renderer.setLayer('top')
      renderer.resetLayer()
      expect(renderer.getCurrentLayer()).toBe('bottom')
    })
  })

  describe('onLayer', () => {
    beforeEach(() => {
      renderer.defineLayers(['background', 'main', 'foreground'])
    })

    it('temporarily switches layer', () => {
      expect(renderer.getCurrentLayer()).toBe('main')
      renderer.onLayer('background', () => {
        expect(renderer.getCurrentLayer()).toBe('background')
      })
      expect(renderer.getCurrentLayer()).toBe('main')
    })

    it('restores previous layer after callback', () => {
      renderer.setLayer('foreground')
      renderer.onLayer('background', () => {})
      expect(renderer.getCurrentLayer()).toBe('foreground')
    })

    it('returns callback result', () => {
      const result = renderer.onLayer('background', () => 42)
      expect(result).toBe(42)
    })

    it('restores layer even if callback throws', () => {
      renderer.setLayer('foreground')
      expect(() => {
        renderer.onLayer('background', () => {
          throw new Error('test error')
        })
      }).toThrow('test error')
      expect(renderer.getCurrentLayer()).toBe('foreground')
    })

    it('works with nested onLayer calls', () => {
      renderer.setLayer('main')
      renderer.onLayer('background', () => {
        expect(renderer.getCurrentLayer()).toBe('background')
        renderer.onLayer('foreground', () => {
          expect(renderer.getCurrentLayer()).toBe('foreground')
        })
        expect(renderer.getCurrentLayer()).toBe('background')
      })
      expect(renderer.getCurrentLayer()).toBe('main')
    })

    it('throws for unknown layer', () => {
      expect(() => renderer.onLayer('nonexistent', () => {})).toThrow('Unknown layer: nonexistent')
    })
  })

  describe('getCurrentLayer', () => {
    it('returns main when no layers defined', () => {
      expect(renderer.getCurrentLayer()).toBe('main')
    })

    it('returns current layer after setLayer', () => {
      renderer.defineLayers(['a', 'b', 'c'])
      renderer.setLayer('c')
      expect(renderer.getCurrentLayer()).toBe('c')
    })
  })

  describe('getLayers', () => {
    it('returns empty array when no layers defined', () => {
      expect(renderer.getLayers()).toEqual([])
    })

    it('returns copy of layer order', () => {
      renderer.defineLayers(['x', 'y', 'z'])
      const layers = renderer.getLayers()
      layers.push('modified')
      expect(renderer.getLayers()).toEqual(['x', 'y', 'z'])
    })
  })

  describe('integration with clear()', () => {
    it('clears layers on clear()', () => {
      renderer.defineLayers(['a', 'b', 'c'])
      renderer.clear()
      expect(renderer.getLayers()).toEqual([])
    })

    it('resets current layer to default on clear()', () => {
      renderer.defineLayers(['bg', 'main', 'fg'], 'main')
      renderer.setLayer('fg')
      renderer.clear()
      // After clear, layers are gone but currentLayer should be reset to default
      expect(renderer.getCurrentLayer()).toBe('main')
    })
  })

  describe('backwards compatibility', () => {
    it('works without defineLayers', () => {
      // When no layers defined, rendering should work normally
      expect(() => renderer.getCurrentLayer()).not.toThrow()
      expect(renderer.getLayers()).toEqual([])
    })
  })
})
