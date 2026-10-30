import {SettingsContext} from 'model/settings-context'
import {GroupOrCalendarSettings} from '../types/settings-types'
import {CalendarColor, CalendarColors, CalendarConfig} from '../types/calendar-types'
import {debug} from './debug'

export function isValidColor(c?: string): c is string {
  return !!c && (c === 'none' || CSS.supports('color', c))
}

// TODO write tests for this
export function getCalendarColors(settings: SettingsContext,
                                  calendarConfig: CalendarConfig,
                                  config?: GroupOrCalendarSettings): CalendarColors {
  let axis: CalendarColor = (settings.colorCodeCalendarAxes ? config?.color : null) ?? 'currentColor'
  let ticks: CalendarColor = 'currentColor'
  let dates: CalendarColor = 'currentColor'

  const {colors} = calendarConfig

  if (colors) {
    if (typeof colors === 'string') {
      if (colors === 'none' || CSS.supports('color', colors)) {
        axis = colors
        ticks = colors
        dates = colors
      }
    } else if (typeof colors === 'object') {
      if (isValidColor(colors.axis)) axis = colors.axis
      if (isValidColor(colors.dates)) {
        ticks = colors.dates
        dates = colors.dates
      }
      if (isValidColor(colors.ticks)) ticks = colors.ticks
    }
  }

  const ret: CalendarColors = {axis, ticks, dates}
  debug.info(`CalendarColors (id ${calendarConfig.id}): ${JSON.stringify(ret)}`)
  return ret
}
