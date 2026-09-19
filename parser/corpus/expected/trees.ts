import { allShapes, cm, picture, point } from 'jikz'

export function build() {
  const pic = picture({ shapes: allShapes, frame: 'math', unit: cm(1) })

  // \node[draw] (r) at (0,0) {root}
  pic.node('r', { at: point(0, 0), text: 'root', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // child 1 of r
  pic.node('r-1', { at: point(-1.5, -1.5), text: 'a', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // edge from parent r -- r-1
  pic.edge('r', 'r-1')

  // child 2 of r
  pic.node('b', { at: point(0, -1.5), text: 'b', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // edge from parent r -- b
  pic.edge('r', 'b')

  // child 1 of b
  pic.node('b-1', { at: point(-1.5, -3), text: 'b1', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent b -- b-1
  pic.edge('b', 'b-1')

  // child 3 of b
  pic.node('b-3', { at: point(1.5, -3), text: 'b3', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent b -- b-3
  pic.edge('b', 'b-3', { style: [{ stroke: '#ff0000' }, 'thick'], labels: [{ text: 'x', pos: 0.5, at: 'east' }] })

  // child 3 of r
  pic.node('r-3', { at: point(1.5, -1.5), text: 'c', shape: 'circle', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

  // edge from parent r -- r-3
  pic.edge('r', 'r-3', { arrowEnd: 'to' })

  // \begin{scope}[level distance=1cm, sibling distance=2cm, every child node/.style={draw, circle}]
  pic.scope({  }, (s) => {

    // \node (s) at (6,0) {s} child {node {1}} child {node {2}};
    s.node('s', { at: point(6, 0), text: 's', style: [{ stroke: 'none', fill: 'none' }] })

    // child 1 of s
    s.node('s-1', { at: point(5, -1), text: '1', shape: 'circle', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // edge from parent s -- s-1
    s.edge('s', 's-1')

    // child 2 of s
    s.node('s-2', { at: point(7, -1), text: '2', shape: 'circle', style: [{ stroke: 'none', fill: 'none' }, { stroke: '#000000' }] })

    // edge from parent s -- s-2
    s.edge('s', 's-2')
  })

  // \node (t) at (0,-4) {t}
  pic.node('t', { at: point(0, -4), text: 't', style: [{ stroke: 'none', fill: 'none' }] })

  // child 1 of t
  pic.node('t-1', { at: point(-1.5, -5.5), text: 'u', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent t -- t-1
  pic.edge('t', 't-1', { style: [{ stroke: '#0000ff' }] })

  // child 1 of t-1
  pic.node('t-1-1', { at: point(-2, -7), text: 'u1', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent t-1 -- t-1-1
  pic.edge('t-1', 't-1-1', { style: [{ stroke: '#0000ff' }] })

  // child 2 of t-1
  pic.node('t-1-2', { at: point(-1, -7), text: 'u2', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent t-1 -- t-1-2
  pic.edge('t-1', 't-1-2', { style: [{ stroke: '#0000ff' }] })

  // child 2 of t
  pic.node('t-2', { at: point(1.5, -5.5), text: 'v', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent t -- t-2
  pic.edge('t', 't-2', { style: [{ stroke: '#0000ff' }] })

  // child 1 of t-2
  pic.node('t-2-1', { at: point(1, -7), text: 'v1', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent t-2 -- t-2-1
  pic.edge('t-2', 't-2-1', { style: [{ stroke: '#0000ff' }] })

  // child 2 of t-2
  pic.node('t-2-2', { at: point(2, -7), text: 'v2', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent t-2 -- t-2-2
  pic.edge('t-2', 't-2-2', { style: [{ stroke: '#0000ff' }] })

  // \node[grow=right] (g) at (6,-4) {g} child {node {g1}} child {node {g2}};
  pic.node('g', { at: point(6, -4), text: 'g', style: [{ stroke: 'none', fill: 'none' }] })

  // child 1 of g
  pic.node('g-1', { at: point(7.5, -5.5), text: 'g1', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent g -- g-1
  pic.edge('g', 'g-1', { style: [{ stroke: '#0000ff' }] })

  // child 2 of g
  pic.node('g-2', { at: point(7.5, -2.5), text: 'g2', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent g -- g-2
  pic.edge('g', 'g-2', { style: [{ stroke: '#0000ff' }] })

  // \node[grow'=right] (h) at (9,-4) {h} child {node {h1}} child {node {h2}};
  pic.node('h', { at: point(9, -4), text: 'h', style: [{ stroke: 'none', fill: 'none' }] })

  // child 1 of h
  pic.node('h-1', { at: point(10.5, -2.5), text: 'h1', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent h -- h-1
  pic.edge('h', 'h-1', { style: [{ stroke: '#0000ff' }] })

  // child 2 of h
  pic.node('h-2', { at: point(10.5, -5.5), text: 'h2', style: [{ stroke: 'none', fill: 'none' }] })

  // edge from parent h -- h-2
  pic.edge('h', 'h-2', { style: [{ stroke: '#0000ff' }] })

  return pic
}
