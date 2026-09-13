import { picture, point, lindenmayer, kochCurve, spy } from 'jikz'

// TikZ's spy library: \spy on (coord) in node [...] draws the region
// twice — once outlined where it lives, once magnified somewhere with
// room. Here it reveals that the Koch snowflake's edge is the whole
// curve again, which is the point of the construction.
//
// spy() replays the picture's own items into a clipped, scaled scope,
// so it must be called AFTER whatever it should magnify. Strokes scale
// with the lens, exactly as TikZ's canvas transform scales them.

export default function render(container: HTMLElement) {
  const pic = picture()

  const snowflake = lindenmayer(kochCurve, {
    order: 4,
    step: 2,
    angle: 60,
    at: point(30, 200),
  })

  pic.filldraw(snowflake, {
    style: { stroke: '#2563eb', strokeWidth: 0.7, fill: '#dbeafe' },
  })

  spy(pic, {
    on: point(63, 214), // a bump on the lower edge
    at: point(300, 150),
    magnification: 6,
    size: 120,
    connect: true,
    onStyle: { stroke: '#dc2626', strokeWidth: 1 },
    inStyle: { stroke: '#dc2626', strokeWidth: 1.4 },
    connectStyle: { stroke: '#dc2626', strokeWidth: 0.8, strokeDasharray: '3 2' },
  })

  pic.mount(container, { fit: true, padding: 12 })
}
