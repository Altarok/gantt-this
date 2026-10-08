// import {Notice} from 'obsidian'
import {CalendarConfig, DateFormatComponent, PositionalCalendarConfig, RuleBasedCalendarConfig} from '../const/types'
import {isCustomLeapYear, isGregorianLeapYear} from '../date-calculations/leap-year-calc'
import {Consts} from '../const/constants'

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
    // else TODO #errorCache new Notice(`Failed to parse descriptive date '${input}'.'`)
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
                                        hideDays = false,
                                        hideMonths = false): string {
  const details = config.ruleBasedDetails
  let remainingDays = days - config.offsetToDayZero

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
    } else break
  }

  const monthCount = details.months?.length ?? 12

  if (month > monthCount) {
    month -= monthCount
    year += 1
  }

  let monthFinal: string | undefined
  let dayFinal: number | undefined

  if (!hideMonths) {
    const monthDef = details.months?.[month - 1]
    monthFinal = monthDef?.shortname ?? monthDef?.name ?? month.toString().padStart(2, '0')
    if (!hideDays) dayFinal = remainingDays
  }

  return mergeOutputFormatDateElements(days, asInput, hideMonths, hideDays, config, year, monthFinal, dayFinal)
}

function parseDaysToNonGregorianDateString(days: number,
                                           config: RuleBasedCalendarConfig,
                                           asInput: boolean,
                                           hideDays = false,
                                           hideMonths = false): string {

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

  /* Determine the Month and Day */
  let monthFinal: string | undefined
  let dayFinal: number | undefined

  if (!hideMonths) {
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
          monthFinal = monthDef.shortname ?? monthDef.name ?? String(m + 1).padStart(2, '0')
          if (!hideDays) dayFinal = remainingDays
          break
        }
      }
    } else {
      if (!hideDays) dayFinal = remainingDays
    }
  }


  return mergeOutputFormatDateElements(days, asInput, hideMonths, hideDays, config, year, monthFinal, dayFinal)
}

function parseDaysToPositionalDateString(days: number, config: PositionalCalendarConfig): string {
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
                                          asInput = false, hideDays = false, hideMonths = false): string {

  switch (calendarConfig.type) {
    case 'rule-based':
      if (calendarConfig.id === 'gregorian')
        return parseDaysToGregorianDateString(days, calendarConfig, asInput, hideDays, hideMonths)
      else
        return parseDaysToNonGregorianDateString(days, calendarConfig, asInput, hideDays, hideMonths)
    case 'positional':
      return parseDaysToPositionalDateString(days, calendarConfig)
    default:
      return 'n/a'
  }
}

/**
 * Helper to format large year numbers with commas or dynamic compact units (M/B).
 */
function formatYearValue(year: number): string {
  const absYear = Math.abs(year)

  if (absYear >= 1_000_000_000) return `${(absYear / 1_000_000_000).toFixed(1)}B`
  if (absYear >= 1_000_000) return `${(absYear / 1_000_000).toFixed(1)}M`
  if (absYear >= 100_000) return `${(absYear / 1_000).toFixed(1)}K`
  if (absYear >= 10_000) return absYear.toLocaleString('en-US')
  return absYear.toString().padStart(4, '0')
}

/** Construct date based on calConfig.ruleBasedDetails.format */
function mergeOutputFormatDateElements(absDays: number, asInput: boolean, hideMonths: boolean,
                                       hideDays: boolean,
                                       calConfig: RuleBasedCalendarConfig,
                                       year: number, month?: string, day?: number) {

  const format: DateFormatComponent[] = asInput ? calConfig.ruleBasedDetails.format : calConfig.ruleBasedDetails.outputFormat
  const displayedYear = shiftYearIfNeeded(year, calConfig.ruleBasedDetails.noYearZero)

  const outputParts: string[] = format.map(component => {
    if (component === 'year') return formatYearValue(displayedYear)
    if (component === 'month' && (asInput || !hideMonths)) return month ?? ''
    if (component === 'day' && (asInput || !hideDays)) return day?.toString().padStart(2, '0') ?? ''
    return ''

  })

  const prefix = displayedYear < 0 ? '-' : ''

  return prefix + outputParts.filter(Boolean).join(calConfig.delimiter)
    + getEpochSuffix(absDays, calConfig)
}

function shiftYearIfNeeded(year: number, noYearZero: boolean | undefined) {
  return (noYearZero === true && year <= 0) ? year - 1 : year
}

function getEpochSuffix(days: number, config: RuleBasedCalendarConfig) {
  const suffixRaw = days < 1 ? config.bcSuffix : config.adSuffix
  return suffixRaw ? ` ${suffixRaw}` : ''
}

