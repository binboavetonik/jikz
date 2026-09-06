import { describe, it, expect } from 'vitest'
import {
  PATTERN_DEFINITIONS,
  generatePatternId,
  normalizePatternSpec,
  isPatternName,
  FillPatternName,
  FillPatternSpec,
} from '../../src/render/FillPattern'

describe('FillPattern', () => {
  describe('PATTERN_DEFINITIONS', () => {
    const patternNames: FillPatternName[] = [
      'horizontal lines',
      'vertical lines',
      'north east lines',
      'north west lines',
      'grid',
      'crosshatch',
      'dots',
      'crosshatch dots',
      'fivepointed stars',
      'sixpointed stars',
      'bricks',
      'checkerboard',
    ]

    it('has all 12 TikZ patterns defined', () => {
      expect(Object.keys(PATTERN_DEFINITIONS)).toHaveLength(12)
      for (const name of patternNames) {
        expect(PATTERN_DEFINITIONS[name]).toBeDefined()
      }
    })

    describe.each(patternNames)('%s pattern', (name) => {
      const def = PATTERN_DEFINITIONS[name]

      it('has valid width', () => {
        expect(def.width).toBeGreaterThan(0)
      })

      it('has valid height', () => {
        expect(def.height).toBeGreaterThan(0)
      })

      it('has defaultLineWidth defined', () => {
        expect(typeof def.defaultLineWidth).toBe('number')
        expect(def.defaultLineWidth).toBeGreaterThanOrEqual(0)
      })

      it('has createContent function', () => {
        expect(typeof def.createContent).toBe('function')
      })

      it('createContent produces valid SVG fragments', () => {
        const color = '#ff0000'
        const lw = 1
        const content = def.createContent(color, lw)

        expect(typeof content).toBe('string')
        expect(content.length).toBeGreaterThan(0)

        // Should contain valid SVG elements
        expect(content).toMatch(/<(line|circle|rect|polygon|path)\s/)
      })

      it('createContent uses the specified color', () => {
        const color = '#e74c3c'
        const content = def.createContent(color, def.defaultLineWidth)
        expect(content).toContain(color)
      })
    })

    describe('specific pattern content', () => {
      it('horizontal lines produces horizontal line', () => {
        const content = PATTERN_DEFINITIONS['horizontal lines'].createContent('#000', 1)
        expect(content).toContain('y1="5"')
        expect(content).toContain('y2="5"')
      })

      it('vertical lines produces vertical line', () => {
        const content = PATTERN_DEFINITIONS['vertical lines'].createContent('#000', 1)
        expect(content).toContain('x1="5"')
        expect(content).toContain('x2="5"')
      })

      it('dots produces circles', () => {
        const content = PATTERN_DEFINITIONS['dots'].createContent('#000', 0)
        expect(content).toContain('<circle')
        expect(content).toContain('fill="#000"')
      })

      it('checkerboard produces rectangles', () => {
        const content = PATTERN_DEFINITIONS['checkerboard'].createContent('#000', 0)
        expect(content).toContain('<rect')
        // Should have two rects for checkerboard
        expect((content.match(/<rect/g) || []).length).toBe(2)
      })

      it('bricks has horizontal and vertical lines', () => {
        const content = PATTERN_DEFINITIONS['bricks'].createContent('#000', 1)
        // Should have multiple lines for mortar
        const lineCount = (content.match(/<line/g) || []).length
        expect(lineCount).toBeGreaterThanOrEqual(5)
      })

      it('fivepointed stars produces polygon', () => {
        const content = PATTERN_DEFINITIONS['fivepointed stars'].createContent('#000', 0)
        expect(content).toContain('<polygon')
        expect(content).toContain('points="')
      })

      it('sixpointed stars produces two triangles', () => {
        const content = PATTERN_DEFINITIONS['sixpointed stars'].createContent('#000', 0)
        expect(content).toContain('<polygon')
        // Should have two polygons for star of david
        expect((content.match(/<polygon/g) || []).length).toBe(2)
      })

      it('crosshatch dots produces 4 circles', () => {
        const content = PATTERN_DEFINITIONS['crosshatch dots'].createContent('#000', 0)
        expect((content.match(/<circle/g) || []).length).toBe(4)
      })
    })
  })

  describe('isPatternName', () => {
    it('returns true for valid pattern names', () => {
      expect(isPatternName('horizontal lines')).toBe(true)
      expect(isPatternName('vertical lines')).toBe(true)
      expect(isPatternName('dots')).toBe(true)
      expect(isPatternName('crosshatch')).toBe(true)
      expect(isPatternName('bricks')).toBe(true)
      expect(isPatternName('checkerboard')).toBe(true)
    })

    it('returns false for invalid pattern names', () => {
      expect(isPatternName('invalid')).toBe(false)
      expect(isPatternName('horizontal')).toBe(false)
      expect(isPatternName('lines')).toBe(false)
      expect(isPatternName('')).toBe(false)
    })

    it('returns false for non-strings', () => {
      expect(isPatternName(123)).toBe(false)
      expect(isPatternName(null)).toBe(false)
      expect(isPatternName(undefined)).toBe(false)
      expect(isPatternName({})).toBe(false)
      expect(isPatternName([])).toBe(false)
    })
  })

  describe('normalizePatternSpec', () => {
    it('converts string name to spec object', () => {
      const result = normalizePatternSpec('dots')
      expect(result).toEqual({ name: 'dots' })
    })

    it('passes spec objects through unchanged', () => {
      const spec: FillPatternSpec = {
        name: 'crosshatch',
        color: '#ff0000',
        backgroundColor: '#ffffff',
        scale: 2,
        lineWidth: 1.5,
        rotation: 45,
      }
      const result = normalizePatternSpec(spec)
      expect(result).toBe(spec) // Same reference
    })

    it('handles minimal spec object', () => {
      const spec: FillPatternSpec = { name: 'grid' }
      const result = normalizePatternSpec(spec)
      expect(result).toEqual({ name: 'grid' })
    })
  })

  describe('generatePatternId', () => {
    it('produces deterministic IDs', () => {
      const spec: FillPatternSpec = { name: 'dots' }
      const id1 = generatePatternId(spec)
      const id2 = generatePatternId(spec)
      expect(id1).toBe(id2)
    })

    it('creates different IDs for different specs', () => {
      const id1 = generatePatternId({ name: 'dots' })
      const id2 = generatePatternId({ name: 'crosshatch' })
      expect(id1).not.toBe(id2)
    })

    it('includes name in ID', () => {
      const id = generatePatternId({ name: 'north east lines' })
      expect(id).toContain('north-east-lines')
    })

    it('includes color in ID when specified', () => {
      const id1 = generatePatternId({ name: 'dots' })
      const id2 = generatePatternId({ name: 'dots', color: '#ff0000' })
      expect(id1).not.toBe(id2)
      expect(id2).toContain('ff0000')
    })

    it('includes backgroundColor in ID when specified', () => {
      const id1 = generatePatternId({ name: 'dots' })
      const id2 = generatePatternId({ name: 'dots', backgroundColor: '#ffffff' })
      expect(id1).not.toBe(id2)
      expect(id2).toContain('bg')
    })

    it('includes scale in ID when not 1', () => {
      const id1 = generatePatternId({ name: 'dots' })
      const id2 = generatePatternId({ name: 'dots', scale: 2 })
      const id3 = generatePatternId({ name: 'dots', scale: 1 })
      expect(id2).toContain('s2')
      // Scale of 1 should not change ID
      expect(id1).toBe(id3)
    })

    it('includes lineWidth in ID when specified', () => {
      const id1 = generatePatternId({ name: 'grid' })
      const id2 = generatePatternId({ name: 'grid', lineWidth: 2 })
      expect(id1).not.toBe(id2)
      expect(id2).toContain('lw2')
    })

    it('includes rotation in ID when not 0', () => {
      const id1 = generatePatternId({ name: 'dots' })
      const id2 = generatePatternId({ name: 'dots', rotation: 45 })
      const id3 = generatePatternId({ name: 'dots', rotation: 0 })
      expect(id2).toContain('r45')
      // Rotation of 0 should not change ID
      expect(id1).toBe(id3)
    })

    it('creates unique IDs for complex specs', () => {
      const spec1: FillPatternSpec = {
        name: 'crosshatch',
        color: '#e74c3c',
        backgroundColor: '#fff',
        scale: 1.5,
        lineWidth: 0.5,
        rotation: 30,
      }
      const spec2: FillPatternSpec = {
        name: 'crosshatch',
        color: '#3498db',
        backgroundColor: '#fff',
        scale: 1.5,
        lineWidth: 0.5,
        rotation: 30,
      }
      expect(generatePatternId(spec1)).not.toBe(generatePatternId(spec2))
    })

    it('produces valid CSS ID format', () => {
      const id = generatePatternId({
        name: 'north west lines',
        color: '#abc123',
        scale: 2.5,
      })
      // Should not contain spaces, should start with letter
      expect(id).toMatch(/^[a-z]/)
      expect(id).not.toContain(' ')
    })
  })
})
