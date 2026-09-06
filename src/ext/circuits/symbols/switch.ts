import type { PointLike } from '../../../core/types'
import type { ShapeOptions } from '../../../geometry/Shape'
import { TwoTerminalSymbol, symbolSize } from '../ports'

/** Switch state: normally open (angled blade) or closed (straight). */
export type SwitchVariant = 'open' | 'closed'

/** Switch symbol options. */
export interface SwitchOptions extends ShapeOptions {
  /** Default: 'open'. */
  variant?: SwitchVariant
}

/** Intrinsic symbol width (including lead stubs) when no width is given. */
export const SWITCH_DEFAULT_WIDTH = 60
/** Intrinsic symbol height when no height is given. */
export const SWITCH_DEFAULT_HEIGHT = 20

/** Contact dots sit this far in from the lead tips. */
const CONTACT_INSET_FRACTION = 0.25
const CONTACT_RADIUS = 1.5
/** Open-blade tip height above the contact line, as a fraction of height. */
const BLADE_LIFT = 0.7

/**
 * Two-terminal switch (SPST): contact dots, a blade, and leads.
 * Ports: `in` (west lead tip), `out` (east lead tip).
 */
export class Switch extends TwoTerminalSymbol {
  readonly type = 'switch' as const
  readonly variant: SwitchVariant

  constructor(
    center: PointLike,
    width: number,
    height: number,
    variant: SwitchVariant = 'open'
  ) {
    super(center, width, height)
    this.variant = variant
  }

  toSVGPath(): string {
    const cx = this.center.x
    const cy = this.center.y
    const westX = cx - this.width / 2
    const eastX = cx + this.width / 2
    const x1 = cx - this.width * CONTACT_INSET_FRACTION
    const x2 = cx + this.width * CONTACT_INSET_FRACTION

    const parts = [
      `M ${westX} ${cy} L ${x1} ${cy}`,
      contactDot(x1, cy),
      contactDot(x2, cy),
      `M ${x2} ${cy} L ${eastX} ${cy}`,
    ]

    if (this.variant === 'open') {
      // Blade from the west contact up toward (but not touching) the
      // east contact.
      const tipY = cy - this.height * BLADE_LIFT
      parts.push(`M ${x1} ${cy} L ${x2 + CONTACT_RADIUS} ${tipY}`)
    } else {
      parts.push(`M ${x1} ${cy} L ${x2} ${cy}`)
    }

    return parts.join(' ')
  }

  protected recreate(
    center: PointLike,
    width: number,
    height: number
  ): Switch {
    return new Switch(center, width, height, this.variant)
  }
}

/** Tiny filled-contact circle as two half-arcs. */
function contactDot(x: number, y: number): string {
  const r = CONTACT_RADIUS
  return `M ${x - r} ${y} A ${r} ${r} 0 1 0 ${x + r} ${y} A ${r} ${r} 0 1 0 ${x - r} ${y}`
}

/** Create a switch symbol (intrinsic 60×20 default). */
export function createSwitch(options: SwitchOptions = {}): Switch {
  const { width, height } = symbolSize(
    options,
    SWITCH_DEFAULT_WIDTH,
    SWITCH_DEFAULT_HEIGHT
  )
  return new Switch(
    options.center ?? { x: 0, y: 0 },
    width,
    height,
    options.variant ?? 'open'
  )
}
