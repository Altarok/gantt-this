export type Moon = {
  /** New moon gets drawn here */
  offset: number
  cycle: number
  color?: string
  colorBg?: string
  phases?: number
}

export type MoonDrawPosition = {
  /** Center X position (usually xPos of the tick) */
  xPos: number
  /** Nominator */
  step: number
  /** Denominator */
  phase: number
}

export type SingleMoonDrawData = {
  index: number
  color: string
  colorBg: string
  positions: MoonDrawPosition[]
}

export type MoonDrawData = {
  moonCount: number
  /** Size of this should equal moonCount */
  moons: SingleMoonDrawData[]
}
