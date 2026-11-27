import {TimeOfDayParsed} from '../types/event-types'
import {CalendarConfig} from '../types/calendar-types'

export const Time = {
  toHumanReadableTime
}

function toHumanReadableTime(time: TimeOfDayParsed,
                             calConfig: CalendarConfig,
                             includeNames = false): string | null {
  if (!time.input || time.timeOfDayFractions.length === 0 || !calConfig.timeOfDay) return null /* fast-fail */

  const timeOfDayConfig = calConfig.timeOfDay
  let result: string = time.input

  if (includeNames) time.timeOfDayFractions.forEach((fraction, index) => {

    if (timeOfDayConfig[index]?.names && fraction.denominator === timeOfDayConfig[index]?.names.length) {
      const nameOfUnit = timeOfDayConfig[index]?.unit
      const nameOfCurrentUnit = timeOfDayConfig[index]?.names[fraction.nominator]
      if (nameOfUnit && nameOfCurrentUnit) result += ` in the ${nameOfUnit} of '${nameOfCurrentUnit}'`
    }
  })

  return result
}
