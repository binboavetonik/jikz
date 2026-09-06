import { describe, it, expect } from 'vitest'
import {
  generateGradientId,
  normalizeGradientSpec,
  isGradientSpec,
  isLinearGradient,
  isRadialGradient,
  angleToGradientCoords,
  createStopElements,
  DEFAULT_GRADIENT_STOPS,
  GradientSpec,
  LinearGradientSpec,
  RadialGradientSpec,
} from '../../src/render/Gradient'

describe('Gradient', () => {
  describe('DEFAULT_GRADIENT_STOPS', () => {
    it('has two stops', () => {
      expect(DEFAULT_GRADIENT_STOPS).toHaveLength(2)
    })

    it('goes from black to white', () => {
      expect(DEFAULT_GRADIENT_STOPS[0]).toEqual({ offset: 0, color: '#000000' })
      expect(DEFAULT_GRADIENT_STOPS[1]).toEqual({ offset: 1, color: '#ffffff' })
    })
  })

  describe('isGradientSpec', () => {
    it('returns true for linear gradient spec', () => {
      const spec: LinearGradientSpec = {
        type: 'linear',
        stops: [{ offset: 0, color: '#000' }],
      }
      expect(isGradientSpec(spec)).toBe(true)
    })

    it('returns true for radial gradient spec', () => {
      const spec: RadialGradientSpec = {
        type: 'radial',
        stops: [{ offset: 0, color: '#000' }],
      }
      expect(isGradientSpec(spec)).toBe(true)
    })

    it('returns false for non-objects', () => {
      expect(isGradientSpec(null)).toBe(false)
      expect(isGradientSpec(undefined)).toBe(false)
      expect(isGradientSpec('linear')).toBe(false)
      expect(isGradientSpec(123)).toBe(false)
    })

    it('returns false for objects without type or stops', () => {
      expect(isGradientSpec({})).toBe(false)
      expect(isGradientSpec({ type: 'linear' })).toBe(false)
      expect(isGradientSpec({ stops: [] })).toBe(false)
    })
  })

  describe('isLinearGradient', () => {
    it('returns true for linear gradients', () => {
      const spec: GradientSpec = { type: 'linear', stops: [] }
      expect(isLinearGradient(spec)).toBe(true)
    })

    it('returns false for radial gradients', () => {
      const spec: GradientSpec = { type: 'radial', stops: [] }
      expect(isLinearGradient(spec)).toBe(false)
    })
  })

  describe('isRadialGradient', () => {
    it('returns true for radial gradients', () => {
      const spec: GradientSpec = { type: 'radial', stops: [] }
      expect(isRadialGradient(spec)).toBe(true)
    })

    it('returns false for linear gradients', () => {
      const spec: GradientSpec = { type: 'linear', stops: [] }
      expect(isRadialGradient(spec)).toBe(false)
    })
  })

  describe('normalizeGradientSpec', () => {
    describe('linear gradients', () => {
      it('applies default angle', () => {
        const spec: LinearGradientSpec = {
          type: 'linear',
          stops: [{ offset: 0, color: '#000' }],
        }
        const result = normalizeGradientSpec(spec)
        expect(result.type).toBe('linear')
        expect((result as LinearGradientSpec).angle).toBe(90)
      })

      it('preserves specified angle', () => {
        const spec: LinearGradientSpec = {
          type: 'linear',
          angle: 45,
          stops: [{ offset: 0, color: '#000' }],
        }
        const result = normalizeGradientSpec(spec)
        expect((result as LinearGradientSpec).angle).toBe(45)
      })

      it('uses default stops when empty', () => {
        const spec: LinearGradientSpec = { type: 'linear', stops: [] }
        const result = normalizeGradientSpec(spec)
        expect(result.stops).toBe(DEFAULT_GRADIENT_STOPS)
      })
    })

    describe('radial gradients', () => {
      it('applies default center and radius', () => {
        const spec: RadialGradientSpec = {
          type: 'radial',
          stops: [{ offset: 0, color: '#000' }],
        }
        const result = normalizeGradientSpec(spec) as RadialGradientSpec
        expect(result.cx).toBe(0.5)
        expect(result.cy).toBe(0.5)
        expect(result.r).toBe(0.5)
      })

      it('preserves specified values', () => {
        const spec: RadialGradientSpec = {
          type: 'radial',
          cx: 0.3,
          cy: 0.7,
          r: 0.4,
          stops: [{ offset: 0, color: '#000' }],
        }
        const result = normalizeGradientSpec(spec) as RadialGradientSpec
        expect(result.cx).toBe(0.3)
        expect(result.cy).toBe(0.7)
        expect(result.r).toBe(0.4)
      })

      it('preserves focal point if specified', () => {
        const spec: RadialGradientSpec = {
          type: 'radial',
          fx: 0.2,
          fy: 0.3,
          stops: [{ offset: 0, color: '#000' }],
        }
        const result = normalizeGradientSpec(spec) as RadialGradientSpec
        expect(result.fx).toBe(0.2)
        expect(result.fy).toBe(0.3)
      })
    })
  })

  describe('angleToGradientCoords', () => {
    it('converts 0 degrees to horizontal right', () => {
      const coords = angleToGradientCoords(0)
      expect(coords.x1).toBe('0.00%')
      expect(coords.x2).toBe('100.00%')
      expect(coords.y1).toBe('50.00%')
      expect(coords.y2).toBe('50.00%')
    })

    it('converts 90 degrees to vertical up', () => {
      const coords = angleToGradientCoords(90)
      expect(coords.x1).toBe('50.00%')
      expect(coords.x2).toBe('50.00%')
      expect(coords.y1).toBe('100.00%')
      expect(coords.y2).toBe('0.00%')
    })

    it('converts 180 degrees to horizontal left', () => {
      const coords = angleToGradientCoords(180)
      expect(coords.x1).toBe('100.00%')
      expect(coords.x2).toBe('0.00%')
    })

    it('converts 270 degrees to vertical down', () => {
      const coords = angleToGradientCoords(270)
      expect(coords.y1).toBe('0.00%')
      expect(coords.y2).toBe('100.00%')
    })

    it('handles 45 degree diagonal', () => {
      const coords = angleToGradientCoords(45)
      // Should be diagonal from bottom-left to top-right
      expect(parseFloat(coords.x1)).toBeLessThan(50)
      expect(parseFloat(coords.x2)).toBeGreaterThan(50)
    })
  })

  describe('generateGradientId', () => {
    it('produces deterministic IDs', () => {
      const spec: LinearGradientSpec = {
        type: 'linear',
        angle: 45,
        stops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#0000ff' },
        ],
      }
      const id1 = generateGradientId(spec)
      const id2 = generateGradientId(spec)
      expect(id1).toBe(id2)
    })

    it('creates different IDs for different specs', () => {
      const spec1: LinearGradientSpec = {
        type: 'linear',
        angle: 0,
        stops: [{ offset: 0, color: '#000' }],
      }
      const spec2: LinearGradientSpec = {
        type: 'linear',
        angle: 90,
        stops: [{ offset: 0, color: '#000' }],
      }
      expect(generateGradientId(spec1)).not.toBe(generateGradientId(spec2))
    })

    it('includes type in ID', () => {
      const linear: LinearGradientSpec = { type: 'linear', stops: [] }
      const radial: RadialGradientSpec = { type: 'radial', stops: [] }
      expect(generateGradientId(linear)).toContain('linear')
      expect(generateGradientId(radial)).toContain('radial')
    })

    it('includes stop colors in ID', () => {
      const spec: LinearGradientSpec = {
        type: 'linear',
        stops: [{ offset: 0, color: '#e74c3c' }],
      }
      const id = generateGradientId(spec)
      expect(id).toContain('e74c3c')
    })
  })

  describe('createStopElements', () => {
    it('creates stop elements for each stop', () => {
      const stops = [
        { offset: 0, color: '#ff0000' },
        { offset: 1, color: '#0000ff' },
      ]
      const html = createStopElements(stops)
      expect(html).toContain('<stop')
      expect(html).toContain('offset="0.0%"')
      expect(html).toContain('offset="100.0%"')
      expect(html).toContain('stop-color="#ff0000"')
      expect(html).toContain('stop-color="#0000ff"')
    })

    it('includes opacity when specified', () => {
      const stops = [{ offset: 0.5, color: '#000', opacity: 0.5 }]
      const html = createStopElements(stops)
      expect(html).toContain('stop-opacity="0.5"')
    })

    it('omits opacity when not specified', () => {
      const stops = [{ offset: 0, color: '#000' }]
      const html = createStopElements(stops)
      expect(html).not.toContain('stop-opacity')
    })

    it('handles multiple stops', () => {
      const stops = [
        { offset: 0, color: '#f00' },
        { offset: 0.5, color: '#0f0' },
        { offset: 1, color: '#00f' },
      ]
      const html = createStopElements(stops)
      const count = (html.match(/<stop/g) || []).length
      expect(count).toBe(3)
    })
  })
})
