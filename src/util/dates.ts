import {Notice} from 'obsidian'
import {CalendarConfig, DateFormatComponent, PositionalCalendarConfig, RuleBasedCalendarConfig} from '../const/types'
import {isCustomLeapYear, isGregorianLeapYear} from '../date-calculations/leap-year-calc'
import {Consts} from '../const/constants'
import {GregorianDateFormatter} from "./gregorian-date-formatter";

const TODAY = 'today'
const TODAY_SUFFIX_PATTERN = /^[+-][1-9]\d*$/

export const Dates = {
  TODAY,
  parseDescriptiveDateToValidInput,
  getGregorianTodayInAbsoluteDays
}

function getGregorianTodayInAbsoluteDays(): number {
  return Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + Math.floor(Date.now() / (24 * 60 * 60 * 1000))
}

/**
 * @param input starts with 'TODAY'
 * @param config
 */
function parseDescriptiveDateToValidInput(input: string, config: CalendarConfig) {
  // calculate today absolute day count (since day 0)
  // TODO #errorCache move to error container
  if (!config.today) return `Calendar has no valid today value: ${config.id}`

  let absoluteDay = config.today

  if (input.length > TODAY.length) {
    const suffix = input.slice(TODAY.length).trim()
    if (TODAY_SUFFIX_PATTERN.test(suffix)) absoluteDay += Number(suffix)
    else new Notice(`Failed to parse descriptive date '${input}'.'`)
  }

  // pass calculated day count into description generator
  return createAxisDateDescription(absoluteDay, config, true)
}

/**
 * Calculates days from 0001-01-01 (Day 1) to Jan 1st of `year`.
 * Handles both positive and negative years correctly.
 */
function getDaysToYearStart(year: number): number {
  const y = year - 1
  return y * 365 + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)
}

function parseDaysToGregorianDateString(days: number,
                                        config: RuleBasedCalendarConfig,
                                        asInput: boolean,
                                        tickStepInDays = 0): string {
  const {delimiter, ruleBasedDetails: details} = config
  let remainingDays = days - (config.offsetToDayZero ?? 0)

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

  const monthDays = [31, isGregorianLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  let month = 1
  for (const daysInMonth of monthDays) {
    if (remainingDays > daysInMonth) {
      remainingDays -= daysInMonth
      month++
    } else {
      break
    }
  }

  const monthCount = details.months?.length ?? 12

  if (month > monthCount) {
    month -= monthCount
    year += 1
  }

  const displayedYear = (details.noYearZero === true && year <= 0) ? year - 1 : year
  const absYear = Math.abs(displayedYear)

  // const paddedYear = absYear.toString().padStart(4, '0')
  const formattedYear = GregorianDateFormatter.formatYearValue(absYear)

  const day = remainingDays
  const suffixRaw = days < 1 ? config.bcSuffix : config.adSuffix
  const suffix = suffixRaw ? ` ${suffixRaw}` : ''


  const monthDef = details.months?.[month - 1]
  const monthFinal = monthDef?.shortname ?? monthDef?.name ?? month.toString().padStart(2, '0')
  const dayFinal = day.toString().padStart(2, '0')

  let format: DateFormatComponent[]
  if (asInput)
    format = details.format ?? ['year', 'month', 'day']
  else
    format = (details.outputFormat ?? details.format) ?? ['year', 'month', 'day']

  const hideDays = !asInput && tickStepInDays > 365
  const hideMonths = !asInput && tickStepInDays > 730

  const outputParts: string[] = format.map(component => {
    if (component === 'year') return formattedYear
    if (component === 'month' && !hideMonths) return monthFinal
    if (component === 'day' && !hideDays) return dayFinal
    return ''
  })

  const prefix = displayedYear < 0 ? '-' : ''

  return prefix + outputParts.filter(Boolean).join(delimiter) + suffix
}

function parseDaysToNonGregorianDateString(days: number,
                                           config: RuleBasedCalendarConfig,
                                           asInput: boolean): string {

  const details = config.ruleBasedDetails

  let remainingDays = days - config.offsetToDayZero
  let year = 1

  /* Fast-forward or rewind large day counts using interval cycles */
  if (details.leapYearRule?.ruleType === 'interval' && details.leapYearRule.intervalYears) {
    const interval = details.leapYearRule.intervalYears
    const extra = details.leapYearRule.extraDays ?? 1

    /* Calculate average days in one full interval cycle (e.g., 4 years) */
    const daysInCycle = details.daysInStandardYear * interval + extra

    if (Math.abs(remainingDays) > daysInCycle) {
      const cycles = Math.floor(remainingDays / daysInCycle)
      year += cycles * interval
      remainingDays -= cycles * daysInCycle
    }
  }

  /* Determine the Year (bidirectional adjustment) */
  if (remainingDays > 0) {
    while (true) {
      /* Calculate the length of the current year being evaluated */
      const isLeap = isCustomLeapYear(year, config, true)
      const daysInYear = details.daysInStandardYear + (isLeap ? (details.leapYearRule?.extraDays ?? 1) : 0)

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
      const isLeap = isCustomLeapYear(year, config, true)
      const daysInYear = details.daysInStandardYear + (isLeap ? (details.leapYearRule?.extraDays ?? 1) : 0)
      remainingDays += daysInYear
    }
  }

  /* At this point, remainingDays represents the day offset inside the current 'year' (1-indexed base).
   If remainingDays was 0 (which shouldn't happen with 1-based days), we default it to 1 */
//  if (remainingDays <= 0) remainingDays = 1

  // Resolve displayed year when year zero is absent
  let displayedYear = year
  if (details.noYearZero === true && year <= 0) displayedYear = year - 1

  /* Determine the Month and Day */
  let monthName = ''
  let dayOfPeriod = 1
  const isLeap = isCustomLeapYear(year, config, true)

  if (details.months?.length > 0) {
    for (let m = 0; m < details.months.length; m++) {
      const monthDef = details.months[m]
      if (!monthDef) break
      let monthDays = monthDef.days

      /* Apply leap year day adjustments to the matching month/holiday index */
      if (isLeap && details.leapYearRule?.applyToMonthIndex === m) {
        monthDays += details.leapYearRule.extraDays ?? 1
      }

      if (remainingDays > monthDays) {
        remainingDays -= monthDays
      } else {
        monthName = monthDef.shortname ?? monthDef.name ?? String(m + 1)
        dayOfPeriod = remainingDays
        break
      }
    }
  } else {
    dayOfPeriod = remainingDays
  }

  /* Construct the dynamic string based on details.format */
  let format: DateFormatComponent[]
  if (asInput)
    format = details.format ?? ['year', 'month', 'day']
  else
    format = details.outputFormat ?? details.format ?? ['year', 'month', 'day']

  const outputParts = format.map(component => {
    if (component === 'year') return Math.abs(displayedYear).toString().padStart(4, '0') // USE displayedYear
    if (component === 'month') return monthName
    if (component === 'day') return dayOfPeriod.toString()
    return ''
  })

  const suffixRaw = displayedYear < 0 ? config.bcSuffix : config.adSuffix // USE displayedYear
  const suffix = suffixRaw ? ` ${suffixRaw}` : ''
  const prefix = displayedYear < 0 ? '-' : '' // USE displayedYear

  return prefix + outputParts.filter(Boolean).join(config.delimiter) + suffix
}

function parseDaysToPositionalDateString(days: number,
                                         config: PositionalCalendarConfig): string {
  let localDays = days - config.offsetToDayZero
  const stringSegments: string[] = []
  config.positionalUnits.forEach(unit => {
    const unitCount = Math.floor(localDays / unit.days)
    stringSegments.push(unitCount.toString())
    localDays %= unit.days
  })
  return stringSegments.join(config.delimiter)
}

/* Update the axis label formatter inside the Gantt render engine class */

// called during runtime, to get axis description
export function createAxisDateDescription(days: number,
                                          calendarConfig: CalendarConfig,
                                          asInput = false,
                                          tickStepInDays = 0): string {

  switch (calendarConfig.type) {
    case 'rule-based':
      if (calendarConfig.id === 'gregorian')
        return parseDaysToGregorianDateString(days, calendarConfig as RuleBasedCalendarConfig, asInput, tickStepInDays)
      else
        return parseDaysToNonGregorianDateString(days, calendarConfig as RuleBasedCalendarConfig, asInput)
    case 'positional':
      return parseDaysToPositionalDateString(days, calendarConfig as PositionalCalendarConfig)
    default:
      return 'n/a'
  }
}
