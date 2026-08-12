import {CalendarConfig} from '../const/types'
import {isCustomLeapYear, isLeapYear} from '../date-calculations/leap-year-calc'

/**
 * Calculates days from 0001-01-01 (Day 1) to Jan 1st of `year`.
 * Handles both positive and negative years correctly.
 */
function getDaysToYearStart(year: number): number {
  const y = year - 1
  return y * 365 + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)
}

function parseDaysToGregorianDateString(days: number, config: CalendarConfig) {
  let remainingDays = days

  let year = Math.floor((remainingDays - 1) / 365.2425 + 1)

  /* Calculate days from Day 1 (0001-01-01) to the start of `year` */
  let totalDaysToYearStart = getDaysToYearStart(year)

  /* Adjust year downward if our estimate overshot */
  while (totalDaysToYearStart >= remainingDays) {
    year--
    totalDaysToYearStart = getDaysToYearStart(year)
  }

  /* Adjust year upward if our estimate undershot */
  while (getDaysToYearStart(year + 1) < remainingDays) {
    year++
    totalDaysToYearStart = getDaysToYearStart(year)
  }

  /* Calculate 1-based day of the year (e.g., Jan 1st is Day 1) */
  remainingDays -= totalDaysToYearStart

  const monthDays = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  let month = 1
  for (const daysInMonth of monthDays) {
    if (remainingDays > daysInMonth) {
      remainingDays -= daysInMonth
      month++
    } else {
      break
    }
  }

  if (month > 12) {
    month -= 12
    year += 1
  }

  const absYear = Math.abs(year)
  const paddedYear = absYear.toString().padStart(4, '0')
  const yearString = year < 0 ? `-${paddedYear}` : paddedYear
  const day = remainingDays
  const suffixRaw = days < 1 ? config.bcSuffix : config.adSuffix
  const suffix = suffixRaw ? ` ${suffixRaw}` : ''

  return `${yearString}${config.delimiter}${month.toString().padStart(2, '0')}${config.delimiter}${day.toString().padStart(2, '0')}${suffix}`
}

function parseDaysToNonGregorianDateString(days: number, config: CalendarConfig) {

  const details = config.ruleBasedDetails
  if (!details) return `Error: No details found for ${config.id}`

  const isLeapLocal = (customYear: number): boolean => {
    if (details.leapYearRule?.ruleType === 'gregorian' && typeof config.epochGregorian === 'object') {
      // Convert custom year back to target Gregorian year based on epoch
      const epochYear = config.epochGregorian.year
      const targetGregorianYear = epochYear + (customYear - 1)
      return isLeapYear(targetGregorianYear)
    }
    return isCustomLeapYear(customYear, details.leapYearRule)
  }

  let remainingDays = days - config.offsetToDayZero
  let year = 1

  /* Fast-forward or rewind large day counts using interval cycles */
  if (details.leapYearRule?.ruleType === 'interval' && details.leapYearRule.intervalYears) {
    const interval = details.leapYearRule.intervalYears
    const extra = details.leapYearRule.extraDays ?? 1

    /* Calculate average days in one full interval cycle (e.g., 4 years) */
    const daysInCycle = (details.daysInStandardYear * interval) + extra

    if (Math.abs(remainingDays) > daysInCycle) {
      const cycles = Math.floor(remainingDays / daysInCycle)
      year += cycles * interval
      remainingDays -= cycles * daysInCycle
    }
  }

  /* Determine the Year (birectional adjustment) */
  if (remainingDays > 0) {
    while (true) {
      /* Calculate the length of the current year being evaluated */
      const isLeap = isLeapLocal(year)
      const daysInYear = details.daysInStandardYear +
        (isLeap ? (details.leapYearRule?.extraDays ?? 1) : 0)

      if (remainingDays > daysInYear) {
        remainingDays -= daysInYear
        year++
      } else {
        break
      }
    }
  } else {
    // For negative days or 0, decrement year until remainingDays fits into positive day-of-year range
    while (remainingDays <= 0) {
      year--
      const isLeap = isLeapLocal(year)
      const daysInYear = details.daysInStandardYear + (isLeap ? (details.leapYearRule?.extraDays ?? 1) : 0)

      remainingDays += daysInYear
    }
  }

  /* At this point, remainingDays represents the day offset inside the current 'year' (1-indexed base).
   If remainingDays was 0 (which shouldn't happen with 1-based days), we default it to 1 */
//  if (remainingDays <= 0) remainingDays = 1

  /* Determine the Month and Day */
  let monthName = ''
  let dayOfPeriod = 1
  const isLeap = isLeapLocal(year)

  if (details.months.length > 0) {
    for (let m = 0; m < details.months.length; m++) {
      const monthDef = details.months[m]
      if (!monthDef) break
      let monthDays = monthDef.days

      /* Apply leap year day adjustments to the matching month/holiday index */
      if (isLeap && details.leapYearRule?.applyToMonthIndex === m) {
        monthDays += (details.leapYearRule.extraDays ?? 1)
      }

      if (remainingDays > monthDays) {
        remainingDays -= monthDays
      } else {
        monthName = monthDef.shortname ?? monthDef.name
        dayOfPeriod = remainingDays
        break
      }
    }
  } else {
    dayOfPeriod = remainingDays
  }

  /* Construct the dynamic string based on details.format */
  const format = details.format || ['year', 'month', 'day']
  const outputParts = format.map(component => {
    if (component === 'year') {
      const absYear = Math.abs(year)
      const paddedYear = absYear.toString().padStart(4, '0')
      return year < 0 ? `-${paddedYear}` : year.toString()
    }
    if (component === 'month') return monthName
    if (component === 'day') return dayOfPeriod.toString()
    return ''
  })

  const suffixRaw = days < 1 ? config.bcSuffix : config.adSuffix
  const suffix = suffixRaw ? ` ${suffixRaw}` : ''

  return outputParts.filter(Boolean).join(config.delimiter) + suffix
}

/* Update the axis label formatter inside the Gantt render engine class */

// called during runtime, to get axis description
export function createAxisDateDescription(days: number, config: CalendarConfig | undefined): string {

  /* Workaround: fall back to default gregorian, but since 1970 */
  if (!config)
    return new Date(days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!

  if (config.type === 'rule-based') {
    if (config.id === 'gregorian') {
      return parseDaysToGregorianDateString(days, config)
    } else {
      return parseDaysToNonGregorianDateString(days, config)
    }
  }

  /* STRATEGY B: Reverse Engine Positional Multipliers (Mayan, etc.) */
  let localDays = days - config.offsetToDayZero

  const stringSegments: string[] = []
  config.positionalUnits?.forEach(unit => {
    const unitCount = Math.floor(localDays / unit.days)
    stringSegments.push(unitCount.toString())
    localDays %= unit.days
  })

  return stringSegments.join(config.delimiter)
}
