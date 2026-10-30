import {GanttRenderEngine} from '../view/svg-drawer'
import {CalendarConfig} from '../types/calendar-types'
import {drawMoonPhase} from '../view/svg-drawer-util'
import {Moon, MoonDrawData, MoonPhase} from "../types/moon-types";

/**
 * Renders moon phases along the timeline axis based on calendar configuration,
 * cycle lengths, and current zoom/viewport dimensions.
 *
 * @param engine - The Gantt render engine for coordinate mapping.
 * @param ticksG - The SVG group element where the moon phase icons are drawn.
 * @param calendarConfig - Configuration object containing moon definitions.
 * @param startDaysValue - Start day of the current viewport.
 * @param endDaysValue - End day of the current viewport.
 * @param effectiveStartDay - Effective start day including buffer bounds.
 * @param effectiveEndDay - Effective end day including buffer bounds.
 * @param renderWidth - Total width of the render area in pixels.
 */
export function drawMoons(engine: GanttRenderEngine,
                          ticksG: SVGGElement,
                          calendarConfig: CalendarConfig,
                          startDaysValue: number,
                          endDaysValue: number,
                          effectiveStartDay: number,
                          effectiveEndDay: number,
                          renderWidth: number) {

  // debug.log(`drawMoons >>`)

  const moons = calendarConfig.moons ?? []
  const moonCount = moons?.length ?? 0

  if (!moonCount) return

  const moonDrawData: MoonDrawData = {
    moonCount: moonCount,
    moons: []
  }

  moons.forEach((moon: Moon) => {
    if (Number.isNaN(moon.cycle) || moon.cycle <= 0 || Number.isNaN(moon.offset)) return

    const cycle = moon.cycle
    const offset = (moon.offset + calendarConfig.offsetToDayZero) % cycle

    /* Pixel distance for a 1/4 cycle step (quarter moon to quarter moon) */
    const quarterCycleDays = cycle / 4
    const x0 = engine.getXPosition(startDaysValue)
    const xQuarter = engine.getXPosition(startDaysValue + quarterCycleDays)
    const quarterCyclePixels = Math.abs(xQuarter - x0)

    /* Pixel distance for a 1/2 cycle step (New to Full) */
    const halfCyclePixels = quarterCyclePixels * 2

    /* Minimum distance threshold to render without icon overlap */
    const MIN_ICON_SPACING_PX = 20

    /* Guard: Skip entire moon if even Full/New phases are too crowded */
    if (halfCyclePixels < MIN_ICON_SPACING_PX) return

    /* Determine if zoom level allows quarter phases or major phases only */
    const showQuarterPhases = quarterCyclePixels >= MIN_ICON_SPACING_PX

    /* Determine cycle integer range covering visible bounds */
    const minK = Math.floor(effectiveStartDay / cycle) - 1
    const maxK = Math.ceil(effectiveEndDay / cycle) + 1

    /* Helper closure to handle visibility bounds checking & drawing */
    const renderPhaseIfVisible = (x: number, exactDay: number, phase: MoonPhase) => {
      if (exactDay < effectiveStartDay || exactDay > effectiveEndDay)
        return
      if (exactDay < startDaysValue || exactDay > endDaysValue)
        return

      if (x >= 0 && x <= renderWidth) {
        // debug.log(`drawMoons -- rendering moon`)
        moonDrawData.moons.push({x, phase, color: moon.color ?? 'currentColor'})
      }
    }

    for (let k = minK; k <= maxK; k++) {
      /* 1. New Moon (Progress 0.0) -> Phase Index 0 */
      const newMoonDay = k * cycle + offset
      renderPhaseIfVisible(engine.getXPosition(newMoonDay), newMoonDay, 0)

      /* 2. First Quarter (Progress 0.25) -> Phase Index 1 */
      if (showQuarterPhases) {
        const firstQuarterDay = (k + 0.25) * cycle + offset
        renderPhaseIfVisible(engine.getXPosition(firstQuarterDay), firstQuarterDay, 1)
      }

      // 3. Full Moon (Progress 0.5) -> Phase Index 2 */
      const fullMoonDay = (k + 0.5) * cycle + offset
      renderPhaseIfVisible(engine.getXPosition(fullMoonDay), fullMoonDay, 2)

      /* 4. Third Quarter (Progress 0.75) -> Phase Index 3 */
      if (showQuarterPhases) {
        const thirdQuarterDay = (k + 0.75) * cycle + offset
        renderPhaseIfVisible(engine.getXPosition(thirdQuarterDay), thirdQuarterDay, 3)
      }
    }
  })

  moonDrawData.moons.forEach((moon, index) =>
    drawMoonPhase(moon.x, moon.phase, index, moonCount, ticksG, moon.color)
  )

  // debug.log(`drawMoons <<`)
}
