import { picture, point } from 'jikz'
import { axes } from 'jikz/dataviz'

// TikZ's `school book axes`: both axes run through the origin with
// arrow tips, ticks are centred on the axis lines, the labels sit at
// the arrow ends, and the origin shows one 0. Two functions through
// frame.fn — TikZ's `function` data format — with the tangent at
// x = 1 as a reference dot and a third function, all in data space.

const f = (x: number) => Math.sin(x) * x
const df = (x: number) => Math.sin(x) + x * Math.cos(x)

export default function render(container: HTMLElement) {
  const pic = picture()

  const frame = axes(pic, {
    at: point(40, 180),
    width: 380,
    height: 220,
    axisSystem: 'schoolBook',
    x: { domain: [-6, 6], exact: true, label: 'x', ticks: 10, minorTicks: 1 },
    y: { domain: [-5, 5], exact: true, label: 'y', about: 'int' },
    clip: true,
  })

  frame.fn(f, { samples: 240, label: 'x·sin x', labelInData: 'end' })
  frame.fn(df, { samples: 240, label: "f'", style: { dash: 'dashed' }, labelInData: 'end' })
  const x0 = 1
  frame.fn((x) => f(x0) + df(x0) * (x - x0), { style: { strokeWidth: 1 }, label: 'tangent' })
  frame.referenceDot(x0, f(x0), { label: 'x = 1', labelAt: 'south' })

  pic.mount(container, { fit: true, padding: 12 })
}
