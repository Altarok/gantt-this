import {PositionalCalendarConfig} from '../types/calendar-types'

/**
 * Create human-readable date for positional configs.
 * @param days
 * @param config
 */
export function parseDaysToPositionalDateString(days: number, config: PositionalCalendarConfig): string {

  const units = config.positionalUnits.length
  if (units === 0) return ''
  let localDays = days - config.offsetToDayZero


  let sign = ''
  if (localDays < 1) {
    sign = '-'
    localDays = Math.abs(localDays - 1)
  }
  
  const isOneBased: boolean = config.positionalDetails?.oneBased ?? false // as opposed to zero-based
  const stringSegments: string[] = []

  config.positionalUnits.forEach((unit, index) => {

    let unitCount = (isOneBased && index < units - 1)
      ? Math.floor((localDays - 1) / unit.days)
      : Math.floor(localDays / unit.days)

    localDays -= unitCount * unit.days

    if (isOneBased && index < units - 1) unitCount++

    // if (index == 0 && unitCount < 0) sign = '-'
    stringSegments.push(Math.trunc(Math.abs(unitCount)).toString())
    // %= unit.days
  })

  return sign + stringSegments.join(config.delimiter)
}
