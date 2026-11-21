import {PositionalCalendarConfig} from '../types/calendar-types'

export type ColoredDateData = {
  sign: string
  segments: { digit: number, color?: string }[]
}

/**
 * Creates a human-readable formatted date string for positional calendar configs.
 * @param days - Day value in timeline coordinates
 * @param config - Positional calendar configuration
 * @returns Formatted date string, or empty string if no units are defined
 */
export function parseDaysToPositionalDateString(days: number,
                                                config: PositionalCalendarConfig): string {
  const parsed = parsePositionalDateSegments(days, config)
  if (!parsed) return ''

  const formattedSegments = parsed.segments.map(segment => segment.digit.toString())
  return parsed.sign + formattedSegments.join(config.delimiter)
}

export function parseDaysToPositionalDateStringWithColor(days: number,
                                                         config: PositionalCalendarConfig): ColoredDateData | null {
  return parsePositionalDateSegments(days, config)
}

function parsePositionalDateSegments(days: number,
                                     config: PositionalCalendarConfig): ColoredDateData | null {

  const unitsCount = config.positionalUnits.length
  if (unitsCount === 0) return null
  let localDays = days - config.offsetToDayZero

  let sign = ''
  if (localDays < 1) {
    sign = '-'
    localDays = Math.abs(localDays - 1)
  }

  let hideLeadingUnit = config.positionalDetails?.hideLeadingUnits ?? false
  const isOneBased: boolean = config.positionalDetails?.oneBased ?? false /* as opposed to zero-based */
  const segments: { digit: number, color?: string }[] = []

  const unhideThreshold = isOneBased ? 1 : 0

  config.positionalUnits.forEach((unit, index) => {

    const isNotLastUnit = index < unitsCount - 1

    let unitValue = (isOneBased && isNotLastUnit)
      ? Math.floor((localDays - 1) / unit.days)
      : Math.floor(localDays / unit.days)

    localDays -= unitValue * unit.days

    if (isOneBased && isNotLastUnit) unitValue++

    const digit = Math.trunc(Math.abs(unitValue))
    if (!isNotLastUnit || !hideLeadingUnit) {
      segments.push({digit, color: unit.color})
    } else if (digit > unhideThreshold) {
      hideLeadingUnit = false
      segments.push({digit, color: unit.color})
    }
  })

  return {sign, segments}
}
