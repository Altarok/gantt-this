import {CalendarConfig, GanttItem, RepeatRule} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {createParsedDate} from "../date-calculations/event-date-input-calc";

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
function createRepeatRule(isStartDate: boolean,
                          input: string,
                          calendarConfig?: CalendarConfig): RepeatRule | undefined {

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
      const startMatch = input.match(/starting from \[([^\]]+)]/)
      if (startMatch) {
        const parsedDate = createParsedDate(startMatch[1]!.trim(), calendarConfig)
        if (parsedDate) startDate = parsedDate.days
      }

      // const startDateRaw = input.replace(/.*starting from \[([^\]]+)].*?/g, '$1').trim()
      // const parsedDate = createParsedDate(startDateRaw, calendarConfig)
      // if (parsedDate) startDate = parsedDate.days
    }

    if (/ending on \[[^\]]+]( |$)/.test(input)) {
      const endMatch = input.match(/ending on \[([^\]]+)]/)
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

  for (const item of items) {
    expanded.push(item) // Always include the base event

    if (!item.repeatRule) continue

    const interval = item.repeatRule.delta
    const duration = item.endDays ? (item.endDays - item.startDays) : 0

    // Determine bounds for repetition
    const maxLimit = item.repeatRule.endDate ? Math.min(engine.maxDays, item.repeatRule.endDate) : engine.maxDays

    let currentStart = item.startDays + interval

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
      currentStart += interval
    }
  }

  return expanded
}
