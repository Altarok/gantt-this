import {GanttGroup, GroupOrCalendarSettings} from '../const/types'

/**
 * 0 is the highest priority (as in 'first index of an array').<br>
 * Other priorities are consecutive positive integers.
 *
 * @param objects to sort
 */
function sortGroupOrCalendarSettingsByPriority(objects: Record<string, GroupOrCalendarSettings>): [string, GroupOrCalendarSettings][] {
  return Object.entries(objects).sort(([, a], [, b]) => (a.priority ?? Infinity) - (b.priority ?? Infinity))
}

function sortCalendarAxisByPriority(calendars: string[], calendarSettings: Record<string, GroupOrCalendarSettings>): void {
  calendars.sort((a, b) => (calendarSettings[a]?.priority ?? Infinity) - (calendarSettings[b]?.priority ?? Infinity))
}

function sortGroupAxisByPriority(groups: string[], groupSettings: Record<string, GroupOrCalendarSettings>): void {
  groups.sort((a, b) => (groupSettings[a]?.priority ?? Infinity) - (groupSettings[b]?.priority ?? Infinity))
}

function fixGanttGroupPrioritySetupIfBroken(groups: GanttGroup[], groupSettings: Record<string, GroupOrCalendarSettings>): void {

  groups.sort((a, b) => {
    const pa = groupSettings[a.name]?.priority ?? Infinity
    const pb = groupSettings[b.name]?.priority ?? Infinity
    return pa - pb /* a - b -> ASC -- b - a -> DESC */
  })

  let i = 0

  /* Just overwrite values now */
  Object.values(groups).forEach(grp => {
    if (groupSettings[grp.name])
      groupSettings[grp.name]!.priority = i++
  })

}

function fixGroupOrCalendarSettingsPrioritySetupIfBroken(grpOrCals: Record<string, GroupOrCalendarSettings>):
  { min: number, max: number, changed: boolean } {

  let min: number | undefined = undefined
  let max: number | undefined = undefined
  let changed = false
  let count = 0

  const priorities: number[] = []
  let valid = true

  Object.values(grpOrCals).forEach(cal => {
    count++
    if (cal.priority === undefined || cal.priority === null || priorities.contains(cal.priority)) {
      valid = false
    } else {
      priorities.push(cal.priority)
      if (min === undefined || cal.priority < min) min = cal.priority
      if (max === undefined || cal.priority > max) max = cal.priority
    }
  })

  if (!valid || min !== 0 || max !== count - 1) {
    let i = 0
    min = i
    max = i

    /* Just overwrite values now */
    Object.values(grpOrCals).forEach(cal => {
      cal.priority = i
      max = i++
    })

    changed = true
  }

  return {min: min ?? 0, max: max ?? 0, changed}
}


function switchValues(a: GroupOrCalendarSettings, b: GroupOrCalendarSettings): boolean {

  if (a.priority === undefined || b.priority == undefined) return false

  const temp = b.priority
  b.priority = a.priority
  a.priority = temp

  return true
}


export const Priorities = {
  sortGroupOrCalendarSettingsByPriority,

  /* 2x: Sort string arrays */
  sortCalendarAxisByPriority, sortGroupAxisByPriority,

  fixPrioritiesIfNecessary: fixGroupOrCalendarSettingsPrioritySetupIfBroken,
  fixGanttGroupPrioritySetupIfBroken,
  switchValues
}

