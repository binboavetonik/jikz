import { describe, it, expect } from 'vitest'
import { point } from '../../src/core/Point'
import { path } from '../../src/path/Path'
import {
  snakePath,
  zigzagPath,
  coilPath,
  bumpsPath,
  sawPath,
  randomPath,
  braceDecorationPath,
  decoratePath,
  registerDecoration,
  hasDecoration,
  registeredDecorations,
} from '../../src/path/PathDecorations'

describe('PathDecorations', () => {
  // Create a simple horizontal line path for testing
  const simplePath = path().moveTo(point(0, 0)).lineTo(point(100, 0))

  describe('snakePath', () => {
    it('creates a sinusoidal wave along the path', () => {
      const result = snakePath(simplePath, { amplitude: 10, wavelength: 20 })
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('returns empty path for zero-length path', () => {
      const emptyPath = path().moveTo(point(0, 0))
      const result = snakePath(emptyPath)
      expect(result.length).toBe(0)
    })

    it('uses default options when none provided', () => {
      const result = snakePath(simplePath)
      expect(result).toBeDefined()
    })

    it('creates smooth curves', () => {
      const result = snakePath(simplePath, { amplitude: 5 })
      const svg = result.toSVGPath()
      // Should contain curve commands (C for cubic bezier)
      expect(svg).toContain('C')
    })
  })

  describe('zigzagPath', () => {
    it('creates a zigzag pattern along the path', () => {
      const result = zigzagPath(simplePath, { amplitude: 8, wavelength: 15 })
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('creates linear segments', () => {
      const result = zigzagPath(simplePath, { amplitude: 5 })
      const svg = result.toSVGPath()
      // Should contain line commands (L)
      expect(svg).toContain('L')
    })

    it('returns empty path for zero-length path', () => {
      const emptyPath = path().moveTo(point(0, 0))
      const result = zigzagPath(emptyPath)
      expect(result.length).toBe(0)
    })
  })

  describe('coilPath', () => {
    it('creates a coil/spring pattern along the path', () => {
      const result = coilPath(simplePath, { amplitude: 10, wavelength: 15 })
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('supports aspect ratio option', () => {
      const result = coilPath(simplePath, { amplitude: 10, aspect: 0.5 })
      expect(result).toBeDefined()
    })

    it('returns empty path for zero-length path', () => {
      const emptyPath = path().moveTo(point(0, 0))
      const result = coilPath(emptyPath)
      expect(result.length).toBe(0)
    })
  })

  describe('bumpsPath', () => {
    it('creates semicircular bumps along the path', () => {
      const result = bumpsPath(simplePath, { amplitude: 6, wavelength: 12 })
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('supports side option for left bumps', () => {
      const result = bumpsPath(simplePath, { side: 'left' })
      expect(result).toBeDefined()
    })

    it('supports side option for right bumps', () => {
      const result = bumpsPath(simplePath, { side: 'right' })
      expect(result).toBeDefined()
    })

    it('supports side option for both sides', () => {
      const result = bumpsPath(simplePath, { side: 'both' })
      expect(result).toBeDefined()
    })

    it('returns empty path for zero-length path', () => {
      const emptyPath = path().moveTo(point(0, 0))
      const result = bumpsPath(emptyPath)
      expect(result.length).toBe(0)
    })
  })

  describe('sawPath', () => {
    it('creates a sawtooth pattern along the path', () => {
      const result = sawPath(simplePath, { amplitude: 6, wavelength: 15 })
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('creates linear segments', () => {
      const result = sawPath(simplePath, { amplitude: 5 })
      const svg = result.toSVGPath()
      expect(svg).toContain('L')
    })

    it('returns empty path for zero-length path', () => {
      const emptyPath = path().moveTo(point(0, 0))
      const result = sawPath(emptyPath)
      expect(result.length).toBe(0)
    })
  })

  describe('randomPath', () => {
    it('creates a random wavy pattern along the path', () => {
      const result = randomPath(simplePath, { amplitude: 5 })
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('produces consistent results with same seed', () => {
      const result1 = randomPath(simplePath, { amplitude: 5, seed: 12345 })
      const result2 = randomPath(simplePath, { amplitude: 5, seed: 12345 })
      expect(result1.toSVGPath()).toBe(result2.toSVGPath())
    })

    it('produces different results with different seeds', () => {
      const result1 = randomPath(simplePath, { amplitude: 5, seed: 12345 })
      const result2 = randomPath(simplePath, { amplitude: 5, seed: 54321 })
      expect(result1.toSVGPath()).not.toBe(result2.toSVGPath())
    })

    it('returns empty path for zero-length path', () => {
      const emptyPath = path().moveTo(point(0, 0))
      const result = randomPath(emptyPath)
      expect(result.length).toBe(0)
    })
  })

  describe('braceDecorationPath', () => {
    it('creates a curly brace pattern along the path', () => {
      const result = braceDecorationPath(simplePath, { amplitude: 15 })
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('supports left side', () => {
      const result = braceDecorationPath(simplePath, { side: 'left' })
      expect(result).toBeDefined()
    })

    it('supports right side', () => {
      const result = braceDecorationPath(simplePath, { side: 'right' })
      expect(result).toBeDefined()
    })

    it('returns empty path for zero-length path', () => {
      const emptyPath = path().moveTo(point(0, 0))
      const result = braceDecorationPath(emptyPath)
      expect(result.length).toBe(0)
    })
  })

  describe('decoratePath', () => {
    it('applies snake decoration', () => {
      const result = decoratePath(simplePath, 'snake', { amplitude: 5 })
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('applies zigzag decoration', () => {
      const result = decoratePath(simplePath, 'zigzag', { amplitude: 5 })
      expect(result).toBeDefined()
    })

    it('applies coil decoration', () => {
      const result = decoratePath(simplePath, 'coil', { amplitude: 5 })
      expect(result).toBeDefined()
    })

    it('applies bumps decoration', () => {
      const result = decoratePath(simplePath, 'bumps', { amplitude: 5 })
      expect(result).toBeDefined()
    })

    it('applies saw decoration', () => {
      const result = decoratePath(simplePath, 'saw', { amplitude: 5 })
      expect(result).toBeDefined()
    })

    it('applies random decoration', () => {
      const result = decoratePath(simplePath, 'random', { amplitude: 5 })
      expect(result).toBeDefined()
    })

    it('applies brace decoration', () => {
      const result = decoratePath(simplePath, 'brace', { amplitude: 10 })
      expect(result).toBeDefined()
    })

    it('throws with known names for unknown types', () => {
      // Behavior changed in 0.4.0: unknown decorations used to silently
      // return the original path; the registry now throws, mirroring
      // Picture's unknown-node and createShape's unknown-shape errors.
      expect(() => decoratePath(simplePath, 'unknown')).toThrow(
        /Unknown decoration: "unknown" \(known: /
      )
    })

    it('supports user-registered decorations', () => {
      registerDecoration('identity-double', (p) => {
        const copy = p
        return copy
      })
      expect(hasDecoration('identity-double')).toBe(true)
      expect(registeredDecorations()).toContain('identity-double')
      expect(decoratePath(simplePath, 'identity-double')).toBe(simplePath)
    })
  })

  describe('decoration on curved paths', () => {
    // Create a curved path
    const curvedPath = path()
      .moveTo(point(0, 0))
      .curveTo(point(25, -50), point(75, 50), point(100, 0))

    it('snake works on curved paths', () => {
      const result = snakePath(curvedPath, { amplitude: 5 })
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('zigzag works on curved paths', () => {
      const result = zigzagPath(curvedPath, { amplitude: 5 })
      expect(result).toBeDefined()
    })

    it('coil works on curved paths', () => {
      const result = coilPath(curvedPath, { amplitude: 5 })
      expect(result).toBeDefined()
    })
  })

  describe('decoration on vertical paths', () => {
    const verticalPath = path().moveTo(point(50, 0)).lineTo(point(50, 100))

    it('snake works on vertical paths', () => {
      const result = snakePath(verticalPath, { amplitude: 5 })
      expect(result).toBeDefined()
    })

    it('zigzag works on vertical paths', () => {
      const result = zigzagPath(verticalPath, { amplitude: 5 })
      expect(result).toBeDefined()
    })
  })

  describe('decoration on diagonal paths', () => {
    const diagonalPath = path().moveTo(point(0, 0)).lineTo(point(100, 100))

    it('snake works on diagonal paths', () => {
      const result = snakePath(diagonalPath, { amplitude: 5 })
      expect(result).toBeDefined()
    })

    it('zigzag works on diagonal paths', () => {
      const result = zigzagPath(diagonalPath, { amplitude: 5 })
      expect(result).toBeDefined()
    })
  })
})
