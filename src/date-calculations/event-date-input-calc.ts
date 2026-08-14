import {CalendarConfig, ParsedDate, RuleBasedDetails} from '../const/types'
import {isCustomLeapYear} from './leap-year-calc'
import {createAxisDateDescription} from '../util/dates'
import {Consts} from '../const/constants'


/**
 * Parse event data to {@link ParsedDate}. Done once per loaded  event, ___not during runtime___.
 */
export function parseEventDate(input?: string, config?: CalendarConfig | null): ParsedDate | null {

  if (!input || !config) return null

  let cleanInput: string // e.g. 2026-08-13
  if (input === 'today') {
    // 1. Calculate today's absolute day count (days since Unix epoch or system epoch)
    const todayEpochDays: number = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) + (config.sharedOffset as number) + Consts.DAYS_FROM_0_12_31_TO_1_1_1970
    // 2. Pass today's day count into your description generator
    cleanInput = createAxisDateDescription(todayEpochDays, config)
  } else {
    cleanInput = input.toString().trim()
  }

  let result: ParsedDate | null = null


  if (config.type === 'positional') {
    result = parseEventDateWithPositionalConfig(cleanInput, config)
  } else if (config.type === 'rule-based') {
    result = parseEventDateWithRuleBasedConfig(cleanInput, config)
  }


  return result
}

/** Parse _positional_ event date. */
function parseEventDateWithPositionalConfig(cleanInput: string, calendarConfig: CalendarConfig): ParsedDate | null {
  if (!cleanInput.includes(calendarConfig.delimiter)) return null

  const segments = cleanInput.split(calendarConfig.delimiter).map(Number)
  let totalDays = 0
  let valid = true

  const units = calendarConfig.positionalUnits ?? []
  if (segments.length === 0 || units.length === 0 || segments.length !== units.length) return null

  units.forEach((unit, idx) => {
    const val = segments[idx]
    if (val !== undefined && !isNaN(val)) {
      totalDays += val * unit.days
    } else if (idx < segments.length) {
      valid = false
    }
  })

  if (!valid || segments.length !== units.length) return null

  return {
    days: calendarConfig.offsetToDayZero + totalDays,
    display: cleanInput
  }
}

/** Parse _rule-based_ event date. */
function parseEventDateWithRuleBasedConfig(input: string, calendarConfig: CalendarConfig): ParsedDate | null {
  const {delimiter, ruleBasedDetails: details} = calendarConfig
  if (!details) return null /* Should not happen, this method handles exactly that */

  /*
   * The delimiter often is '-'. Since this also stands for a negative year value, we need a workaround here.
   */
  let yearMultiplicator = 1
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

  /* Reject invalid input! */
  const isInvalid: boolean = isNaN(year) || isNaN(day) || day < 1 || (typeof monthName === 'number' && monthName < 1)
  if (isInvalid) return null

  /* Calculate days from previous years */
  const daysFromYears = calculateDaysForYears(year - 1, details)
  const isLeap = isCustomLeapYear(year, details.leapYearRule)

  /* Handle Ordinal Dates (No month block in the format) */
  if (!monthName) {
    const maxDays = isLeap ? (details.daysInStandardYear + (details.leapYearRule?.extraDays ?? 1)) : details.daysInStandardYear
    if (day < 1 || day > maxDays) null

    const days = daysFromYears + day + calendarConfig.offsetToDayZero
    return {
      days: days === +0 ? 0 : days,
      display: `${year}${delimiter}${day}`
    }
  }

  /* Handle Standard/Intercalary Month Dates */
  const months = details.months
  const monthIndex = typeof (monthName) === 'number' ? monthName - 1 :
    months.findIndex(m => m.name.toLowerCase() === monthName.toLowerCase() || m.shortname?.toLowerCase() === monthName.toLowerCase())
  if (monthIndex === -1) return null

  let allowedDays = months[monthIndex]!.days
  if (isLeap && details.leapYearRule?.applyToMonthIndex === monthIndex) {
    allowedDays += (details.leapYearRule.extraDays ?? 1)
  }

  if (day < 1 || day > allowedDays) return null

  let daysFromCurrentYearMonths = 0
  for (let i = 0; i < monthIndex; i++) {
    daysFromCurrentYearMonths += months[i]!.days
    if (isLeap && details.leapYearRule?.applyToMonthIndex === i) {
      daysFromCurrentYearMonths += (details.leapYearRule.extraDays ?? 1)
    }
  }

  const monthNameFinal = months[monthIndex]!.shortname ?? months[monthIndex]!.name

  return {
    days: daysFromYears + daysFromCurrentYearMonths + day + calendarConfig.offsetToDayZero,
    display: `${year}${delimiter}${monthNameFinal}${delimiter}${day}`
  }
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
