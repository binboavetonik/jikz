import { picture, point, plot, plotFromPoints } from 'jikz'

export default function render(container: HTMLElement) {
  const pic = picture()

  // Noisy samples of a sine wave, marked with filled-circle scatter
  // markers. Marks inherit the plot's stroke color.
  const data = Array.from({ length: 20 }, (_, i) => {
    const x = 30 + i * 12
    const y = 100 - 55 * Math.sin(i / 2.5) + (i % 3 - 1) * 6
    return point(x, y)
  })
  pic.draw(
    plotFromPoints(data, false, { name: 'circleFilled', size: 7 }),
    { style: { stroke: '#2563eb' } }
  )

  // The underlying curve, with an asterisk mark every 15th sample —
  // `marks.every` thins the markers without thinning the curve.
  pic.draw(
    plot(x => 100 - 55 * Math.sin((x - 30) / 12 / 2.5), {
      domain: [30, 30 + 19 * 12],
      samples: 90,
      marks: { name: 'asterisk', size: 6, every: 15 },
    }),
    { style: { stroke: '#dc2626', strokeWidth: 1.5 } }
  )

  pic.mount(container, { width: 290, height: 200 })
}
