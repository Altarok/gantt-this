import {CalendarConfig, DateFormatComponent, RuleBasedCalendarConfig} from '../types/calendar-types'
import {isCustomLeapYear, isGregorianLeapYear} from './leap-year-calc'
import {Consts} from '../const/constants'
import {throwGanttError} from '../model/gantt-error'
import {parseDaysToPositionalDateString} from './positional-dates'
import {shortenLargeNumber} from '../util/mathe'

export const TODAY = 'today'
const TODAY_SUFFIX_PATTERN = /^[+-][1-9]\d*$/

export function getGregorianTodayInAbsoluteDays(): number {
  return Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + Math.floor(Date.now() / (24 * 60 * 60 * 1000))
}

/**
 * Calculate 'today' as absolute integer value (days since DayZero)
 * @param date trimmed input, starts with 'TODAY'
 * @param config
 */
export function parseDescriptiveDateToValidInput(date: string, config: CalendarConfig): string {
  if (!config.today) throwGanttError('missingTodayDate', {date, id: config.id})

  let absoluteDay = config.today

  if (date.trim().length > TODAY.length) {
    const suffix = date.slice(TODAY.length).trim()
    if (TODAY_SUFFIX_PATTERN.test(suffix)) absoluteDay += Number(suffix)
    else throwGanttError('invalidFormatTodayDate', {date})
  }

  /* pass calculated day count into description generator */
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
                                        hideMonths = false,
                                        forTooltip = false): string {
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

  return mergeOutputFormatDateElements(days, asInput, hideMonths, hideDays, config, year, monthFinal, dayFinal, forTooltip)
}

function parseDaysToNonGregorianDateString(days: number,
                                           config: RuleBasedCalendarConfig,
                                           asInput: boolean,
                                           hideDays = false,
                                           hideMonths = false,
                                           forTooltip = false): string {

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
    /* For negative days or 0, decrement year until remainingDays fits into positive day-of-year range */
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

    if (details.months && details.months.length > 0) {
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

  return mergeOutputFormatDateElements(days, asInput, hideMonths, hideDays, config, year, monthFinal, dayFinal, forTooltip)
}

/* Update the axis label formatter inside the Gantt render engine class */

/* called during runtime, to get axis description */
export function createAxisDateDescription(days: number,
                                          calendarConfig: CalendarConfig,
                                          asInput = false,
                                          hideDays = false,
                                          hideMonths = false,
                                          forTooltip = false): string {

  switch (calendarConfig.type) {
    case 'rule-based':
      if (calendarConfig.id === 'gregorian')
        return parseDaysToGregorianDateString(days, calendarConfig, asInput, hideDays, hideMonths, forTooltip)
      else
        return parseDaysToNonGregorianDateString(days, calendarConfig, asInput, hideDays, hideMonths, forTooltip)
    case 'positional':
      return parseDaysToPositionalDateString(days, calendarConfig, forTooltip)
    default:
      return 'n/a'
  }
}

/** Construct date based on calConfig.ruleBasedDetails.format */
function mergeOutputFormatDateElements(absDays: number, asInput: boolean, hideMonths: boolean,
                                       hideDays: boolean,
                                       calConfig: RuleBasedCalendarConfig,
                                       year: number, month?: string, day?: number, forTooltip?: boolean) {

  const format: DateFormatComponent[] = asInput ? calConfig.ruleBasedDetails.format : calConfig.ruleBasedDetails.outputFormat
  const displayedYear: { year: number, sign: '-' | '' } = shiftYearIfNeeded(year, calConfig.ruleBasedDetails.noYearZero)

  let weekdayStr: string | undefined = undefined
  if (!hideDays && calConfig.weekdays) {
    const totalDays = absDays - calConfig.offsetToDayZero - calConfig.weekdays?.offset - 1 /* -1 for human to array shift */
    const dayCount = calConfig.weekdays.dayCount
    const dayIndex = ((totalDays % dayCount) + dayCount) % dayCount
    const weekday = calConfig.weekdays?.days[dayIndex]
    weekdayStr = forTooltip ? weekday?.name : (weekday?.short ?? weekday?.name)
  }


  const outputParts: string[] = format.map(component => {
    if (component === 'year') return shortenLargeNumber(displayedYear.year)
    if (component === 'month' && (asInput || !hideMonths)) return month ?? ''
    if (component === 'day' && (asInput || !hideDays)) return day?.toString().padStart(2, '0') ?? ''
    return ''
  })

  const epochSuffix = getEpochSuffix(absDays, calConfig)
  const dayPrefix = weekdayStr ? `${weekdayStr}, ` : ''
  return dayPrefix
    + (!epochSuffix ? displayedYear.sign : '')
    + outputParts.filter(Boolean).join(calConfig.delimiter)
    + epochSuffix
}

function shiftYearIfNeeded(yearValue: number, noYearZero: boolean | undefined): { year: number, sign: '-' | '' } {
  const y = (noYearZero === true && yearValue <= 0) ? yearValue - 1 : yearValue
  return {year: Math.abs(y), sign: y < 0 ? '-' : ''}
}

function getEpochSuffix(days: number, config: RuleBasedCalendarConfig) {
  const suffixRaw = days < 1 ? config.bcSuffix : config.adSuffix
  return suffixRaw ? ` ${suffixRaw}` : ''
}

