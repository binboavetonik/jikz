import { allShapes, picture, point } from 'jikz'

// The neural-net diagram every ML slide needs: layered nodes with
// dense inter-layer edges. Layers come from arrays of y-positions;
// every pair gets a faint edge, one highlighted path shows a forward
// pass. Boundary anchoring clips all 24 edges at the node rims.

const LAYERS = [3, 5, 4, 1] // input, hidden×2, output

export default function render(container: HTMLElement) {
  const pic = picture({ shapes: allShapes })
  const layerX = [60, 180, 300, 410]
  const spacing = 62

  // place nodes, named l{layer}n{index}
  LAYERS.forEach((count, li) => {
    const yTop = 150 - ((count - 1) * spacing) / 2
    for (let i = 0; i < count; i++) {
      pic.node(`l${li}n${i}`, {
        at: point(layerX[li]!, yTop + i * spacing),
        shape: 'circle', width: 30, height: 30,
      }, { style: { stroke: '#334155', fill: li === 0 ? '#dbeafe' : li === 3 ? '#dcfce7' : '#f1f5f9', strokeWidth: 1.4 } })
    }
  })

  // dense edges between adjacent layers
  const highlight = ['l0n1', 'l1n2', 'l2n1', 'l3n0']
  LAYERS.forEach((count, li) => {
    if (li === LAYERS.length - 1) return
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < LAYERS[li + 1]!; j++) {
        const a = `l${li}n${i}`, b = `l${li + 1}n${j}`
        const onPath = highlight.includes(a) && highlight.includes(b)
          && highlight.indexOf(b) === highlight.indexOf(a) + 1
        pic.edge(a, b, {}, {
          style: onPath
            ? { stroke: '#dc2626', strokeWidth: 2 }
            : { stroke: '#cbd5e1', strokeWidth: 0.8 },
        })
      }
    }
  })

  // layer captions
  const labels = ['input', 'hidden', 'hidden', 'output']
  LAYERS.forEach((_count, li) => {
    pic.text(point(layerX[li]!, 285), labels[li]!, { fontSize: 10, style: { stroke: '#64748b' } })
  })

  pic.mount(container, { width: 460, height: 300 })
}
