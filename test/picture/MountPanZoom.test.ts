// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { picture } from '../../src/picture/Picture'
import { point } from '../../src/core/Point'
import { circle } from '../../src/geometry/Circle'
import { PANZOOM_VIEWPORT_CLASS } from '../../src/render/PanZoom'

function host() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

/** jsdom reports 0×0 rects — stub a real viewport. */
function stubRect(svg: Element, width = 800, height = 600) {
  svg.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width, height, right: width, bottom: height }) as DOMRect
}

/** jsdom has no PointerEvent constructor; a plain Event with assigned
 *  props exercises the handlers the same way. */
function pointer(type: string, props: { pointerId: number; clientX: number; clientY: number }) {
  const e = new Event(type, { bubbles: true })
  Object.assign(e, { pointerType: 'mouse', button: 0, ...props })
  return e
}

describe('Picture.mount({ panZoom })', () => {
  it('returns a controller and wraps the scene in a viewport group', () => {
    const pic = picture().draw(circle(point(50, 50), 40))
    const ctl = pic.mount(host(), { fit: true, panZoom: true })

    expect(ctl.svg).toBeInstanceOf(SVGElement)
    expect(ctl.svg.getAttribute('width')).toBe('100%')
    expect(ctl.svg.getAttribute('height')).toBe('100%')
    expect(ctl.svg.style.touchAction).toBe('none')
    const viewport = ctl.svg.querySelector(`g.${PANZOOM_VIEWPORT_CLASS}`)
    expect(viewport).not.toBeNull()
    expect(viewport!.querySelector('circle')).not.toBeNull()
    expect(ctl.transform).toEqual({ tx: 0, ty: 0, scale: 1 })
  })

  it('without panZoom, mount returns the bare element and no viewport group', () => {
    const pic = picture().draw(circle(point(50, 50), 40))
    const svg = pic.mount(host(), { fit: true })
    expect((svg as { transform?: unknown }).transform).toBeUndefined()
    expect(svg.querySelector(`g.${PANZOOM_VIEWPORT_CLASS}`)).toBeNull()
  })

  it('panZoom requires a viewBox', () => {
    const pic = picture().draw(circle(point(50, 50), 40))
    expect(() => pic.mount(host(), { panZoom: true })).toThrow(/fit: true/)
  })

  it('setTransform writes the viewport transform, clamps scale, and reports', () => {
    const seen: { tx: number; ty: number; scale: number }[] = []
    const pic = picture().draw(circle(point(50, 50), 40))
    const ctl = pic.mount(host(), {
      fit: true,
      panZoom: { maxScale: 2, onTransform: (t) => seen.push(t) },
    })

    ctl.setTransform({ tx: 10, ty: -5, scale: 99 })
    expect(ctl.transform).toEqual({ tx: 10, ty: -5, scale: 2 })
    const viewport = ctl.svg.querySelector(`g.${PANZOOM_VIEWPORT_CLASS}`)!
    expect(viewport.getAttribute('transform')).toBe('translate(10 -5) scale(2)')
    expect(seen).toEqual([{ tx: 10, ty: -5, scale: 2 }])
  })

  it('resetToFit returns to identity; dblclick triggers it', () => {
    const pic = picture().draw(circle(point(50, 50), 40))
    const ctl = pic.mount(host(), { fit: true, panZoom: true })
    ctl.setTransform({ tx: 40, scale: 2 })
    ctl.svg.dispatchEvent(new Event('dblclick', { bubbles: true }))
    expect(ctl.transform).toEqual({ tx: 0, ty: 0, scale: 1 })
  })

  it('wheel zooms and preventDefaults', () => {
    const pic = picture().draw(circle(point(50, 50), 40))
    const ctl = pic.mount(host(), { fit: true, panZoom: true })
    stubRect(ctl.svg)

    const e = new WheelEvent('wheel', { deltaY: -100, clientX: 400, clientY: 300, cancelable: true })
    ctl.svg.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(ctl.transform.scale).toBeCloseTo(1.1)
  })

  it('ignores wheel on 0×0 rects (detached panels)', () => {
    const pic = picture().draw(circle(point(50, 50), 40))
    const ctl = pic.mount(host(), { fit: true, panZoom: true })
    ctl.svg.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -100, clientX: 0, clientY: 0, cancelable: true })
    )
    expect(ctl.transform).toEqual({ tx: 0, ty: 0, scale: 1 })
  })

  it('drag pans past the threshold; wasDrag separates drags from clicks', () => {
    const pic = picture().draw(circle(point(50, 50), 40))
    const ctl = pic.mount(host(), { fit: true, panZoom: true })
    stubRect(ctl.svg)

    // Below threshold: no pan, not a drag.
    ctl.svg.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }))
    ctl.svg.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 101, clientY: 101 }))
    expect(ctl.transform).toEqual({ tx: 0, ty: 0, scale: 1 })
    expect(ctl.wasDrag()).toBe(false)

    // Past threshold: pans and flags the drag.
    ctl.svg.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 130, clientY: 110 }))
    expect(ctl.wasDrag()).toBe(true)
    expect(ctl.transform.tx).toBeGreaterThan(0)
    ctl.svg.dispatchEvent(pointer('pointerup', { pointerId: 1, clientX: 130, clientY: 110 }))

    // Next interaction starts clean.
    ctl.svg.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 }))
    expect(ctl.wasDrag()).toBe(false)
  })

  it('pinch zooms with two pointers', () => {
    const pic = picture().draw(circle(point(50, 50), 40))
    const ctl = pic.mount(host(), { fit: true, panZoom: true })
    stubRect(ctl.svg)

    ctl.svg.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 300, clientY: 300 }))
    ctl.svg.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 500, clientY: 300 }))
    expect(ctl.wasDrag()).toBe(true)
    ctl.svg.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 600, clientY: 300 }))
    expect(ctl.transform.scale).toBeCloseTo(1.5)
  })

  it('captures the pointer lazily, only once a drag exceeds the threshold', () => {
    // Capturing on pointerdown would retarget the compatibility click event
    // to the svg root, breaking click handlers on scene elements.
    const pic = picture().draw(circle(point(50, 50), 40))
    const ctl = pic.mount(host(), { fit: true, panZoom: true })
    stubRect(ctl.svg)
    const captureSpy = vi.fn()
    ctl.svg.setPointerCapture = captureSpy

    ctl.svg.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }))
    expect(captureSpy).not.toHaveBeenCalled()
    ctl.svg.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 101, clientY: 101 }))
    expect(captureSpy).not.toHaveBeenCalled()
    ctl.svg.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 130, clientY: 110 }))
    expect(captureSpy).toHaveBeenCalledOnce()
  })

  it('destroy() detaches every listener', () => {
    const pic = picture().draw(circle(point(50, 50), 40))
    const ctl = pic.mount(host(), { fit: true, panZoom: true })
    stubRect(ctl.svg)
    ctl.destroy()

    ctl.svg.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -100, clientX: 400, clientY: 300, cancelable: true })
    )
    ctl.svg.dispatchEvent(pointer('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 }))
    ctl.svg.dispatchEvent(pointer('pointermove', { pointerId: 1, clientX: 50, clientY: 0 }))
    expect(ctl.transform).toEqual({ tx: 0, ty: 0, scale: 1 })
  })
})
