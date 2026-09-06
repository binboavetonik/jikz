import { describe, it, expect, vi } from 'vitest'
import {
  styleToSVGAttributes,
  mergeStyles,
  parseStyleString,
  applyPreset,
  DASH_PATTERN_NAMES,
  STYLE_PRESETS,
} from '../../src/render/StyleMapper'
import {
  thick,
  dashed,
  red,
  denselyDotted,
  ultraThick,
  PRESET_OBJECTS,
} from '../../src/render/presets'
import { SVGRenderer } from '../../src/render/SVGRenderer'
import { picture } from '../../src/picture/Picture'
import { line } from '../../src/geometry/Line'
import { point } from '../../src/core/Point'

describe('dash style field (TikZ names)', () => {
  it('resolves every DASH_PATTERN_NAMES entry to a stroke-dasharray', () => {
    for (const name of DASH_PATTERN_NAMES) {
      const attrs = styleToSVGAttributes({ dash: name })
      expect(attrs['stroke-dasharray']).toBe(
        (STYLE_PRESETS as Record<string, { strokeDasharray: string }>)[name]!.strokeDasharray
      )
    }
  })

  it("dash: 'dashed' produces '6 4'", () => {
    expect(styleToSVGAttributes({ dash: 'dashed' })['stroke-dasharray']).toBe('6 4')
  })

  it('explicit strokeDasharray overrides dash', () => {
    const attrs = styleToSVGAttributes({ dash: 'dashed', strokeDasharray: '1 1' })
    expect(attrs['stroke-dasharray']).toBe('1 1')
  })

  it('renders into actual SVG output (the demo bug)', () => {
    const r = new SVGRenderer()
    r.renderLine(line(point(0, 0), point(100, 0)), {
      style: { stroke: '#334155', dash: 'densely dashed' },
    })
    const svg = r.toSVG({ width: 100, height: 10 })
    expect(svg).toContain('stroke-dasharray="3 2"')
  })
})

describe('CSS-alias opacity keys', () => {
  it("'stroke-opacity' / 'fill-opacity' aliases are honored", () => {
    const attrs = styleToSVGAttributes({ 'stroke-opacity': 0.35, 'fill-opacity': 0.15 })
    expect(attrs['stroke-opacity']).toBe(0.35)
    expect(attrs['fill-opacity']).toBe(0.15)
  })

  it('camelCase wins over the alias when both are set', () => {
    const attrs = styleToSVGAttributes({ strokeOpacity: 0.5, 'stroke-opacity': 0.9 })
    expect(attrs['stroke-opacity']).toBe(0.5)
  })

  it('aliases survive mergeStyles (DEFAULT_STYLE must not shadow them)', () => {
    const merged = mergeStyles({ 'stroke-opacity': 0.35, 'fill-opacity': 0.15 })
    expect(merged.strokeOpacity).toBe(0.35)
    expect(merged.fillOpacity).toBe(0.15)
    expect('stroke-opacity' in merged).toBe(false)
  })

  it('aliases render through the picture pipeline', () => {
    const svg = picture()
      .draw(line(point(0, 0), point(10, 0)), { style: { stroke: '#000', 'stroke-opacity': 0.35 } })
      .toSVG({ width: 20, height: 10 })
    expect(svg).toContain('stroke-opacity="0.35"')
  })
})

describe('array form of style (TikZ option list)', () => {
  it('merges left-to-right, later wins', () => {
    const merged = mergeStyles([thick, ultraThick])
    expect(merged.strokeWidth).toBe(1.6)
  })

  it('mixes preset objects and inline overrides', () => {
    const merged = mergeStyles([thick, dashed, { stroke: '#2563eb' }])
    expect(merged.strokeWidth).toBe(0.8)
    expect(merged.strokeDasharray).toBe('6 4') // the dashed preset's value
    expect(merged.stroke).toBe('#2563eb')
  })

  it('plain objects still work unchanged', () => {
    const merged = mergeStyles({ stroke: '#000', strokeWidth: 2 })
    expect(merged.stroke).toBe('#000')
    expect(merged.strokeWidth).toBe(2)
  })

  it('picture draw verbs accept the array form', () => {
    const svg = picture()
      .draw(line(point(0, 5), point(100, 5)), { style: [thick, dashed, red] })
      .toSVG({ width: 100, height: 10 })
    expect(svg).toContain('stroke-width="0.8"')
    expect(svg).toContain('stroke-dasharray="6 4"')
    expect(svg).toContain('stroke="#e74c3c"')
  })

  it('caller style entries override path-mode baselines', () => {
    // 'draw' baseline is stroke #000000; an array entry must win
    const svg = picture()
      .draw(line(point(0, 5), point(100, 5)), { style: [red] })
      .toSVG({ width: 100, height: 10 })
    expect(svg).toContain('stroke="#e74c3c"')
    expect(svg).not.toContain('stroke="#000000"')
  })
})

describe('preset objects', () => {
  it('are frozen', () => {
    expect(Object.isFrozen(thick)).toBe(true)
    expect(Object.isFrozen(denselyDotted)).toBe(true)
  })

  it('carry the STYLE_PRESETS values', () => {
    expect(thick.strokeWidth).toBe(0.8)
    expect(dashed.strokeDasharray).toBe('6 4')
    expect(red.stroke).toBe('#e74c3c')
  })

  it('PRESET_OBJECTS covers the whole catalog', () => {
    expect(Object.keys(PRESET_OBJECTS).length).toBeGreaterThanOrEqual(50)
  })
})

describe('unknown preset warnings', () => {
  it('parseStyleString warns on unknown names instead of silence', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseStyleString('thick, dasheed, red')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('dasheed'))
    warn.mockRestore()
  })

  it('applyPreset warns and returns {} for unknown names', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // @ts-expect-error — intentionally passing an invalid preset
    expect(applyPreset('dasheed')).toEqual({})
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('known names do not warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    parseStyleString('thick, dashed, red')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
