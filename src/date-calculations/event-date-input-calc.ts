import {ParsedDate, RepeatRule} from '../types/settings-types'
import {
  CalendarConfig,
  PositionalCalendarConfig,
  RuleBasedCalendarConfig,
  RuleBasedDetails
} from '../types/calendar-types'
import {isCustomLeapYear} from './leap-year-calc'
import {parseDescriptiveDateToValidInput, TODAY} from './dates'
import {createRepeatRule} from '../util/recurring-events'
import {throwGanttError} from '../model/gantt-error'

/**
 * Parse event data to {@link ParsedDate}.
 * Done once per loaded  event, ___not during runtime___.
 *
 * @throws GanttError on fail - 3/3 checked!
 */
export function parseEventDate(doCheckForRepetitions: boolean,
                               isStartDate: boolean,
                               date: string,
                               config?: CalendarConfig | null): ParsedDate {
  if (!date) throwGanttError('unparseableDate', {date})
  if (!config) throwGanttError('missingCalConfigForDate', {date})

  let repeatRule: RepeatRule | undefined

  if (doCheckForRepetitions && date.includes(' repeat ')) {
    const parts = date.split(' repeat ')
    date = parts[0] ?? ''
    const suffix = parts[1] ?? ''
    if (suffix) repeatRule = createRepeatRule(isStartDate, suffix.trim(), config)
  }

  let cleanInput: string = date.startsWith(TODAY) ? parseDescriptiveDateToValidInput(date.trim(), config) : date.trim()

  const parsedDate = createParsedDate(cleanInput, config)

  if (parsedDate) parsedDate.repeatRule = repeatRule

  return parsedDate
}

/**
 * User
 * - parseEventDate (see above) - OK
 *
 * @throws GanttError on fail - 4/4 checked
 */
export function createParsedDate(cleanInput: string, config: CalendarConfig): ParsedDate {
  const {type} = config
  switch (type) {
    case 'positional':
      return parseEventDateWithPositionalConfig(cleanInput, config)
    case 'rule-based':
      return parseEventDateWithRuleBasedConfig(cleanInput, config)
    default:
      throwGanttError('unknownCalendarType', {type})
  }
}

/**
 * Parse _positional_ event date.
 *
 * @throws GanttError - if date has invalid segment, delimiter, or length
 */
function parseEventDateWithPositionalConfig(date: string, calendarConfig: PositionalCalendarConfig): ParsedDate {
  if (!date.includes(calendarConfig.delimiter))
    throwGanttError('positionalDateWithoutDelimiter', {date, delimiter: calendarConfig.delimiter})

  const segments: string[] = date.split(calendarConfig.delimiter)
  let totalDays = 0

  const units = calendarConfig.positionalUnits ?? []
  if (segments.length === 0 || units.length === 0 || segments.length !== units.length)
    throwGanttError('positionalDateWithInvalidLength', {date, unitLength: units.length})


  for (let idx = 0; idx < units.length; idx++) {
    const segment = segments[idx]
    if (!segment || Number.isNaN(Number(segment)))
      throwGanttError('positionalDateWithInvalidSegment', {date, segment: String(segment)})
    totalDays += Number(segment) * units[idx]!.days
  }

  return {days: calendarConfig.offsetToDayZero + totalDays, display: date}
}

/**
 * Parse _rule-based_ event date.
 *
 * @throws GanttError - if date has invalid segment, delimiter, or length
 */
function parseEventDateWithRuleBasedConfig(date: string, calendarConfig: RuleBasedCalendarConfig): ParsedDate {
  const {delimiter, ruleBasedDetails: details} = calendarConfig
  if (!details) throwGanttError('ruleBasedCalendarMissingDetails', {id: calendarConfig.id}) /* Should not happen, this method handles exactly that */

  /*
   * The delimiter often is '-'. Since this also stands for a negative year value, we need a workaround here.
   */
  let yearMultiplicator = 1
  let input = date
  if (delimiter === '-' && input.startsWith(delimiter)) {
    input = input.slice(1)
    yearMultiplicator = -1
  }

  const parts = input.split(delimiter).map(p => p.trim())
  const format = details.format

  /* Ensure the input has exactly the number of blocks expected by this calendar */
  // if (parts.length !== format.length) return null

  /* Dynamically extract values based on the configuration format mapping */
  let year = 1
  let day = 1
  let monthName: string | number | null = null

  for (let i = 0; i < format.length; i++) {
    const componentType = format[i]
    const partValue = parts[i]

    if (!partValue) break

    if (componentType === 'year') {
      year = parseInt(partValue, 10) * yearMultiplicator
    } else if (componentType === 'day') {
      day = parseInt(partValue, 10)
    } else if (componentType === 'month') {
      monthName = /^\d+$/.exec(partValue) ? parseInt(partValue, 10) : partValue
    }
  }

  const noYearZero = calendarConfig.ruleBasedDetails?.noYearZero
  if (noYearZero === true) {
    if (year === 0) throwGanttError('illegalYear0InNoY0Cal', {date})
    if (year < 0) year = year + 1
  }

  /* Reject invalid input! */
  if (day < 1) throwGanttError('illegalNegativeDay', {date})
  const isInvalid: boolean = isNaN(year) || isNaN(day) || (typeof monthName === 'number' && monthName < 1)
  if (isInvalid) throwGanttError('illegalDateOutOfBounds', {date})

  /* Calculate days from previous years */
  const daysFromYears = calculateDaysForYears(year - 1, details)
  const isLeap = isCustomLeapYear(year, calendarConfig, true)

  /* Handle Ordinal Dates (No month block in the format) */
  if (!monthName) {
    const maxDays = isLeap ? (details.daysInStandardYear + (details.leapYearRule?.extraDays ?? 1)) : details.daysInStandardYear
    if (day < 1 || day > maxDays) throwGanttError('illegalDay4Year', {date, day, year})

    const days = daysFromYears + day + calendarConfig.offsetToDayZero
    return {days, display: `${year}${delimiter}${day}`}
  }

  /* Handle Standard/Intercalary Month Dates */
  const months = details.months

  const searchMonth = typeof monthName === 'string' ? monthName.toLowerCase() : ''
  const monthIndex = typeof monthName === 'number' ? monthName - 1 :
    months.findIndex(m => m.name?.toLowerCase() === searchMonth || m.shortname?.toLowerCase() === searchMonth)
  if (monthIndex === -1) throwGanttError('illegalNegativeMonth', {date})
  if (monthIndex >= months.length) throwGanttError('illegalMonth4Year', {date, month: (monthIndex + 1), year})

  let allowedDays = months[monthIndex]!.days
  if (isLeap && details.leapYearRule?.applyToMonthIndex === monthIndex) {
    allowedDays += (details.leapYearRule.extraDays ?? 1)
  }

  const monthNameFinal = months[monthIndex]!.shortname ?? months[monthIndex]!.name ?? String(monthIndex + 1)
  if (day < 1 || day > allowedDays) throwGanttError('illegalDay4Month', {date, day, month: monthNameFinal})

  let daysFromCurrentYearMonths = 0
  for (let i = 0; i < monthIndex; i++) {
    daysFromCurrentYearMonths += months[i]!.days
    if (isLeap && details.leapYearRule?.applyToMonthIndex === i) {
      daysFromCurrentYearMonths += (details.leapYearRule.extraDays ?? 1)
    }
  }

  const days = daysFromYears + daysFromCurrentYearMonths + day + calendarConfig.offsetToDayZero

  return {days, display: `${year}${delimiter}${monthNameFinal}${delimiter}${day}`}
}

function calculateDaysForYears(upToYear: number, details: RuleBasedDetails): number {
  const {leapYearRule, daysInStandardYear} = details
  let totalDays = upToYear * daysInStandardYear

  if (leapYearRule) {
    if (leapYearRule.ruleType === 'interval' && leapYearRule.intervalYears) {
      totalDays += Math.floor(upToYear / leapYearRule.intervalYears) * (leapYearRule.extraDays ?? 1)
    } else if (leapYearRule.ruleType === 'gregorian') {
      totalDays += Math.floor(upToYear / 4) - Math.floor(upToYear / 100) + Math.floor(upToYear / 400)
    }
  }

  return totalDays
}
