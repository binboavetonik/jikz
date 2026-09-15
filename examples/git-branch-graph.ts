import { picture, circle, point, type Point } from 'jikz'

// The git-graph every branching-model blog post draws: main across
// the bottom, a feature branch that forks, gets two commits, and
// merges back. Commit dots are Anchorable circles — merge edges use
// out/in headings so the branch joins like railway tracks.

export default function render(container: HTMLElement) {
  const pic = picture()

  const C = (x: number, y: number) => point(x, y)
  const dot = (p: Point, merge = false) => {
    const c = circle(p, 7)
    pic.filldraw(c, {
      style: merge
        ? { stroke: '#7c3aed', fill: '#ede9fe', strokeWidth: 2 }
        : { stroke: '#2563eb', fill: '#dbeafe', strokeWidth: 2 },
    })
    return c // Anchorable — edges clip at its rim
  }

  // main line
  const m1 = dot(C(40, 150)), m2 = dot(C(120, 150)), m3 = dot(C(280, 150)), m4 = dot(C(360, 150))
  // feature branch
  const f1 = dot(C(180, 90)), f2 = dot(C(240, 90))

  const link = { style: { stroke: '#64748b', strokeWidth: 1.5 } }
  pic.edge(m1, m2, {}, link)
  pic.edge(m2, m3, {}, link)
  pic.edge(m3, m4, {}, link)
  pic.edge(m2, f1, { out: 315, in: 180 }, { style: { stroke: '#7c3aed', strokeWidth: 1.5 } })
  pic.edge(f1, f2, {}, { style: { stroke: '#7c3aed', strokeWidth: 1.5 } })
  pic.edge(f2, m3, { out: 0, in: 45 }, { style: { stroke: '#7c3aed', strokeWidth: 1.5 } })

  pic.text(C(40, 185), 'main', { fontSize: 11 })
  pic.text(C(210, 65), 'feature/login', { fontSize: 11, style: { stroke: '#7c3aed' } })
  pic.text(m4.center, 'HEAD', { at: 'south east', distance: 8, fontSize: 10, style: { stroke: '#64748b' } })

  pic.mount(container, { fit: true, padding: 12 })
}
