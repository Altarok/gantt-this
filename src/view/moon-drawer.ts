import {GanttRenderEngine} from './svg-drawer'
import {CalendarConfig, Moon} from '../const/types'
import {Util} from './svg-drawer-util'

export function drawMoons(
  engine: GanttRenderEngine,
  ticksG: SVGGElement,
  width: number,
  calendarConfig: CalendarConfig | undefined,
  startDaysValue: number,
  endDaysValue: number,
  effectiveStartDay: number,
  effectiveEndDay: number,
  renderWidth: number) {

  const moons = calendarConfig?.moons ?? []
  const moonCount = moons?.length ?? 0

  if (moonCount) moons.forEach((moon: Moon, index: number) => {
    const L = moon.cycle
    if (!L || L <= 0) return
    const O = moon.offset ?? 0

    // Pixel distance for a 1/4 cycle step (quarter moon to quarter moon)
    const quarterCycleDays = L / 4
    const x0 = engine.getXPosition(startDaysValue, width)
    const xQuarter = engine.getXPosition(startDaysValue + quarterCycleDays, width)
    const quarterCyclePixels = Math.abs(xQuarter - x0)

    // Pixel distance for a 1/2 cycle step (New to Full)
    const halfCyclePixels = quarterCyclePixels * 2

    // Minimum distance threshold to render without icon overlap
    const MIN_ICON_SPACING_PX = 20

    // Guard: Skip entire moon if even Full/New phases are too crowded
    if (halfCyclePixels < MIN_ICON_SPACING_PX) return

    // Determine if zoom level allows quarter phases or major phases only
    const showQuarterPhases = quarterCyclePixels >= MIN_ICON_SPACING_PX

    // Determine cycle integer range covering visible bounds
    // const minK = Math.floor((startDaysValue) / L) - 1
    // const maxK = Math.ceil((endDaysValue) / L) + 1
    const minK = Math.floor(effectiveStartDay / L) - 1
    const maxK = Math.ceil(effectiveEndDay / L) + 1

    // Helper closure to handle visibility bounds checking & drawing
    const renderPhaseIfVisible = (x: number, exactDay: number, phaseIndex: number) => {
      if (exactDay < effectiveStartDay || exactDay > effectiveEndDay)
        return
      if (exactDay < startDaysValue || exactDay > endDaysValue)
        return

      if (x >= 0 && x <= renderWidth)
        Util.drawMoonPhase(x, 0, phaseIndex, index, moonCount, ticksG, moon.color ?? 'currentColor')
    }

    for (let k = minK; k <= maxK; k++) {
      // 1. New Moon (Progress 0.0) -> Phase Index 0
      const newMoonDay = k * L - O
      renderPhaseIfVisible(engine.getXPosition(newMoonDay, width), newMoonDay, 0)

      // 2. First Quarter (Progress 0.25) -> Phase Index 1
      if (showQuarterPhases) {
        const firstQuarterDay = (k + 0.25) * L - O
        renderPhaseIfVisible(engine.getXPosition(firstQuarterDay, width), firstQuarterDay, 1)
      }

      // 3. Full Moon (Progress 0.5) -> Phase Index 2
      const fullMoonDay = (k + 0.5) * L - O
      renderPhaseIfVisible(engine.getXPosition(fullMoonDay, width), fullMoonDay, 2)

      // 4. Third Quarter (Progress 0.75) -> Phase Index 3
      if (showQuarterPhases) {
        const thirdQuarterDay = (k + 0.75) * L - O
        renderPhaseIfVisible(engine.getXPosition(thirdQuarterDay, width), thirdQuarterDay, 3)
      }
    }
  })
}
