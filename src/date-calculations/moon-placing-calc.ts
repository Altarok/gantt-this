import {GanttRenderEngine} from '../render/svg-drawer'
import {CalendarConfig} from '../types/calendar-types'
import {MoonDrawData, MoonDrawPosition} from '../types/moon-types'

/** Minimum distance threshold to render without icon overlap */
const MIN_ICON_SPACING_PX = 20

/**
 * Calculates and returns draw data for all visible moon phases across configured lunar cycles.
 *
 * @param engine - The Gantt render engine for coordinate mapping.
 * @param calendarConfig - Configuration object containing moon definitions.
 * @param startDaysValue - Start day of the current viewport.
 * @param endDaysValue - End day of the current viewport.
 * @param effectiveStartDay - Effective start day including buffer bounds.
 * @param effectiveEndDay - Effective end day including buffer bounds.
 * @param renderWidth - Total width of the render area in pixels.
 */
export function calculateMoonPositions(engine: GanttRenderEngine,
                                       calendarConfig: CalendarConfig,
                                       startDaysValue: number,
                                       endDaysValue: number,
                                       effectiveStartDay: number,
                                       effectiveEndDay: number,
                                       renderWidth: number): MoonDrawData {

  const moons = calendarConfig.moons ?? []

  const moonDrawData: MoonDrawData = {
    moonCount: moons.length,
    moons: []
  }

  if (moons.length === 0) return moonDrawData /* fast-fail */

  moons.forEach((moon, index) => {
    if (Number.isNaN(moon.cycle) || moon.cycle <= 0 || Number.isNaN(moon.offset)) return /* fast-fail */

    const cycle = moon.cycle
    const phases = moon.phases ?? 4
    const offset = (moon.offset + calendarConfig.offsetToDayZero) % cycle

    /* Pixel distance for a 1/4 cycle step (quarter moon to quarter moon) */
    const singleStepDays = cycle / phases
    const x0 = engine.getXPosition(0)
    const x1 = engine.getXPosition(singleStepDays)
    const distanceBetweenTwoPhases = Math.abs(x1 - x0)

    /* Pixel distance for a 1/2 cycle step (New to Full) */
    const halfCyclePixels = distanceBetweenTwoPhases * 2

    /* Guard: Skip entire moon if even major phases (New/Full) would overlap */
    if (halfCyclePixels < MIN_ICON_SPACING_PX) return /* fast-fail */

    /* Determine if zoom level provides enough screen space for intermediate quarter phases */
    // const showQuarterPhases = distanceBetweenTwoPhases >= MIN_ICON_SPACING_PX

    /*
     * Determine the range of cycle indices (k) that intersect with the
     * current viewport boundaries (plus a 1-cycle safety buffer).
     */
    const minK = Math.floor(effectiveStartDay / cycle) - 1
    const maxK = Math.ceil(effectiveEndDay / cycle) + 1

    const singleMoonDrawData: { index: number, color: string, colorBg: string, positions: MoonDrawPosition[] } = {
      index,
      color: moon.color ?? 'currentColor',
      colorBg: moon.colorBg ?? 'black',
      positions: []
    }
    moonDrawData.moons.push(singleMoonDrawData)

    /* Helper closure to validate viewport bounds and collect visible moon data */
    const renderPhaseIfVisible = (x: number, exactDay: number, step: number, phase: number) => {
      if (exactDay < effectiveStartDay || exactDay > effectiveEndDay) return
      if (exactDay < startDaysValue || exactDay > endDaysValue) return
      if (x >= 0 && x <= renderWidth) singleMoonDrawData.positions.push({xPos: x, step, phase})
    }

    let lastXPos = -Infinity

    /* Iterate through all lunar cycles falling within the visible render range */
    for (let k = minK; k <= maxK; k++) {
      /* Iterate through all lunar cycles falling within 2 new moons */
      for (let step = 0; step < phases; step++) {
        const progress = step / phases
        const exactDay = (k + progress) * cycle + offset

        const xPos = engine.getXPosition(exactDay)
        if (xPos - lastXPos > distanceBetweenTwoPhases) {
          renderPhaseIfVisible(xPos, exactDay, step, phases)
          lastXPos = xPos
        }
      }
    }

  })


  return moonDrawData
}
