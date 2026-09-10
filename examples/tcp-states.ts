import { picture, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()
  const st = { stroke: '#334155', fill: '#f1f5f9', strokeWidth: 1.5 }

  pic.node('CLOSED', { at: point(90, 110),  shape: 'circle', width: 76,  height: 76,  text: 'CLOSED' },      { style: st, textStyle: { fontSize: 11 } })
  pic.node('SYN',    { at: point(250, 60),  shape: 'circle', width: 86,  height: 86,  text: 'SYN SENT' },    { style: st, textStyle: { fontSize: 11 } })
  pic.node('EST',    { at: point(410, 120), shape: 'circle', width: 112, height: 112, text: 'ESTABLISHED' }, { style: st, textStyle: { fontSize: 10 } })
  pic.node('FIN',    { at: point(250, 200), shape: 'circle', width: 86,  height: 86,  text: 'FIN WAIT' },    { style: st, textStyle: { fontSize: 11 } })
  pic.node('LISTEN', { at: point(90, 260),  shape: 'circle', width: 72,  height: 72,  text: 'LISTEN' },      { style: st, textStyle: { fontSize: 11 } })

  const es = { stroke: '#64748b', strokeWidth: 1.2 }
  pic.edge('CLOSED', 'SYN',    { arrowEnd: 'stealth', label: 'send SYN',     bendAngle: 15 }, { style: es })
  pic.edge('SYN', 'EST',       { arrowEnd: 'stealth', label: 'SYN+ACK, ACK', bendAngle: 15 }, { style: es })
  pic.edge('EST', 'FIN',       { arrowEnd: 'stealth', label: 'close / FIN',  bendAngle: 15 }, { style: es })
  pic.edge('FIN', 'CLOSED',    { arrowEnd: 'stealth', label: 'ACK / timeout', bendAngle: 15 }, { style: es })
  pic.edge('CLOSED', 'LISTEN', { arrowEnd: 'stealth', label: 'passive open' },               { style: es })
  pic.edge('EST', 'EST',       { loop: 'above', label: 'data' },                             { style: { stroke: '#2563eb', strokeWidth: 1.2 } })

  pic.mount(container, { width: 500, height: 320 })
}
