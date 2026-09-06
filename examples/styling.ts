import { picture, rect, circle, point } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  pic.filldraw(rect(30, 40, 140, 120), {
    style: {
      gradient: {
        type: 'linear',
        angle: 45,
        stops: [
          { offset: 0, color: '#0ea5e9' },
          { offset: 1, color: '#a855f7' },
        ],
      },
      stroke: '#111827',
      strokeWidth: 1,
    },
  })
  pic.filldraw(circle(point(260, 100), 55), {
    style: {
      fill: '#fde047',
      stroke: '#ca8a04',
      strokeWidth: 2,
      dash: 'dashed',
      dropShadow: { blur: 4, offsetX: 3, offsetY: 3, color: '#000' },
    },
  })

  pic.mount(container, { width: 360, height: 200 })
}
