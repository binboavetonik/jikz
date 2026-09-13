import { describe, it, expect } from 'vitest'
import { patternDots, patternCrosshatch, patternGrid } from '../../src/render/presets'
import { fillPatterns } from '../../src/render/patterns'
import {
  DEFAULT_STYLE,
  STYLE_PRESETS,
  mergeStyles,
  applyPreset,
  applyPresets,
  parseStyleString,
  styleToSVGAttributes,
  styleToCSSString,
  isTransparent,
  lightenColor,
  darkenColor,
  rgbToHex,
  hexToRgb,
} from '../../src/render/StyleMapper'

describe('StyleMapper', () => {
  describe('DEFAULT_STYLE', () => {
    it('has expected default values', () => {
      expect(DEFAULT_STYLE.stroke).toBe('#000000')
      expect(DEFAULT_STYLE.strokeWidth).toBe(1)
      expect(DEFAULT_STYLE.fill).toBe('none')
      expect(DEFAULT_STYLE.opacity).toBe(1)
    })
  })

  describe('STYLE_PRESETS', () => {
    it('has line width presets', () => {
      expect(STYLE_PRESETS.thin.strokeWidth).toBe(0.4)
      expect(STYLE_PRESETS.thick.strokeWidth).toBe(0.8)
      expect(STYLE_PRESETS['very thick'].strokeWidth).toBe(1.2)
    })

    it('has dash pattern presets', () => {
      expect(STYLE_PRESETS.dashed.strokeDasharray).toBe('3 3')
      expect(STYLE_PRESETS.dotted.strokeDasharray).toBe('1 2')
      expect(STYLE_PRESETS.solid.strokeDasharray).toBe('')
    })

    it('has color presets', () => {
      expect(STYLE_PRESETS.red.stroke).toBe('#e74c3c')
      expect(STYLE_PRESETS.blue.stroke).toBe('#3498db')
      expect(STYLE_PRESETS.green.stroke).toBe('#2ecc71')
    })

    it('pattern presets are values, not preset strings', () => {
      expect(patternDots.fillPattern).toBe(fillPatterns.dots)
      expect(patternCrosshatch.fillPattern).toBe(fillPatterns.crosshatch)
      expect(patternGrid.fillPattern).toBe(fillPatterns.grid)
      expect(STYLE_PRESETS).not.toHaveProperty('pattern dots')
    })

    it('has shadow presets', () => {
      expect(STYLE_PRESETS['shadow'].dropShadow).toBeDefined()
      expect(STYLE_PRESETS['shadow-sm'].dropShadow).toBeDefined()
      expect(STYLE_PRESETS['shadow-lg'].dropShadow).toBeDefined()

      const shadow = STYLE_PRESETS['shadow'].dropShadow as any
      expect(shadow.offsetX).toBe(2)
      expect(shadow.offsetY).toBe(2)
      expect(shadow.blur).toBe(3)
    })

    it('has rounded corner presets', () => {
      expect(STYLE_PRESETS['rounded'].borderRadius).toBe(4)
      expect(STYLE_PRESETS['rounded-sm'].borderRadius).toBe(2)
      expect(STYLE_PRESETS['rounded-lg'].borderRadius).toBe(8)
      expect(STYLE_PRESETS['rounded-xl'].borderRadius).toBe(12)
      expect(STYLE_PRESETS['rounded-full'].borderRadius).toBe(9999)
    })

    it('has double line preset', () => {
      const preset = STYLE_PRESETS['double'].doubleLine as any
      expect(preset.spacing).toBe(3)
      expect(preset.innerColor).toBe('white')
    })
  })

  describe('mergeStyles', () => {
    it('returns default style when no arguments', () => {
      const result = mergeStyles()
      expect(result.stroke).toBe(DEFAULT_STYLE.stroke)
    })

    it('merges single style', () => {
      const result = mergeStyles({ stroke: 'red' })
      expect(result.stroke).toBe('red')
      expect(result.strokeWidth).toBe(DEFAULT_STYLE.strokeWidth)
    })

    it('merges multiple styles in order', () => {
      const result = mergeStyles(
        { stroke: 'red', strokeWidth: 2 },
        { stroke: 'blue' }
      )
      expect(result.stroke).toBe('blue')
      expect(result.strokeWidth).toBe(2)
    })

    it('preserves fillPattern when merging', () => {
      const result = mergeStyles(
        { fillPattern: 'dots' as const },
        { stroke: 'blue' }
      )
      expect(result.fillPattern).toBe('dots')
      expect(result.stroke).toBe('blue')
    })

    it('handles undefined styles', () => {
      const result = mergeStyles(undefined, { stroke: 'red' }, undefined)
      expect(result.stroke).toBe('red')
    })
  })

  describe('applyPreset', () => {
    it('returns preset style', () => {
      const result = applyPreset('thick')
      expect(result.strokeWidth).toBe(0.8)
    })

    it('returns empty object for unknown preset', () => {
      const result = applyPreset('unknown' as any)
      expect(result).toEqual({})
    })
  })

  describe('applyPresets', () => {
    it('combines multiple presets', () => {
      const result = applyPresets('thick', 'dashed', 'red')
      expect(result.strokeWidth).toBe(0.8)
      expect(result.strokeDasharray).toBe('3 3')
      expect(result.stroke).toBe('#e74c3c')
    })
  })

  describe('parseStyleString', () => {
    it('parses comma-separated presets', () => {
      const result = parseStyleString('thick, dashed, red')
      expect(result.strokeWidth).toBe(0.8)
      expect(result.strokeDasharray).toBe('3 3')
      expect(result.stroke).toBe('#e74c3c')
    })

    it('is case insensitive', () => {
      const result = parseStyleString('THICK, DASHED')
      expect(result.strokeWidth).toBe(0.8)
      expect(result.strokeDasharray).toBe('3 3')
    })

    it('handles unknown presets gracefully', () => {
      const result = parseStyleString('thick, unknown, dashed')
      expect(result.strokeWidth).toBe(0.8)
      expect(result.strokeDasharray).toBe('3 3')
    })

    it('parses shadow presets', () => {
      const result = parseStyleString('shadow')
      expect(result.dropShadow).toBeDefined()
    })

    it('parses rounded presets', () => {
      const result = parseStyleString('rounded-lg')
      expect(result.borderRadius).toBe(8)
    })

    it('combines shadow with other presets', () => {
      const result = parseStyleString('fill blue, shadow, rounded')
      expect(result.fill).toBe('#3498db')
      expect(result.dropShadow).toBeDefined()
      expect(result.borderRadius).toBe(4)
    })
  })

  describe('styleToSVGAttributes', () => {
    it('converts stroke properties', () => {
      const attrs = styleToSVGAttributes({
        stroke: 'red',
        strokeWidth: 2,
        strokeOpacity: 0.5,
      })
      expect(attrs.stroke).toBe('red')
      expect(attrs['stroke-width']).toBe(2)
      expect(attrs['stroke-opacity']).toBe(0.5)
    })

    it('converts fill properties', () => {
      const attrs = styleToSVGAttributes({
        fill: 'blue',
        fillOpacity: 0.8,
      })
      expect(attrs.fill).toBe('blue')
      expect(attrs['fill-opacity']).toBe(0.8)
    })

    it('converts dash array from array', () => {
      const attrs = styleToSVGAttributes({
        strokeDasharray: [5, 3, 2],
      })
      expect(attrs['stroke-dasharray']).toBe('5 3 2')
    })

    it('converts dash array from string', () => {
      const attrs = styleToSVGAttributes({
        strokeDasharray: '5 3 2',
      })
      expect(attrs['stroke-dasharray']).toBe('5 3 2')
    })

    it('converts line cap and join', () => {
      const attrs = styleToSVGAttributes({
        strokeLinecap: 'round',
        strokeLinejoin: 'bevel',
      })
      expect(attrs['stroke-linecap']).toBe('round')
      expect(attrs['stroke-linejoin']).toBe('bevel')
    })
  })

  describe('styleToCSSString', () => {
    it('generates CSS string', () => {
      const css = styleToCSSString({
        stroke: 'red',
        strokeWidth: 2,
        fill: 'none',
      })
      expect(css).toContain('stroke: red')
      expect(css).toContain('stroke-width: 2')
      expect(css).toContain('fill: none')
    })

    it('handles dash array', () => {
      const css = styleToCSSString({
        strokeDasharray: [5, 3],
      })
      expect(css).toContain('stroke-dasharray: 5 3')
    })
  })

  describe('isTransparent', () => {
    it('returns true for none', () => {
      expect(isTransparent('none')).toBe(true)
      expect(isTransparent('NONE')).toBe(true)
    })

    it('returns true for transparent', () => {
      expect(isTransparent('transparent')).toBe(true)
    })

    it('returns false for colors', () => {
      expect(isTransparent('red')).toBe(false)
      expect(isTransparent('#ff0000')).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isTransparent(undefined)).toBe(false)
    })
  })

  describe('color utilities', () => {
    describe('lightenColor', () => {
      it('lightens a hex color', () => {
        const result = lightenColor('#000000', 0.5)
        expect(result).toBe('#7f7f7f')
      })

      it('handles colors with #', () => {
        const result = lightenColor('#ff0000', 0.5)
        expect(result).toBe('#ff7f7f')
      })

      it('handles colors without #', () => {
        const result = lightenColor('ff0000', 0.5)
        expect(result).toBe('#ff7f7f')
      })
    })

    describe('darkenColor', () => {
      it('darkens a hex color', () => {
        const result = darkenColor('#ffffff', 0.5)
        expect(result).toBe('#7f7f7f')
      })

      it('darkens red', () => {
        const result = darkenColor('#ff0000', 0.5)
        expect(result).toBe('#7f0000')
      })
    })

    describe('rgbToHex', () => {
      it('converts RGB to hex', () => {
        expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
        expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
        expect(rgbToHex(0, 0, 255)).toBe('#0000ff')
        expect(rgbToHex(128, 128, 128)).toBe('#808080')
      })
    })

    describe('hexToRgb', () => {
      it('converts hex to RGB', () => {
        expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
        expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 })
        expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 })
      })

      it('handles shorthand hex', () => {
        expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 })
        expect(hexToRgb('#0f0')).toEqual({ r: 0, g: 255, b: 0 })
      })

      it('handles hex without #', () => {
        expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 })
      })

      it('returns null for invalid hex', () => {
        expect(hexToRgb('invalid')).toBeNull()
        expect(hexToRgb('#gg0000')).toBeNull()
      })
    })
  })
})
