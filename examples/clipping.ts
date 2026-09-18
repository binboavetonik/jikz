import { allShapes, circle, picture, point, star, type GradientSpec } from 'jikz'

// Clipping: a gradient burst clipped to a star silhouette, next to the
// unclipped pair. The clip spec is plain data on the style — it
// compiles to a <clipPath> def in the SVG string, so it works in
// Node/SSR output exactly as in the browser.

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const burst: GradientSpec = {
    type: 'radial',
    stops: [
      { offset: 0, color: '#fbbf24' },
      { offset: 1, color: '#dc2626' },
    ],
  }

  // clipped: the gradient circle exists only inside the star
  pic.filldraw(circle(point(120, 110), 80), {
    style: {
      gradient: burst,
      clip: star(point(120, 110), 80, 34, 5),
    },
  })
  pic.draw(star(point(120, 110), 80, 34, 5), { style: { stroke: '#334155', strokeWidth: 1.5 } })
  pic.text(point(120, 215), 'clipped to the star', { style: { fontSize: 10 } })

  // unclipped reference: same gradient circle, star only stroked
  pic.filldraw(circle(point(330, 110), 80), { style: { gradient: burst } })
  pic.draw(star(point(330, 110), 80, 34, 5), { style: { stroke: '#334155', strokeWidth: 1.5 } })
  pic.text(point(330, 215), 'same circle, no clip', { style: { fontSize: 10 } })

  pic.mount(container, { width: 450, height: 235 })
}
