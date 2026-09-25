import {CalendarConfig, GanttItem, RepeatRule} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {createParsedDate} from '../date-calculations/event-date-input-calc'

// export type RepeatRule = {
//   delta: number
//   startDate?: number
//   endDate?: number
// }

export const Recurring = {
  createRepeatRule,
  expandRecurringEvents
}

/**
 * Interpret input-date suffix to make its event repeat itself.
 *
 * @param isStartDate - decide which suffixes to check
 * @param input - suffix of a date, what came after `' repeat '`
 * @param calendarConfig
 */
function createRepeatRule(isStartDate: boolean, input: string, calendarConfig?: CalendarConfig): RepeatRule | undefined {

  const isEndDate = !isStartDate

  let delta: number | undefined = undefined
  let startDate = -Infinity
  let endDate = +Infinity

  if (isStartDate && /^(after|every) [1-9]\d* days/.test(input)) {
    delta = Number(input.replace(/^(after|every) (\d+) days.*/g, '$2'))
  } else if (isEndDate && /^after \d+ days/.test(input)) {
    delta = Number(input.replace(/^after (\d+) days.*/g, '$1'))
  }

  if (!delta) {
    // console.info(`input(${input}) --> repeatRule: undefined`)
    return undefined
  }

  if (calendarConfig) {

    if (/starting from \[[^\]]+]( |$)/.test(input)) {
      const startMatch = /starting from \[([^\]]+)]/.exec(input)
      if (startMatch) {
        const parsedDate = createParsedDate(startMatch[1]!.trim(), calendarConfig)
        if (parsedDate) startDate = parsedDate.days
      }

      // const startDateRaw = input.replace(/.*starting from \[([^\]]+)].*?/g, '$1').trim()
      // const parsedDate = createParsedDate(startDateRaw, calendarConfig)
      // if (parsedDate) startDate = parsedDate.days
    }

    if (/ending on \[[^\]]+]( |$)/.test(input)) {
      const endMatch = /ending on \[([^\]]+)]/.exec(input)
      if (endMatch) {
        const parsedDate = createParsedDate(endMatch[1]!.trim(), calendarConfig)
        if (parsedDate) endDate = parsedDate.days
      }


      // const endDateRaw = input.replace(/.*ending on \[([^\]]+)].*/g, '$1').trim()
      // const parsedDate = createParsedDate(endDateRaw, calendarConfig)
      // if (parsedDate) endDate = parsedDate.days
    }

  }

  return {delta, startDate, endDate}

  // const repeatRule: RepeatRule = {delta, startDate, endDate}
  // console.info(`input(${input}) --> repeatRule: delta(${repeatRule.delta}), startDate(${repeatRule.startDate}), endDate(${repeatRule.endDate})`)
  // return repeatRule
}

/**
 * Expand list of actively shown data on chart with repeating events.
 * Method creates duplicates for repeating events.
 *
 * @param engine
 * @param items
 */
function expandRecurringEvents(engine: GanttRenderEngine, items: GanttItem[]): GanttItem[] {
  const doubleIconSize = 2 * engine.plugin.settings.viewEventIconHeight
  const expanded: GanttItem[] = []

  const renderWidth = engine.getRenderWidth()
  const totalDaysSpan = engine.viewConfig.maxDays - engine.viewConfig.minDays
  if (totalDaysSpan <= 0) return items

  const pixelsPerDay = (renderWidth / totalDaysSpan) * engine.viewConfig.zoomFactor
  if (pixelsPerDay <= 0) return items

  // Compute exact start/end days currently visible on the physical screen
  const panX = engine.viewConfig.panTranslateX
  const visibleMinDays = engine.viewConfig.minDays + (-panX / pixelsPerDay)
  const visibleMaxDays = visibleMinDays + (renderWidth / pixelsPerDay)

  for (const item of items) {
    expanded.push(item) // Always include the base event

    if (!item.repeatRule) continue

    const interval = item.repeatRule.delta
    if (!interval || interval <= 0) continue

    const duration = item.endDays ? (item.endDays - item.startDays) : 0

    // Compute minimum multiplier cleanly in O(1) without iterating
    const pixelSpacingPerInterval = interval * pixelsPerDay
    let minIntervalMultiplier = 1
    if (pixelSpacingPerInterval < doubleIconSize && pixelSpacingPerInterval > 0) {
      minIntervalMultiplier = Math.ceil(doubleIconSize / pixelSpacingPerInterval)
    }

    const step = minIntervalMultiplier * interval
    if (step <= 0 || !Number.isFinite(step)) continue

    // 1. Get real bounds of event's rule
    const ruleStart = item.repeatRule.startDate !== -Infinity ? Math.max(item.startDays, item.repeatRule.startDate) : item.startDays
    const ruleEnd = item.repeatRule.endDate !== +Infinity ? item.repeatRule.endDate : engine.viewConfig.maxDays

    // 2. Intersect rule bounds strictly with physical screen viewport (+/- 1 step buffer)
    const renderMin = Math.max(ruleStart, visibleMinDays - step)
    const renderMax = Math.min(ruleEnd, visibleMaxDays + step)

    if (renderMin > renderMax) continue

    // 3. Jump directly to the first visible occurrence inside the render window
    const firstStepOffset = Math.ceil((renderMin - ruleStart) / step) * step
    let currentStart = ruleStart + Math.max(step, firstStepOffset)
    let iterations = 0

    // debugger

    while (currentStart <= renderMax && iterations < 100) {
      expanded.push({
        ...item,
        id: item.id,
        startDays: currentStart,
        endDays: item.endDays ? currentStart + duration : currentStart,
        isRecurringInstance: true,
        parentEventId: item.id,
        lane: item.lane // Inherit parent lane directly
      })
      currentStart += step
      iterations++
    }
  }

  return expanded
}

// function expandRecurringEvents(engine: GanttRenderEngine, items: GanttItem[]): GanttItem[] {
//   const doubleIconSize = 2 * engine.plugin.settings.viewEventIconHeight
//   const expanded: GanttItem[] = []
//   // const xPosition0 = engine.getXPosition(0) // 1.old
//
//   // Calculate pixel width per single day directly from zoom factor to avoid pan-offset skew // 1.new
//   const renderWidth = engine.getRenderWidth()
//   const totalDaysSpan = engine.viewConfig.maxDays - engine.viewConfig.minDays
//   if (totalDaysSpan <= 0) return items
//   const pixelsPerDay = (renderWidth / totalDaysSpan) * engine.viewConfig.zoomFactor
//
//   debugger
//
//   for (const item of items) {
//     expanded.push(item) // Always include the base event
//
//     if (!item.repeatRule || item.repeatRule.delta < 1) continue
//
//     const interval = item.repeatRule.delta
//     if (!interval || interval <= 0) continue
//     const duration = item.endDays ? (item.endDays - item.startDays) : 0
//
//     // // Compute minimum multiplier required at current zoom level to avoid overlap // 2.old
//     // let minIntervalMultiplier = 1
//     // while (engine.getXPosition(minIntervalMultiplier * interval) - xPosition0 <= doubleIconSize) {
//     //   minIntervalMultiplier++
//     //   if (minIntervalMultiplier > 1000) break // Guard clause against zero/infinite loop at extreme zoom-out
//     // }
//     // Compute minimum multiplier cleanly in O(1) without iterating // 2.new
//     const pixelSpacingPerInterval = interval * pixelsPerDay
//     let minIntervalMultiplier = 1
//     if (pixelSpacingPerInterval < doubleIconSize && pixelSpacingPerInterval > 0) {
//       minIntervalMultiplier = Math.ceil(doubleIconSize / pixelSpacingPerInterval)
//     }
//
//     // Determine bounds for repetition
//     const step = minIntervalMultiplier * interval
//     if (step <= 0 || !Number.isFinite(step)) continue
//
//     // Compute exact start/end days currently visible on the physical screen
//     const panX = engine.viewConfig.panTranslateX
//     const visibleMinDays = engine.viewConfig.minDays + (-panX / pixelsPerDay)
//     const visibleMaxDays = visibleMinDays + (renderWidth / pixelsPerDay)
//
//     // 1. Get real bounds of event's rule
//     const ruleStart = item.repeatRule.startDate !== -Infinity ? Math.max(item.startDays, item.repeatRule.startDate) : item.startDays
//     const ruleEnd = item.repeatRule.endDate !== +Infinity ? item.repeatRule.endDate : engine.viewConfig.maxDays
//
//     // 2. Intersect rule bounds strictly with the PHYSICAL SCREEN VIEWPORT (+/- 1 step buffer)
//     const renderMin = Math.max(ruleStart, visibleMinDays - step)
//     const renderMax = Math.min(ruleEnd, visibleMaxDays + step)
//
//     if (renderMin > renderMax) continue
//
//     const firstStepOffset = Math.ceil((renderMin - ruleStart) / step) * step
//     let currentStart = ruleStart + Math.max(step, firstStepOffset)
//     let iterations = 0
//
//     while (currentStart <= renderMax && iterations < 100) {
//       // Only create instances within render range (or slightly padded)
//       if (currentStart >= minDays - interval) {
//         expanded.push({
//           ...item,
//           id: item.id, // Keep base ID if elements highlight together, or generate synthetic unique IDs
//           startDays: currentStart,
//           endDays: item.endDays ? currentStart + duration : currentStart,
//           isRecurringInstance: true,
//           parentEventId: item.id
//         })
//       }
//       currentStart += step
//       iterations++
//     }
//   }
//
//   return expanded
// }
