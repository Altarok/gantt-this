import {PositionalCalendarConfig} from '../types/calendar-types'

/**
 * Create human-readable date for positional configs.
 * @param days
 * @param config
 */
export function parseDaysToPositionalDateString(days: number, config: PositionalCalendarConfig): string {

  const unitsCount = config.positionalUnits.length
  if (unitsCount === 0) return ''
  let localDays = days - config.offsetToDayZero

  let sign = ''
  if (localDays < 1) {
    sign = '-'
    localDays = Math.abs(localDays - 1)
  }

  let hideLeadingUnit = config.positionalDetails?.hideLeadingUnits ?? false
  // let hideDigit = hideLeadingUnits
  const isOneBased: boolean = config.positionalDetails?.oneBased ?? false /* as opposed to zero-based */
  const stringSegments: string[] = []

  const unhideTreshold = isOneBased ? 1 : 0

  config.positionalUnits.forEach((unit, index) => {

    const isNotLastUnit = index < unitsCount - 1

    let unitValue = (isOneBased && isNotLastUnit)
      ? Math.floor((localDays - 1) / unit.days)
      : Math.floor(localDays / unit.days)

    localDays -= unitValue * unit.days

    if (isOneBased && isNotLastUnit) unitValue++

    // if (index == 0 && unitValue < 0) sign = '-'
    const digit = Math.trunc(Math.abs(unitValue))
    if (!isNotLastUnit || !hideLeadingUnit) {
      stringSegments.push(digit.toString())
    } else if (hideLeadingUnit) {
      if (digit > unhideTreshold) {
        hideLeadingUnit = false
        stringSegments.push(digit.toString())
      }
    }
  })

  return sign + stringSegments.join(config.delimiter)
}

export type ColoredDateData = {
  sign: string
  segments: { digit: number, color?: string }[]
}

export function parseDaysToPositionalDateString_experimental(
  days: number,
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
  // let hideDigit = hideLeadingUnits
  const isOneBased: boolean = config.positionalDetails?.oneBased ?? false /* as opposed to zero-based */
  const segments: { digit: number, color?: string }[] = []

  const unhideTreshold = isOneBased ? 1 : 0

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
    } else if (hideLeadingUnit) {
      if (digit > unhideTreshold) {
        hideLeadingUnit = false
        segments.push({digit, color: unit.color})
      }
    }
  })

  return {sign, segments}
}
