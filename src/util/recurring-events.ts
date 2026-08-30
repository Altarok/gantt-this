import {GanttItem, RepeatRule} from '../const/types'
import {GanttRenderEngine} from "../view/svg-drawer";

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
 * @param input suffix of a date, what came after `' repeat '`
 */
function createRepeatRule(input: string): RepeatRule | undefined {

  let repeatRule: RepeatRule | undefined = undefined

  if (/^every \d+ days$/.test(input)) {
    const value = input.replace(/every|days| /g, '')
    repeatRule = {delta: Number(value)}
  }

  if (repeatRule)
    console.info(`input(${input}) --> repeatRule: delta(${repeatRule.delta}), startDate(${repeatRule.startDate}), endDate(${repeatRule.endDate})`)
  else
    console.info(`input(${input}) --> repeatRule: undefined`)

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

    if (!item.repeatEveryDays || item.repeatEveryDays <= 0) continue


    const interval = item.repeatEveryDays
    const duration = item.endDays ? (item.endDays - item.startDays) : 0

    // Determine bounds for repetition
    const maxLimit = item.repeatUntilDays ? Math.min(engine.maxDays, item.repeatUntilDays) : engine.maxDays

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
