import { describe, it, expect } from 'vitest'
import {
  generateShadowId,
  normalizeShadowSpec,
  isDropShadowSpec,
  parseColorForFilter,
  DEFAULT_SHADOW,
  DropShadowSpec,
} from '../../src/render/Shadow'

describe('Shadow', () => {
  describe('DEFAULT_SHADOW', () => {
    it('has expected default values', () => {
      expect(DEFAULT_SHADOW.offsetX).toBe(2)
      expect(DEFAULT_SHADOW.offsetY).toBe(2)
      expect(DEFAULT_SHADOW.blur).toBe(3)
      expect(DEFAULT_SHADOW.color).toBe('rgba(0,0,0,0.3)')
    })
  })

  describe('isDropShadowSpec', () => {
    it('returns true for valid shadow specs', () => {
      expect(isDropShadowSpec({})).toBe(true)
      expect(isDropShadowSpec({ offsetX: 2 })).toBe(true)
      expect(isDropShadowSpec({ offsetY: 2 })).toBe(true)
      expect(isDropShadowSpec({ blur: 3 })).toBe(true)
      expect(isDropShadowSpec({ color: '#000' })).toBe(true)
      expect(isDropShadowSpec({ offsetX: 2, offsetY: 2, blur: 3, color: '#000' })).toBe(true)
    })

    it('returns false for non-objects', () => {
      expect(isDropShadowSpec(null)).toBe(false)
      expect(isDropShadowSpec(undefined)).toBe(false)
      expect(isDropShadowSpec('shadow')).toBe(false)
      expect(isDropShadowSpec(123)).toBe(false)
    })
  })

  describe('normalizeShadowSpec', () => {
    it('returns default shadow for true', () => {
      const result = normalizeShadowSpec(true)
      expect(result).toEqual(DEFAULT_SHADOW)
    })

    it('returns empty object for false', () => {
      const result = normalizeShadowSpec(false)
      expect(result).toEqual({})
    })

    it('applies defaults to empty spec', () => {
      const result = normalizeShadowSpec({})
      expect(result.offsetX).toBe(DEFAULT_SHADOW.offsetX)
      expect(result.offsetY).toBe(DEFAULT_SHADOW.offsetY)
      expect(result.blur).toBe(DEFAULT_SHADOW.blur)
      expect(result.color).toBe(DEFAULT_SHADOW.color)
    })

    it('preserves specified values', () => {
      const spec: DropShadowSpec = {
        offsetX: 5,
        offsetY: 10,
        blur: 8,
        color: 'rgba(255,0,0,0.5)',
      }
      const result = normalizeShadowSpec(spec)
      expect(result.offsetX).toBe(5)
      expect(result.offsetY).toBe(10)
      expect(result.blur).toBe(8)
      expect(result.color).toBe('rgba(255,0,0,0.5)')
    })

    it('applies defaults for missing properties', () => {
      const spec: DropShadowSpec = { offsetX: 5 }
      const result = normalizeShadowSpec(spec)
      expect(result.offsetX).toBe(5)
      expect(result.offsetY).toBe(DEFAULT_SHADOW.offsetY)
      expect(result.blur).toBe(DEFAULT_SHADOW.blur)
      expect(result.color).toBe(DEFAULT_SHADOW.color)
    })
  })

  describe('generateShadowId', () => {
    it('produces deterministic IDs', () => {
      const spec: DropShadowSpec = { offsetX: 2, offsetY: 2, blur: 3 }
      const id1 = generateShadowId(spec)
      const id2 = generateShadowId(spec)
      expect(id1).toBe(id2)
    })

    it('creates different IDs for different specs', () => {
      const spec1: DropShadowSpec = { offsetX: 2 }
      const spec2: DropShadowSpec = { offsetX: 4 }
      expect(generateShadowId(spec1)).not.toBe(generateShadowId(spec2))
    })

    it('starts with jikz-shadow prefix', () => {
      const id = generateShadowId({})
      expect(id.startsWith('jikz-shadow')).toBe(true)
    })

    it('uses defaults when properties not specified', () => {
      const id1 = generateShadowId({})
      const id2 = generateShadowId({
        offsetX: DEFAULT_SHADOW.offsetX,
        offsetY: DEFAULT_SHADOW.offsetY,
        blur: DEFAULT_SHADOW.blur,
        color: DEFAULT_SHADOW.color,
      })
      expect(id1).toBe(id2)
    })
  })

  describe('parseColorForFilter', () => {
    it('parses rgba colors', () => {
      const result = parseColorForFilter('rgba(255, 0, 0, 0.5)')
      expect(result.floodColor).toBe('rgb(255,0,0)')
      expect(result.floodOpacity).toBe(0.5)
    })

    it('parses rgba with no spaces', () => {
      const result = parseColorForFilter('rgba(100,150,200,0.8)')
      expect(result.floodColor).toBe('rgb(100,150,200)')
      expect(result.floodOpacity).toBe(0.8)
    })

    it('parses rgb colors', () => {
      const result = parseColorForFilter('rgb(255, 128, 64)')
      expect(result.floodColor).toBe('rgb(255,128,64)')
      expect(result.floodOpacity).toBe(1)
    })

    it('handles hex colors', () => {
      const result = parseColorForFilter('#ff0000')
      expect(result.floodColor).toBe('#ff0000')
      expect(result.floodOpacity).toBe(1)
    })

    it('handles named colors', () => {
      const result = parseColorForFilter('black')
      expect(result.floodColor).toBe('black')
      expect(result.floodOpacity).toBe(1)
    })

    it('handles zero opacity', () => {
      const result = parseColorForFilter('rgba(0, 0, 0, 0)')
      expect(result.floodOpacity).toBe(0)
    })

    it('handles full opacity', () => {
      const result = parseColorForFilter('rgba(0, 0, 0, 1)')
      expect(result.floodOpacity).toBe(1)
    })
  })
})
