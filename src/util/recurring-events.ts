import {CalendarConfig, GanttItem, RepeatRule, RuleBasedCalendarConfig, Step} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {createParsedDate} from '../date-calculations/event-date-input-calc'

export const Recurring = {
  createRepeatRule,
  expandRecurringEvents
}

function toStep(input: string | undefined): Step | null {
  if (input === 'days' || input === 'day') return 'day'
  else if (input === 'years' || input === 'year') return 'year'
  else return null
}

/** Parse input like /^after 1-9\d* (days|years)$/ */
function parseFirstPart(input?: string): { delta: number, step: Step } | null {
  if (!input)
    return null
  else if (input === 'yearly')
    return {delta: 1, step: 'year'}
  else if (input === 'daily')
    return {delta: 1, step: 'day'}

  const parts: string[] = input.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return null

  if (parts[0] === 'after' || parts[0] === 'every') {
    const rawNum = Number(parts[1])
    if (!Number.isNaN(rawNum) && Number.isFinite(rawNum)) {
      const delta = Math.round(rawNum)
      const step = toStep(parts[2])
      if (delta > 0 && step) {
        return {delta, step}
      }
    }
  }

  return null
}

/**
 * Interpret input-date suffix to make its event repeat itself.
 *
 * @param isStartDate - decide which suffixes to check
 * @param input - suffix of a date, what came after `' repeat '`
 * @param calendarConfig
 */
function createRepeatRule(isStartDate: boolean, input: string, calendarConfig: CalendarConfig): RepeatRule | undefined {

  const parts: string[] = input.split(',').map(x => x.trim()).filter(Boolean)

  if (parts.length === 0) return undefined

  let delta: number
  let step: Step
  let startDay = -Infinity
  let endDay = +Infinity

  const parsedFirstPart = parseFirstPart(parts[0])
  if (parsedFirstPart) {
    delta = parsedFirstPart.delta
    step = parsedFirstPart.step
  } else return undefined /* First part is mandatory */

  if (parts[1] && calendarConfig) {

    // if (/starting from \[[^\]]+]( |$)/.test(input)) {
    // const startMatch = /starting from \[([^\]]+)]/.exec(input)
    // if (startMatch) {
    //   const parsedDate = createParsedDate(startMatch[1]!.trim(), calendarConfig)
    //   if (parsedDate) startDay = parsedDate.days
    // }
    //
    // const startDateRaw = input.replace(/.*starting from \[([^\]]+)].*?/g, '$1').trim()
    // const parsedDate = createParsedDate(startDateRaw, calendarConfig)
    // if (parsedDate) startDay = parsedDate.days
    // }

    // if (/ending on \[[^\]]+]( |$)/.test(input)) {
    const endMatch = /until (.+)/.exec(parts[1])
    if (endMatch) {
      const cleanDate = endMatch[1]!.trim()
      const parsedDate = createParsedDate(cleanDate, calendarConfig)
      if (parsedDate) endDay = parsedDate.days
    }

    // const endDateRaw = input.replace(/.*ending on \[([^\]]+)].*/g, '$1').trim()
    // const parsedDate = createParsedDate(endDateRaw, calendarConfig)
    // if (parsedDate) endDate = parsedDate.days
    // }
  }

  if (delta && step) return {delta, step, startDay, endDay}
  else return undefined
}

/**
 * Expand list of actively shown data on chart with repeating events.
 * Method creates duplicates for repeating events.
 *
 * @param engine
 * @param items
 * @param renderWidth
 */
function expandRecurringEvents(engine: GanttRenderEngine, items: GanttItem[], renderWidth: number): GanttItem[] {
  const doubleIconSize = 2 * engine.plugin.settings.viewEventIconHeight
  const expanded: GanttItem[] = []

  const totalDaysSpan = engine.viewModel.totalDaysSpan
  if (totalDaysSpan <= 0) return items

  const pixelsPerDay = (renderWidth / totalDaysSpan) * engine.viewModel.zoomFactor
  if (pixelsPerDay <= 0) return items

  // Compute exact start/end days currently visible on the physical screen
  const panX = engine.viewModel.panTranslateX
  const visibleMinDays = engine.viewModel.minDays + (-panX / pixelsPerDay)
  const visibleMaxDays = visibleMinDays + (renderWidth / pixelsPerDay)

  for (const item of items) {
    expanded.push(item) // Always include the base event

    if (!item.repeatRule?.delta) continue

    if (item.repeatRule.step === 'day') {
      duplicateEventWithDayDelta(item, expanded, engine, pixelsPerDay, doubleIconSize, visibleMinDays, visibleMaxDays)
    } else if (item.repeatRule.step === 'year') {
      duplicateEventWithYearDelta(item, expanded, engine, pixelsPerDay, doubleIconSize, visibleMinDays, visibleMaxDays)
    }

  }

  return expanded
}

function duplicateEventWithYearDelta(item: GanttItem,
                                     expanded: GanttItem[],
                                     renderEngine: GanttRenderEngine,
                                     pixelsPerDay: number,
                                     doubleIconSize: number,
                                     visibleMinDays: number,
                                     visibleMaxDays: number): void {
  if (!item.repeatRule) return // continue loop in calling method
  const {delta} = item.repeatRule

  // 1. Resolve calendar config
  const calConfig = renderEngine.plugin.calendarConfigsCache.get(item.calendarType)
  if (calConfig?.type !== 'rule-based') return
  const calendarConfig = calConfig as RuleBasedCalendarConfig
  if (!calendarConfig.ruleBasedDetails) return // continue loop in calling method

  const duration = item.endDays ? (item.endDays - item.startDays) : 0

  /* Extract  date parts components from item's start date */
  const startDate: string = item.startDateDisplay.trim()
  let dateParts: string[]
  if (calendarConfig.delimiter === '-' && startDate.startsWith('-')) {
    /*
     * Special handling for negative years using minus as date part separator.
     * Overly complicated regex used to comply with pre 16.4 iOS devices.
     */
    dateParts = startDate.match(/^-?\w+|\w+/g) ?? []
  } else {
    dateParts = startDate.split(calendarConfig.delimiter)
  }

  const yearIndex = calendarConfig.ruleBasedDetails.format.indexOf('year')

  if (yearIndex === -1 /* || dateParts.length < 3 */) return // continue loop in calling method

  let currentYear = parseInt(dateParts[yearIndex]!, 10)
  if (isNaN(currentYear)) return // continue loop in calling method


  // 3. Compute minimum year multiplier to prevent icon overlapping on screen
  // Assume an average year length to estimate pixel spacing per interval
  const approxDaysPerYear = 365
  const pixelSpacingPerInterval = delta * approxDaysPerYear * pixelsPerDay
  let minIntervalMultiplier = 1

  if (pixelSpacingPerInterval < doubleIconSize && pixelSpacingPerInterval > 0) {
    minIntervalMultiplier = Math.ceil(doubleIconSize / pixelSpacingPerInterval)
  }

  const effectiveDelta = delta * minIntervalMultiplier
  if (effectiveDelta <= 0 || !Number.isFinite(effectiveDelta)) return

  /* Calculate starting year offset. Jump closer to the visible window to minimize unnecessary iterations */
  let yearOffset = effectiveDelta
  if (item.startDays < visibleMinDays) {
    const estimatedYearSpan = Math.max(0, (visibleMinDays - item.startDays) / approxDaysPerYear)
    const estimatedSteps = Math.floor(estimatedYearSpan / effectiveDelta)
    if (estimatedSteps > 0) {
      yearOffset = estimatedSteps * effectiveDelta
    }
  }

  // 5. Iteratively increment year integer forward
  let safetyGuard = 0

  while (safetyGuard < 100) { // minimal distance of double icon make the real maximum circa 32
    safetyGuard++

    // Replace the year part in the date string
    const nextDateParts = [...dateParts]
    nextDateParts[yearIndex] = String(currentYear + (yearOffset))
    const nextDateStr = nextDateParts.join(calendarConfig.delimiter)

    // Re-evaluate through your parser engine
    const nextParsedDate = createParsedDate(nextDateStr, calendarConfig)
    if (!nextParsedDate) break

    const nextStartDays = nextParsedDate.days

    // Stop if we have swept past the physical screen viewport or rule limits
    if (nextStartDays > visibleMaxDays || nextStartDays > item.repeatRule.endDay) {
      break
    }

    // Only push if it falls within the visible screen area
    if (nextStartDays >= visibleMinDays && nextStartDays >= item.repeatRule.startDay) {
      expanded.push(createItem(item, nextStartDays, duration))
    }

    yearOffset += effectiveDelta // delta
  }
}

function duplicateEventWithDayDelta(item: GanttItem,
                                    expanded: GanttItem[],
                                    renderEngine: GanttRenderEngine,
                                    pixelsPerDay: number,
                                    doubleIconSize: number,
                                    visibleMinDays: number,
                                    visibleMaxDays: number): void {
  if (!item.repeatRule) return // continue loop in calling method
  const {delta} = item.repeatRule

  const duration = item.endDays ? (item.endDays - item.startDays) : 0

  // Compute minimum multiplier cleanly in O(1) without iterating
  const pixelSpacingPerInterval = delta * pixelsPerDay
  let minIntervalMultiplier = 1
  if (pixelSpacingPerInterval < doubleIconSize && pixelSpacingPerInterval > 0) {
    minIntervalMultiplier = Math.ceil(doubleIconSize / pixelSpacingPerInterval)
  }

  const step = minIntervalMultiplier * delta
  if (step <= 0 || !Number.isFinite(step)) return // continue loop in calling method

  // 1. Get real bounds of event's rule
  const ruleStart = item.repeatRule.startDay !== -Infinity ? Math.max(item.startDays, item.repeatRule.startDay) : item.startDays
  const ruleEnd = item.repeatRule.endDay !== +Infinity ? item.repeatRule.endDay : renderEngine.viewModel.maxDays

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

function createItem(item: GanttItem,
                    startDays: number,
                    duration: number): GanttItem {
  return {
    ...item,
    id: `${item.id}-rep-${startDays}`,
    startDays,
    endDays: item.endDays ? startDays + duration : startDays,
    isRecurringInstance: true,
    parentEventId: item.id,
    lane: item.lane
  }
}
