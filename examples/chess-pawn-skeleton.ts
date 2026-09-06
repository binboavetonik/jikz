import { picture, point, circle, type Point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const SQ = 32
  const M = 30  // margin
  // file 0..7 = a..h, rank 1..8 — screen y flips the rank
  const sq = (file: number, rank: number) => point(M + file * SQ + SQ / 2, M + (8 - rank) * SQ + SQ / 2)

  // Board grid — one pen statement, 18 subpaths
  const grid = pic.pen({ style: { stroke: '#e2e8f0', strokeWidth: 0.75 } })
  for (let i = 0; i <= 8; i++) {
    grid.moveTo(M + i * SQ, M).lineTo(M + i * SQ, M + 8 * SQ)
    grid.moveTo(M, M + i * SQ).lineTo(M + 8 * SQ, M + i * SQ)
  }

  // Pawn chains UNDER the pawns — thick translucent pen runs
  pic.pen({ style: { stroke: '#7c3aed', strokeWidth: 5, 'stroke-opacity': 0.35 } })
    .moveTo(sq(1, 2)).lineTo(sq(2, 3)).lineTo(sq(3, 4)).lineTo(sq(4, 5)) // b2-c3-d4-e5
  pic.pen({ style: { stroke: '#dc2626', strokeWidth: 5, 'stroke-opacity': 0.35 } })
    .moveTo(sq(4, 6)).lineTo(sq(3, 5))                                    // e6-d5

  // French Advance pawns
  const pawn = (file: number, rank: number, white: boolean) =>
    pic.draw(circle(sq(file, rank), 9), {
      style: white
        ? { fill: '#f8fafc', stroke: '#0f172a', strokeWidth: 1.25 }
        : { fill: '#0f172a', stroke: '#94a3b8', strokeWidth: 1.25 },
    })
  const whitePawns: [file: number, rank: number][] = [[1, 2], [2, 3], [3, 4], [4, 5]]
  const blackPawns: [file: number, rank: number][] = [[0, 7], [2, 7], [3, 5], [4, 6], [5, 7], [6, 7], [7, 7]]
  for (const [f, r] of whitePawns) pawn(f, r, true)
  for (const [f, r] of blackPawns) pawn(f, r, false)

  // Levers (pawn breaks) — dashed arrows with edge labels
  const lever = (from: Point, to: Point, san: string) =>
    pic.edge(point(from.x + 13, from.y + 4), point(to.x + 13, to.y - 4),
      { arrowEnd: 'stealth', label: san, labelOffset: 9 },
      { style: { stroke: '#dc2626', dash: 'dashed', strokeWidth: 1.5 } })
  lever(sq(2, 7), sq(2, 5), '\u2026c5!')   // c7 -> c5 attacks the d4 link
  lever(sq(5, 7), sq(5, 6), '\u2026f6!')   // f7 -> f6 attacks the e5 head

  // Chain-base annotation (TikZ: attack the base of the chain)
  pic.text(sq(2, 3), 'chain base — attack it', { at: 'south west', distance: 8, fontSize: 10, style: { stroke: '#7c3aed' } })

  pic.mount(container, { fit: true, padding: 10 })
}
