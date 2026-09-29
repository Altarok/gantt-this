import {CalendarConfig, GanttItem, RepeatRule} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {createParsedDate} from '../date-calculations/event-date-input-calc'

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

  let delta: number | 'yearly' | undefined = undefined
  let startDate = -Infinity
  let endDate = +Infinity

  if (isStartDate && input === 'yearly') {
    delta = 'yearly'
  } else if (isStartDate && /^(after|every) [1-9]\d* days/.test(input)) {
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

    const interval = item.repeatRule.delta as number
    if (!interval) continue

    if (typeof interval === 'number') {
      duplicateEventWithNumericDelta(item, expanded, engine, interval, pixelsPerDay, doubleIconSize, visibleMinDays, visibleMaxDays)
    } else if (interval === 'yearly') {
      duplicateEventWithYearlyDelta(item, expanded, engine, visibleMinDays, visibleMaxDays)
    }

  }

  return expanded
}

function duplicateEventWithYearlyDelta(item: GanttItem,
                                       expanded: GanttItem[],
                                       renderEngine: GanttRenderEngine,
                                       visibleMinDays: number,
                                       visibleMaxDays: number): void {
  // TODO here - but only if calendar is year based (type: 'rule-based') AND the date format actually contains years

  if (!item.repeatRule) return // continue loop in calling method

  // 1. Resolve calendar config
  const calendarConfig = renderEngine.plugin.calendarConfigsCache.get(item.calendarType)
  if (calendarConfig?.type !== 'rule-based' || !calendarConfig.ruleBasedDetails) return // continue loop in calling method

  const duration = item.endDays ? (item.endDays - item.startDays) : 0

  // 2. Extract year, month, and day components from item's startDateDisplay
  // Assumes format like "1420-05-12" or custom delimiters
  const dateParts = item.startDateDisplay.split(calendarConfig.delimiter)
  const yearIndex = calendarConfig.ruleBasedDetails.format.indexOf('year')

  if (yearIndex === -1 || dateParts.length < 3) return // continue loop in calling method

  let currentYear = parseInt(dateParts[yearIndex]!, 10)
  if (isNaN(currentYear)) return // continue loop in calling method

  // 3. Iteratively increment year integer forward
  let yearOffset = 1
  let safetyGuard = 0

  while (safetyGuard < 100) {
    safetyGuard++

    // Replace the year part in the date string
    const nextDateParts = [...dateParts]
    nextDateParts[yearIndex] = String(currentYear + yearOffset)
    const nextDateStr = nextDateParts.join(calendarConfig.delimiter)

    // Re-evaluate through your parser engine
    const nextParsedDate = createParsedDate(nextDateStr, calendarConfig)
    if (!nextParsedDate) break

    const nextStartDays = nextParsedDate.days

    // Stop if we have swept past the physical screen viewport or rule limits
    if (nextStartDays > visibleMaxDays || nextStartDays > item.repeatRule.endDate) {
      break
    }

    // Only push if it falls within the visible screen area
    if (nextStartDays >= visibleMinDays && nextStartDays >= item.repeatRule.startDate) {
      expanded.push(createItem(item, nextStartDays, duration))
    }

    yearOffset++
  }
}

function duplicateEventWithNumericDelta(item: GanttItem,
                                        expanded: GanttItem[],
                                        renderEngine: GanttRenderEngine,
                                        interval: number,
                                        pixelsPerDay: number,
                                        doubleIconSize: number,
                                        visibleMinDays: number,
                                        visibleMaxDays: number): void {
  if (!item.repeatRule) return // continue loop in calling method

  const duration = item.endDays ? (item.endDays - item.startDays) : 0

// Compute minimum multiplier cleanly in O(1) without iterating
  const pixelSpacingPerInterval = interval * pixelsPerDay
  let minIntervalMultiplier = 1
  if (pixelSpacingPerInterval < doubleIconSize && pixelSpacingPerInterval > 0) {
    minIntervalMultiplier = Math.ceil(doubleIconSize / pixelSpacingPerInterval)
  }

  const step = minIntervalMultiplier * interval
  if (step <= 0 || !Number.isFinite(step)) return // continue loop in calling method

// 1. Get real bounds of event's rule
  const ruleStart = item.repeatRule.startDate !== -Infinity ? Math.max(item.startDays, item.repeatRule.startDate) : item.startDays
  const ruleEnd = item.repeatRule.endDate !== +Infinity ? item.repeatRule.endDate : renderEngine.viewConfig.maxDays

// 2. Intersect rule bounds strictly with physical screen viewport (+/- 1 step buffer)
  const renderMin = Math.max(ruleStart, visibleMinDays - step)
  const renderMax = Math.min(ruleEnd, visibleMaxDays + step)

  if (renderMin > renderMax) return // continue loop in calling method

// 3. Jump directly to the first visible occurrence inside the render window
  const firstStepOffset = Math.ceil((renderMin - ruleStart) / step) * step
  let currentStart = ruleStart + Math.max(step, firstStepOffset)
  let iterations = 0

  while (currentStart <= renderMax && iterations < 100) {
    expanded.push(createItem(item, currentStart, duration))
    currentStart += step
    iterations++
  }
}

function createItem(item: GanttItem, startDays: number, duration: number) {
  return {
    ...item,
    id: `${item.id}-rep-${startDays}`,
    startDays: startDays,
    endDays: item.endDays ? startDays + duration : startDays,
    isRecurringInstance: true,
    parentEventId: item.id,
    lane: item.lane
  }
}
