import {GanttRenderEngine} from '../render/svg-drawer'
import {CalendarConfig} from '../types/calendar-types'
import {Moon, MoonDrawData, SingleMoonDrawData} from '../types/moon-types'
import {getDivisors} from '../util/mathe'

/** Minimum distance threshold to render without icon overlap */
const MIN_ICON_SPACING_PX = 20

function calculatePhaseStepsForThisMoon(engine: GanttRenderEngine,
                                        moon: Moon): number | null {
  let result: number | null = null

  const cycle = moon.cycle
  const phases = moon.phases ?? 4
  const singleStep = cycle / phases

  const x0 = engine.getXPosition(0)

  const descendingDivisors = getDivisors(phases, false)

  for (const divisor of descendingDivisors) {
    // check if we can draw moons at this distance

    const x1 = engine.getXPosition(divisor * singleStep)
    const distanceOnScreen = Math.abs(x1 - x0)

    if (distanceOnScreen < MIN_ICON_SPACING_PX) break

    result = divisor
  }

  return result
}

/**
 * Calculates and returns draw data for all visible moon phases across configured lunar cycles.
 *
 * @param engine - The Gantt render engine for coordinate mapping.
 * @param calendarConfig - Configuration object containing moon definitions.
 * @param startDaysValue - Start day of the current viewport.
 * @param endDaysValue - End day of the current viewport.
 * @param effectiveStartDay - Effective start day including buffer bounds.
 * @param effectiveEndDay - Effective end day including buffer bounds.
 * @param renderWidth - Total width of the area in pixels.
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

  moons.forEach((moon: Moon, index) => {
    if (Number.isNaN(moon.cycle) || moon.cycle <= 0 || Number.isNaN(moon.offset)) return /* fast-fail TODO add error */

    const phaseStep: number | null = calculatePhaseStepsForThisMoon(engine, moon)

    if (!phaseStep) return /* fast-fail */

    const cycle = moon.cycle
    const phases = moon.phases ?? 4
    const offset = (moon.offset + calendarConfig.offsetToDayZero) % cycle

    /*
     * Determine the range of cycle indices (k) that intersect with the
     * current viewport boundaries (plus a 1-cycle safety buffer).
     */
    const minK = Math.floor(effectiveStartDay / cycle) - 1
    const maxK = Math.ceil(effectiveEndDay / cycle) + 1

    const singleMoonDrawData: SingleMoonDrawData = createDefaultSingleMoonData(index, moon)
    moonDrawData.moons.push(singleMoonDrawData)

    /* Helper closure to validate viewport bounds and collect visible moon data */
    const renderPhaseIfVisible = (x: number, exactDay: number, step: number, phase: number) => {
      if (exactDay < effectiveStartDay || exactDay > effectiveEndDay) return
      if (exactDay < startDaysValue || exactDay > endDaysValue) return
      if (x >= 0 && x <= renderWidth) singleMoonDrawData.positions.push({xPos: x, step, phase})
    }

    /* Iterate through all lunar cycles falling within the visible render range */
    for (let k = minK; k <= maxK; k++) {
      /* Iterate through all lunar cycles falling within 2 new moons */
      for (let step = 0; step < phases; step = step + phaseStep) {
        const progress = step / phases
        const exactDay = (k + progress) * cycle + offset

        const xPos = engine.getXPosition(exactDay)
        renderPhaseIfVisible(xPos, exactDay, step, phases)
      }
    }

  })


  return moonDrawData
}

function createDefaultSingleMoonData(index: number, moon: Moon): SingleMoonDrawData {
  return {
    index,
    color: moon.color ?? 'currentColor',
    colorBg: moon.colorBg ?? 'black',
    positions: []
  }
}
