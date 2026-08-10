import {Moon} from '../const/types'

/**
 * Calculates phase index (0 to 4) for a given calendar day.
 * Returns null if no moon configuration exists for this calendar.
 */
function calculatePhase(currDays: number, moon: Moon): number | null {
  if (Number.isNaN(moon.cycle) || Number.isNaN(moon.offset)) return null

  const cycle: number = moon.cycle
  const offset: number = moon.offset

// 1. Calculate continuous progress float (e.g. 10.42 cycles elapsed)
  const totalDays = currDays + offset
  const totalCycles = totalDays / cycle

  // 2. Extract the fractional part (0.0 to 1.0) handling negative days cleanly
  const progress = totalCycles - Math.floor(totalCycles)

  // 2. Map 0.0 - 1.0 range to 5 phase buckets centered on main phases
  // New Moon is centered at 0.0 / 1.0
  if (progress < 0.1 || progress >= 0.9) {
    return 0 // New Moon (0/4)
  } else if (progress < 0.4) {
    return 1 // First Quarter / Waxing (1/4)
  } else if (progress < 0.6) {
    return 2 // Full Moon (2/4)
  } else if (progress < 0.9) {
    return 3 // Third Quarter / Waning (3/4)
  }

  return 0
}

export const Moons = {
  calculatePhase
}

