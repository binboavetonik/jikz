import { describe, it, expect } from 'vitest'
import { measureText } from '../../src/text/measureText'
import { node } from '../../src/node/Node'

/**
 * vitest runs in the node environment (no document), so measureText
 * exercises the font-metrics table here — deterministic by design.
 * The canvas backend is covered implicitly in the browser demo.
 */

describe('measureText (font-metrics backend)', () => {
  it('scales width with text length and font size', () => {
    const m = measureText('Hello', { fontSize: 10 })
    // 5 chars × 10px × 0.55 (sans-serif default)
    expect(m.width).toBeCloseTo(27.5)
    expect(m.height).toBeCloseTo(12.5)
  })

  it('defaults to 14px sans-serif', () => {
    const m = measureText('Hello')
    expect(m.width).toBeCloseTo(5 * 14 * 0.55)
    expect(m.height).toBeCloseTo(14 * 1.25)
  })

  it('uses wider glyphs for monospace', () => {
    const mono = measureText('code', { fontFamily: 'monospace', fontSize: 10 })
    const sans = measureText('code', { fontFamily: 'sans-serif', fontSize: 10 })
    expect(mono.width).toBeGreaterThan(sans.width)
    expect(mono.width).toBeCloseTo(4 * 10 * 0.6)
  })

  it('measures multi-line text: widest line × line count', () => {
    const m = measureText('hi\nlonger line', { fontSize: 10 })
    expect(m.width).toBeCloseTo(11 * 10 * 0.55)
    expect(m.height).toBeCloseTo(2 * 10 * 1.25)
  })

  it('empty string measures zero width', () => {
    const m = measureText('')
    expect(m.width).toBe(0)
  })
})

describe('Node text auto-sizing (Stage 6)', () => {
  it('auto-sizes from text when no width/height given', () => {
    const n = node({ text: 'Hello', shape: 'rectangle', innerSep: 4 })
    // measured 38.5 + 2×4 innerSep
    expect(n.width).toBeCloseTo(5 * 14 * 0.55 + 8)
    expect(n.height).toBeCloseTo(14 * 1.25 + 8)
  })

  it('respects minWidth/minHeight as floor', () => {
    const n = node({ text: 'A', shape: 'rectangle', minWidth: 40, minHeight: 30 })
    expect(n.width).toBe(40)
    expect(n.height).toBe(30)
  })

  it('explicit textWidth/textHeight override measurement', () => {
    const n = node({
      text: 'Hello',
      shape: 'rectangle',
      textWidth: 100,
      textHeight: 50,
      innerSep: 4,
    })
    expect(n.width).toBe(108)
    expect(n.height).toBe(58)
  })

  it('explicit width/height skip measurement entirely', () => {
    const n = node({ text: 'Hello', shape: 'rectangle', width: 120, height: 60 })
    expect(n.width).toBe(120)
    expect(n.height).toBe(60)
  })

  it('textless nodes keep the old minimum-size behavior', () => {
    const n = node({ shape: 'rectangle' })
    expect(n.width).toBe(20) // default minWidth
    expect(n.height).toBe(20)
  })

  it('circle nodes fit the measured text box', () => {
    const n = node({ text: 'Hello', shape: 'circle', innerSep: 4 })
    // circle radius = max(w, h) / 2 — diameter spans the text box
    const expected = Math.max(5 * 14 * 0.55 + 8, 14 * 1.25 + 8)
    expect(n.width).toBeCloseTo(expected)
  })
})
