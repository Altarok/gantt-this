/**
 * Moon phase index.
 * 0 - new moon
 * 1 - first quarter
 * 2 - full moon
 * 3 - third Quarter
 */
export type MoonPhase = 0 | 1 | 2 | 3

export type Moon = {
  /** New moon gets drawn here */
  offset: number
  cycle: number
  color?: string
}

export type MoonDrawData = {
  moonCount: number
  /** Size of this should equal moonCount */
  moons: {

    /** Center X position (usually xPos of the tick) */
    x: number
    phase: MoonPhase
    color: string
  }[]

}
