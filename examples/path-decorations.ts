import { picture, path, point, snakePath, zigzagPath, coilPath } from 'jikz'

export default function render(container: HTMLElement) {
  const base = (y: number) => path().moveTo(point(20, y)).lineTo(point(320, y))

  picture()
    .draw(snakePath(base(40),  { amplitude: 6, wavelength: 18 }), { style: { stroke: '#2563eb', strokeWidth: 1.5 } })
    .draw(zigzagPath(base(90), { amplitude: 6, wavelength: 14 }), { style: { stroke: '#16a34a', strokeWidth: 1.5 } })
    .draw(coilPath(base(140),  { amplitude: 8 }),                 { style: { stroke: '#dc2626', strokeWidth: 1.5 } })
    .mount(container, { width: 340, height: 170 })
}
