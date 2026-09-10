import { describe, it, expect, afterEach } from 'vitest'
import {
  measureText,
  setTextMeasurementBackend,
  getTextMeasurementBackend,
  LINE_HEIGHT,
} from '../../src/text/measureText'
import { node } from '../../src/node/Node'

/**
 * The metrics backend is the default in every environment, so these
 * numbers are the same here, in a browser and in a worker — that is the
 * point of it. Expected values are derived from the Adobe core-14 AFM
 * widths (1/1000 em) the table ships, not copied from output.
 */
const HELVETICA: Record<string, number> = {
  H: 722, a: 556, d: 556, e: 556, i: 222, l: 222, n: 556, o: 556, r: 333,
  t: 278, y: 500,
}
const TIMES: Record<string, number> = { H: 722, e: 444, l: 278, o: 500 }

/** Expected advance width of `text` at `fontSize` from a width table. */
const expectWidth = (text: string, table: Record<string, number>, fontSize: number) =>
  [...text].reduce((sum, ch) => sum + table[ch]!, 0) * (fontSize / 1000)

afterEach(() => setTextMeasurementBackend('metrics'))

describe('measureText (metrics backend)', () => {
  it('sums per-character advance widths, not an average per character', () => {
    const m = measureText('Hello', { fontSize: 10 })
    expect(m.width).toBeCloseTo(expectWidth('Hello', HELVETICA, 10))
    expect(m.height).toBeCloseTo(10 * LINE_HEIGHT)
  })

  it('distinguishes narrow from wide glyphs', () => {
    // The old per-family average measured these identically; they differ
    // by 3.75× in the real font.
    const narrow = measureText('lll', { fontSize: 10 }).width
    const wide = measureText('mmm', { fontSize: 10 }).width
    expect(wide / narrow).toBeCloseTo((3 * 833) / (3 * 222), 6)
  })

  it('defaults to 14px sans-serif', () => {
    const m = measureText('Hello')
    expect(m.width).toBeCloseTo(expectWidth('Hello', HELVETICA, 14))
    expect(m.height).toBeCloseTo(14 * LINE_HEIGHT)
  })

  it('uses the serif table for serif stacks', () => {
    const serif = measureText('Hello', { fontFamily: 'Times New Roman, serif', fontSize: 10 })
    expect(serif.width).toBeCloseTo(expectWidth('Hello', TIMES, 10))
    // Times is narrower than Helvetica for this word.
    expect(serif.width).toBeLessThan(measureText('Hello', { fontSize: 10 }).width)
  })

  it('measures monospace at a fixed 600/1000 em per glyph', () => {
    const mono = measureText('iW', { fontFamily: 'monospace', fontSize: 10 })
    expect(mono.width).toBeCloseTo(2 * 600 * (10 / 1000))
    // Proportional faces do not treat i and W alike; monospace must.
    const a = measureText('ii', { fontFamily: 'monospace', fontSize: 10 }).width
    const b = measureText('WW', { fontFamily: 'monospace', fontSize: 10 }).width
    expect(a).toBeCloseTo(b)
  })

  it('widens bold text on proportional faces but not monospace', () => {
    const regular = measureText('Hello', { fontSize: 10 }).width
    const bold = measureText('Hello', { fontSize: 10, fontWeight: 'bold' }).width
    expect(bold / regular).toBeCloseTo(1.05, 6)
    expect(measureText('Hello', { fontSize: 10, fontWeight: '700' }).width).toBeCloseTo(bold)
    expect(measureText('Hello', { fontSize: 10, fontWeight: '400' }).width).toBeCloseTo(regular)

    const mono = { fontFamily: 'monospace', fontSize: 10 }
    expect(measureText('Hello', { ...mono, fontWeight: 'bold' }).width).toBeCloseTo(
      measureText('Hello', mono).width
    )
  })

  it('gives full-width forms a whole em', () => {
    expect(measureText('日本', { fontSize: 10 }).width).toBeCloseTo(2 * 10)
    // …and does not collapse them to the ASCII mean.
    expect(measureText('日本', { fontSize: 10 }).width).toBeGreaterThan(
      measureText('ab', { fontSize: 10 }).width
    )
  })

  it('falls back to the family mean for characters outside the table', () => {
    // Cyrillic has no entry; it must still produce a positive, finite width.
    const w = measureText('привет', { fontSize: 10 }).width
    expect(w).toBeGreaterThan(0)
    expect(Number.isFinite(w)).toBe(true)
  })

  it('measures multi-line text: widest line × line count', () => {
    const m = measureText('hi\nlonger line', { fontSize: 10 })
    expect(m.width).toBeCloseTo(measureText('longer line', { fontSize: 10 }).width)
    expect(m.height).toBeCloseTo(2 * 10 * LINE_HEIGHT)
  })

  it('empty string measures zero width', () => {
    const m = measureText('')
    expect(m.width).toBe(0)
  })

  it('scales linearly with font size', () => {
    const at10 = measureText('Hello', { fontSize: 10 }).width
    const at20 = measureText('Hello', { fontSize: 20 }).width
    expect(at20).toBeCloseTo(2 * at10)
  })
})

describe('measurement backend selection', () => {
  it('defaults to the deterministic metrics backend', () => {
    expect(getTextMeasurementBackend()).toBe('metrics')
  })

  it('is unaffected by a DOM being present', () => {
    // The regression this guards: the old implementation auto-selected
    // canvas whenever `document` existed, so an SSR render and a browser
    // render of the same picture disagreed and the diagram reflowed on
    // hydration. Presence of a document must change nothing now.
    const fromTable = expectWidth('Hydration', HELVETICA, 14)
    expect(measureText('Hydration', { fontSize: 14 }).width).toBeCloseTo(fromTable)

    const fakeDoc = { createElement: () => ({ getContext: () => ({ font: '', measureText: () => ({ width: 999 }) }) }) }
    const original = (globalThis as { document?: unknown }).document
    ;(globalThis as { document?: unknown }).document = fakeDoc
    try {
      // Still the table, not the 999 the "canvas" would have reported.
      expect(measureText('Hydration', { fontSize: 14 }).width).toBeCloseTo(fromTable)
      expect(getTextMeasurementBackend()).toBe('metrics')
    } finally {
      if (original === undefined) delete (globalThis as { document?: unknown }).document
      else (globalThis as { document?: unknown }).document = original
    }
  })

  it('honors a per-call backend override', () => {
    // No DOM in this environment, so canvas degrades to metrics rather
    // than throwing — the width still comes back sane.
    const viaOption = measureText('Hello', { fontSize: 10, backend: 'canvas' }).width
    expect(viaOption).toBeCloseTo(expectWidth('Hello', HELVETICA, 10))
  })

  it('setTextMeasurementBackend round-trips', () => {
    setTextMeasurementBackend('canvas')
    expect(getTextMeasurementBackend()).toBe('canvas')
    setTextMeasurementBackend('metrics')
    expect(getTextMeasurementBackend()).toBe('metrics')
  })
})

describe('Node text auto-sizing (Stage 6)', () => {
  it('auto-sizes from text when no width/height given', () => {
    const n = node({ text: 'Hello', shape: 'rectangle', innerSep: 4 })
    // measured 31.892 (Helvetica 'Hello' = 2278/1000 em at 14px) + 2×4
    expect(n.width).toBeCloseTo(expectWidth('Hello', HELVETICA, 14) + 8)
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
    const expected = Math.max(expectWidth('Hello', HELVETICA, 14) + 8, 14 * 1.25 + 8)
    expect(n.width).toBeCloseTo(expected)
  })
})
