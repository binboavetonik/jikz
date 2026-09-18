/** JikzError codes and the warning handler. */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { JikzError, setWarningHandler, warn } from '../../src/core/errors'
import { AnchorError, parseAnchorSpec } from '../../src/core/Anchor'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { basicShapes } from '../../src/geometry/shapes/basic'
import { getArrowTip } from '../../src/render/ArrowTip'

afterEach(() => setWarningHandler())

describe('JikzError', () => {
  const codeOf = (fn: () => unknown) => {
    try {
      fn()
    } catch (e) {
      expect(e).toBeInstanceOf(JikzError)
      return (e as JikzError).code
    }
    throw new Error('did not throw')
  }

  it('AnchorError is a JikzError with code unknown-anchor', () => {
    expect(codeOf(() => parseAnchorSpec('nowhere'))).toBe('unknown-anchor')
    expect(() => parseAnchorSpec('nowhere')).toThrow(AnchorError)
  })

  it('names, shapes and pen misuse carry the coarse codes', () => {
    const pic = picture({ shapes: basicShapes }).node('A', { at: point(0, 0) })
    expect(codeOf(() => pic.node('A', {}))).toBe('duplicate-name')
    expect(codeOf(() => pic.resolve('B'))).toBe('unknown-name')
    expect(codeOf(() => pic.node('C', { shape: 'nope' as never }))).toBe('unknown-name')
    expect(codeOf(() => pic.pen().lineTo(1, 1).label('x', { pos: 0.5 }))).toBe('invalid-argument')
    expect(codeOf(() => pic.pen().close())).toBe('no-pen-position')
    expect(codeOf(() => pic.toSVG({}))).toBe('invalid-argument')
  })

  it('getArrowTip is a lookup, not a throw', () => {
    expect(getArrowTip('nope')).toBeUndefined()
  })
})

describe('warnings', () => {
  it('go to console.warn by default and to a handler when one is set', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    warn('hello', 42)
    expect(spy).toHaveBeenCalledWith('hello', 42)
    const handler = vi.fn()
    setWarningHandler(handler)
    warn('again')
    expect(handler).toHaveBeenCalledWith('again', undefined)
    expect(spy).toHaveBeenCalledTimes(1)
    setWarningHandler(null)
    warn('silenced')
    expect(handler).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
