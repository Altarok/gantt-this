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
      return parseDateWithPositionalConfig(cleanInput, config)
    case 'rule-based':
      return parseDateWithRuleBasedConfig(cleanInput, config)
    default:
      throwGanttError('unknownCalendarType', {type})
  }
}

/**
 * Parse _positional_ event date.
 *
 * @throws GanttError - if date has invalid segment, delimiter, or length
 */
function parseDateWithPositionalConfig(date: string, calendarConfig: PositionalCalendarConfig): ParsedDate {
  const {delimiter} = calendarConfig
  const units = calendarConfig.positionalUnits ?? []
  const hideLeadingUnit = calendarConfig.positionalDetails?.hideLeadingUnits ?? false
  const oneBased = calendarConfig.positionalDetails?.oneBased ?? false
  const emptyValue = oneBased ? '1' : '0'

  /*
   * Split date input, includes; parse 7*5 as seven fives in a row (5.5.5.5.5.5.5)
   *
   * TODO refactor AI-assisted hell of a code snippet
   */
  let segments = date.split(delimiter).map((s) => s.trim()).flatMap((segment: string) => {
    if (!/^(\d+)\*(\d+)$/.test(segment)) return [segment]
    const ms = segment.split('*')
    if (ms.length < 2) return [segment]
    const times = parseInt(ms[0]!, 10)
    if (times < 1 || times > units.length) throwGanttError('positionalDateWithInvalidSegment', {date, segment})
    return new Array<string>(times).fill(ms[1]!)
  })
  /*
   * If date ends on a delimiter, the last part is an empty string.
   * In this case fill it up with default empty values.
   */
  const padTrailing = segments.length > 1 && segments[segments.length - 1] === ''
  if (padTrailing) {
    segments.pop()
    while (segments.length > 0 && segments.length < units.length - 1) segments.push(emptyValue)
    if (segments.length < units.length) segments.push('1')
  }

  if (segments.length === 0 || units.length === 0 || segments.length > units.length)
    throwGanttError('positionalDateWithInvalidLength', {date, unitLength: units.length})

  if (segments.length < units.length) {
    const padding = new Array<string>(units.length - segments.length).fill(emptyValue)
    segments = [...padding, ...segments]
  }

  let totalDays = 0

  for (let i = 0; i < units.length; i++) {
    const segment = segments[i]
    if (!segment || Number.isNaN(Number(segment)))
      throwGanttError('positionalDateWithInvalidSegment', {date, segment: String(segment)})
    let count = Number(segment)
    if (i < units.length - 1 && oneBased) {
      /*
       * Magic here: If 1-based, reduce all numbers (except the last one) by 1 for absolute day calculation
       */
      if (count < 1) throwGanttError('invalid1BasedPositionalDateContainsZero', {date})
      count--
    }
    totalDays += count * units[i]!.days
  }

  let displaySegments = segments
  if (hideLeadingUnit) {
    let start = 0
    while (start < segments.length - 1 && segments[start] === emptyValue) start++
    displaySegments = segments.slice(start)
  }

  return {
    days: calendarConfig.offsetToDayZero + totalDays,
    display: displaySegments.join(delimiter)
  }
}

/**
 * Parse _rule-based_ event date.
 *
 * @throws GanttError - if date has invalid segment, delimiter, or length
 */
function parseDateWithRuleBasedConfig(date: string, calendarConfig: RuleBasedCalendarConfig): ParsedDate {
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
  // debug.log(`date ${date} - parts ${String(parts)}`)

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
