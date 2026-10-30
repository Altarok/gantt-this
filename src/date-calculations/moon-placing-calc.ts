import {GanttRenderEngine} from '../view/svg-drawer'
import {CalendarConfig} from '../types/calendar-types'
import {MoonDrawData, MoonDrawPosition, MoonPhase} from '../types/moon-types'

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
  // const moonCount = moons.length ?? 0

  const moonDrawData: MoonDrawData = {
    moonCount: moons.length,
    moons: []
  }

  if (moons.length === 0) return moonDrawData /* fast-fail */

  // for (const moon of moons) {
  moons.forEach((moon, index) => {
    if (Number.isNaN(moon.cycle) || moon.cycle <= 0 || Number.isNaN(moon.offset)) return /* fast-fail */

    const cycle = moon.cycle
    const offset = (moon.offset + calendarConfig.offsetToDayZero) % cycle

    /* Pixel distance for a 1/4 cycle step (quarter moon to quarter moon) */
    const quarterCycleDays = cycle / 4
    const x0 = engine.getXPosition(0)
    const xQuarter = engine.getXPosition(quarterCycleDays)
    const quarterCyclePixels = Math.abs(xQuarter - x0)

    /* Pixel distance for a 1/2 cycle step (New to Full) */
    const halfCyclePixels = quarterCyclePixels * 2

    /* Guard: Skip entire moon if even major phases (New/Full) would overlap */
    if (halfCyclePixels < MIN_ICON_SPACING_PX) return /* fast-fail */

    /* Determine if zoom level provides enough screen space for intermediate quarter phases */
    const showQuarterPhases = quarterCyclePixels >= MIN_ICON_SPACING_PX

    /*
     * Determine the range of cycle indices (k) that intersect with the
     * current viewport boundaries (plus a 1-cycle safety buffer).
     */
    const minK = Math.floor(effectiveStartDay / cycle) - 1
    const maxK = Math.ceil(effectiveEndDay / cycle) + 1

    const singleMoonDrawData: { index: number, color: string, positions: MoonDrawPosition[] } =
      {index, color: moon.color ?? 'currentColor', positions: []}
    moonDrawData.moons.push(singleMoonDrawData)

    /* Helper closure to validate viewport bounds and collect visible moon data */
    const renderPhaseIfVisible = (x: number, exactDay: number, phase: MoonPhase) => {
      if (exactDay < effectiveStartDay || exactDay > effectiveEndDay)
        return
      if (exactDay < startDaysValue || exactDay > endDaysValue)
        return

      if (x >= 0 && x <= renderWidth) {
        singleMoonDrawData.positions.push({x, phase})
      }
    }

    const phaseOffsets = showQuarterPhases
      ? [{progress: 0, phase: 0}, {progress: 0.25, phase: 1}, {progress: 0.5, phase: 2}, {progress: 0.75, phase: 3}]
      : [{progress: 0, phase: 0}, {progress: 0.5, phase: 2}]


    /* Iterate through all lunar cycles falling within the visible render range */
    for (let k = minK; k <= maxK; k++) {
      /* Iterate through all lunar cycles falling within 2 new moons */
      for (const {progress, phase} of phaseOffsets) {
        const exactDay = (k + progress) * cycle + offset
        renderPhaseIfVisible(engine.getXPosition(exactDay), exactDay, phase as MoonPhase)
      }
    }

  })


  return moonDrawData
}
