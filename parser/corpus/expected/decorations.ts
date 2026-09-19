import { allShapes, cm, decoratePath, markPath, mm, path, picture, point, pt, screen } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })

  // \draw[decorate, decoration=snake] (0,0) -- (3,0);
  pic.draw(screen(decoratePath(pic.frame.renderable(path().moveTo(point(0, 0)).lineTo(point(3, 0))), 'snake', { amplitude: pt(2.5), wavelength: pt(10) })))

  // \draw[decorate, decoration={zigzag, amplitude=1mm, segment length=3mm}] (0,1) -- (3,1);
  pic.draw(screen(decoratePath(pic.frame.renderable(path().moveTo(point(0, 1)).lineTo(point(3, 1))), 'zigzag', { amplitude: mm(1), wavelength: mm(3) })))

  // \draw[decorate, decoration={coil, aspect=0.3}] (0,2) -- (3,2);
  pic.draw(screen(decoratePath(pic.frame.renderable(path().moveTo(point(0, 2)).lineTo(point(3, 2))), 'coil', { amplitude: pt(2.5), wavelength: pt(10), aspect: 0.3 })))

  // \draw[decorate, decoration={bumps}] (0,3) -- (3,3);
  pic.draw(screen(decoratePath(pic.frame.renderable(path().moveTo(point(0, 3)).lineTo(point(3, 3))), 'bumps', { amplitude: pt(2.5), wavelength: pt(10) })))

  // \draw[decorate, decoration={saw}] (0,4) -- (3,4);
  pic.draw(screen(decoratePath(pic.frame.renderable(path().moveTo(point(0, 4)).lineTo(point(3, 4))), 'saw', { amplitude: pt(2.5), wavelength: pt(10) })))

  // \draw[decorate, decoration={random steps, segment length=2mm}] (0,5) -- (3,5);
  pic.draw(screen(decoratePath(pic.frame.renderable(path().moveTo(point(0, 5)).lineTo(point(3, 5))), 'random', { amplitude: pt(2.5), wavelength: mm(2), seed: 1 })))

  // \draw[decorate, decoration={brace, amplitude=5pt}] (0,6) -- (3,6) node[midway, above=6pt] {span};
  pic.draw(screen(decoratePath(pic.frame.renderable(path().moveTo(point(0, 6)).lineTo(point(3, 6))), 'brace', { amplitude: pt(5), side: 'right' })))

  // \draw[decorate, decoration={brace, amplitude=5pt}] (0,6) -- (3,6) node[midway, above=6pt] {span};
  pic.pen({ mode: 'path' }).moveTo(0, 6).lineTo(3, 6)
    .node('tikz-1', { text: 'span', anchor: 'south', style: [{ stroke: 'none', fill: 'none' }], pos: 0.5, dx: 0, dy: -7.97011208 })

  // \draw[decorate, decoration={brace, mirror}] (0,7) -- (3,7);
  pic.draw(screen(decoratePath(pic.frame.renderable(path().moveTo(point(0, 7)).lineTo(point(3, 7))), 'brace', { amplitude: pt(2.5), side: 'left' })))

  // \draw[thick, postaction={decorate, decoration={markings, mark=at position 0.5 with {\arrow{>}}}}] (4,0) -- (7,1);
  pic.pen({ style: ['thick'] }).moveTo(4, 0).lineTo(7, 1)

  // \draw[thick, postaction={decorate, decoration={markings, mark=at position 0.5 with {\arrow{>}}}}] (4,0) -- (7,1);
  pic.draw(screen(markPath(pic.frame.renderable(path().moveTo(point(4, 0)).lineTo(point(7, 1))), { mark: 'to', at: 0.5 })), { style: ['thick'] })

  // \draw[postaction={decorate, decoration={markings, mark=at position 0.3 with {\arrow{stealth}}, mark=at position 0.7 with {\arrow{latex}}}}] (4,2) .. controls (5,3) and (6,1) .. (7,2);
  pic.pen().moveTo(4, 2).curveTo(point(5, 3), point(6, 1), point(7, 2))

  // \draw[postaction={decorate, decoration={markings, mark=at position 0.3 with {\arrow{stealth}}, mark=at position 0.7 with {\arrow{latex}}}}] (4,2) .. controls (5,3) and (6,1) .. (7,2);
  pic.draw(screen(markPath(pic.frame.renderable(path().moveTo(point(4, 2)).curveTo(point(5, 3), point(6, 1), point(7, 2))), { mark: 'stealth', at: 0.3 }, { mark: 'latex', at: 0.7 })))

  // \draw[red, preaction={decorate, decoration={snake, amplitude=2pt}}] (4,4) -- (7,4) -- (7,5);
  pic.draw(screen(decoratePath(pic.frame.renderable(path().moveTo(point(4, 4)).lineTo(point(7, 4)).lineTo(point(7, 5))), 'snake', { amplitude: pt(2), wavelength: pt(10) })), { style: [{ stroke: '#ff0000' }] })

  // \draw[red, preaction={decorate, decoration={snake, amplitude=2pt}}] (4,4) -- (7,4) -- (7,5);
  pic.pen({ style: [{ stroke: '#ff0000' }] }).moveTo(4, 4).lineTo(7, 4).lineTo(7, 5)

  // \draw[decorate, decoration=snake] (4,6) -- (5,7) -| (7,6) -- cycle;
  pic.draw(screen(decoratePath(pic.frame.renderable(path().moveTo(point(4, 6)).lineTo(point(5, 7)).hvTo(point(7, 6)).close()), 'snake', { amplitude: pt(2.5), wavelength: pt(10) })))

  return pic
}
