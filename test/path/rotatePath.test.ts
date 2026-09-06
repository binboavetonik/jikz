import { describe, it, expect } from 'vitest'
import { rotatePathData } from '../../src/path/rotatePath'

describe('rotatePathData', () => {
  it('rotates M/L/Z paths 90° clockwise about a center', () => {
    // Rect path around center (100,60): (90,50) → (110,50) under 90° cw.
    const d = rotatePathData('M 90 50 L 110 50 L 110 70 L 90 70 Z', 90, {
      x: 100,
      y: 60,
    })
    expect(d).toBe('M 110 50 L 110 70 L 90 70 L 90 50 Z')
  })

  it('is the identity for angle 0 (modulo formatting)', () => {
    const d = rotatePathData('M 90 50 L 110 50 Z', 0, { x: 100, y: 60 })
    expect(d).toBe('M 90 50 L 110 50 Z')
  })

  it('rotates arcs: endpoint moves, x-axis-rotation shifts, sweep kept', () => {
    // Circle outline: two half-arcs. Rotated 90° about its center
    // (60,60): (50,60) → (60,50).
    const d = rotatePathData(
      'M 50 60 A 10 10 0 1 0 70 60 A 10 10 0 1 0 50 60',
      90,
      { x: 60, y: 60 }
    )
    expect(d).toBe('M 60 50 A 10 10 90 1 0 60 70 A 10 10 90 1 0 60 50')
  })

  it('converts relative commands to absolute and H/V to L', () => {
    const d = rotatePathData('m 10 0 l 5 5 h 5 v 5 z', 0, { x: 0, y: 0 })
    expect(d).toBe('M 10 0 L 15 5 L 20 5 L 20 10 Z')
  })

  it('collapses float noise (cos 90° ≈ 6e-17) to clean numbers', () => {
    const d = rotatePathData('M 100 0', 90, { x: 0, y: 0 })
    expect(d).toBe('M 0 100')
  })

  it('rotates cubic curves point-wise', () => {
    // 180° about (50,50): every point (x,y) → (100−x, 100−y).
    const d = rotatePathData('M 0 0 C 10 0 20 10 30 10', 180, { x: 50, y: 50 })
    expect(d).toBe('M 100 100 C 90 100 80 90 70 90')
  })
})
