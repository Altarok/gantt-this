import {CalendarConfig, GanttItem, RepeatRule} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {createParsedDate} from '../date-calculations/event-date-input-calc'

// export type RepeatRule = {
//   delta: number
//   startDate?: number
//   endDate?: number
// }

const iconSize = 16 // TODO sync with other 16s
const doubleIconSize = 2 * iconSize

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
    console.info(`input(${input}) --> repeatRule: undefined`)
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

  const repeatRule: RepeatRule = {delta, startDate, endDate}

  console.info(`input(${input}) --> repeatRule: delta(${repeatRule.delta}), startDate(${repeatRule.startDate}), endDate(${repeatRule.endDate})`)

  return repeatRule
}

/**
 * Expand list of actively shown data on chart with repeating events.
 * Method creates duplicates for repeating events.
 *
 * @param engine
 * @param items
 */
function expandRecurringEvents(engine: GanttRenderEngine, items: GanttItem[]): GanttItem[] {
  const expanded: GanttItem[] = []

  debugger

  for (const item of items) {
    expanded.push(item) // Always include the base event

    if (!item.repeatRule) continue

    debugger

    const interval = item.repeatRule.delta
    const duration = item.endDays ? (item.endDays - item.startDays) : 0
    // const isTimestamp = duration === 0

    // Determine bounds for repetition
    const maxLimit = item.repeatRule.endDate ? Math.min(engine.maxDays, item.repeatRule.endDate) : engine.maxDays

    let currentStart = item.startDays + interval

    let minIntervalMultiplier = 1

    const xPosition0 = engine.getXPosition(0)

    for (; ; minIntervalMultiplier++) {
      /*
       * TODO do this after each zoom !! #recurring
       */
      if (engine.getXPosition(minIntervalMultiplier * interval) - xPosition0 > doubleIconSize) {
        break
      }
    }

    while (currentStart <= maxLimit) {
      // Only create instances within render range (or slightly padded)
      if (currentStart >= engine.minDays - interval) {
        expanded.push({
          ...item,
          id: item.id, // Keep base ID if elements highlight together, or generate synthetic unique IDs
          startDays: currentStart,
          endDays: item.endDays ? currentStart + duration : currentStart,
          isRecurringInstance: true,
          parentEventId: item.id
        })
      }
      currentStart += (minIntervalMultiplier * interval)
    }
  }

  return expanded
}
