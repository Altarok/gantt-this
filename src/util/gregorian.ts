import {CalendarConfig, LeapYearRule} from '../const/types'
import {RuleBasedCalendarParser} from "./rule-based-calendar-parser";

// const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

function isCustomLeapYear(year: number, rule: LeapYearRule): boolean {
  if (rule.ruleType === 'none') return false
  if (rule.ruleType === 'interval' && rule.intervalYears) return year % rule.intervalYears === 0
  if (rule.ruleType === 'gregorian') return isLeapYear(year)
  return false
}

function parsePositionalToAbsoluteDays(cleanInput: string, config: CalendarConfig) {
  if (!cleanInput.includes(config.delimiter)) return null

  const segments = cleanInput.split(config.delimiter).map(Number)
  let totalDays = 0
  let valid = true

  config.positionalUnits?.forEach((unit, idx) => {
    if (segments[idx] !== undefined && !isNaN(segments[idx])) {
      totalDays += segments[idx] * unit.days
    } else if (idx < segments.length) {
      valid = false
    }
  })

  if (!valid) return null

  // Relative offset logic to safely tie positional calendars to the master track
  const epochDate = new Date(config.epochGregorian)
  const epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))
  return {
    days: epochDaysOffset + totalDays,
    display: cleanInput
  }
}

// function parseRuleBaseCalendarToAbsoluteDays(cleanInput: string, config: CalendarConfig) {
//   const segments = cleanInput.split(config.delimiter).map(Number)
//   if (segments.length < 3 || segments.some(isNaN)) return null
//
//   const [year, month, day] = segments
//
//   if (!year || !month || !day) return null
//
//   // Calculate leap years elapsed up to this point dynamically
//   let totalDays = (year - 1) * 365
//   totalDays += Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)
//
//   // Dynamic month day allocations matching reality
//   const monthDays = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
//
//   for (let m = 0; m < month - 1; m++) {
//     totalDays += monthDays[m]!
//   }
//   totalDays += (day - 1)
//
//   return {
//     days: totalDays,
//     display: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
//   }
// }

function parseToAbsoluteDays(input: string, config: CalendarConfig | null): { days: number; display: string } | null {

  // eslint-disable-next-line no-debugger
  debugger

  if (!input || !config) return null
  const cleanInput = input.toString().trim()

  let result: { days: number; display: string } | null = null

  if (config?.type === 'positional') {
    result = parsePositionalToAbsoluteDays(cleanInput, config)
  } else if (config?.type === 'rule-based') {
    result = RuleBasedCalendarParser.parseToAbsoluteDays(cleanInput, config.ruleBasedDetails!, config.delimiter)
  }

  return result

  // Fallback default: standard browser JS date parsing
  // const date = new Date(cleanInput)
  // if (isNaN(date.getTime())) return null
  // return {
  //   days: Math.floor(date.getTime() / (24 * 60 * 60 * 1000)),
  //   display: date.toISOString().split('T')[0]!
  // }
}

function parseDaysToGregorianDateString(days: number, config: CalendarConfig) {
  let remainingDays = days

  // Approximate year selection step
  let year = Math.floor((remainingDays -1) / 365.2425) + 1
  let totalDaysToYearStart = (year - 1) * 365 + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)

  // Micro adjust to pinpoint exact leap layout boundary alignment
  while (totalDaysToYearStart >= remainingDays) {
    year--
    totalDaysToYearStart = (year - 1) * 365 + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)
  }

  // Calculate 1-based day of the year (e.g., Jan 1st is Day 1)
  remainingDays -= totalDaysToYearStart

  const monthDays = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  let month = 1
  for (let m = 0; m < 12; m++) {
    if (remainingDays > monthDays[m]!) {
      remainingDays -= monthDays[m]!
      month++
    } else break
  }
  const day = remainingDays

  const s = `${year.toString().padStart(4, '0')}${config.delimiter}${month.toString().padStart(2, '0')}${config.delimiter}${day.toString().padStart(2, '0')}`;
  return s
}

function parseDaysToNonGregorianDatString(days: number, config: CalendarConfig) {
  const details = config.ruleBasedDetails
  if (!details) return `Error: No details found for ${config.id}`

  let remainingDays = days
  let year = 1

  // 1. Determine the Year
  while (true) {
    // Calculate the length of the current year being evaluated
    const isLeap = isCustomLeapYear(year, details.leapYearRule)
    const daysInYear = details.daysInStandardYear +
      (isLeap ? (details.leapYearRule.extraDays ?? 1) : 0)

    if (remainingDays > daysInYear) {
      remainingDays -= daysInYear
      year++
    } else {
      break
    }
  }

  // At this point, remainingDays represents the day offset inside the current 'year' (1-indexed base)
  // If remainingDays was 0 (which shouldn't happen with 1-based days), we default it to 1
  if (remainingDays <= 0) remainingDays = 1

  // 2. Determine the Month and Day
  let monthName = ''
  let dayOfPeriod = 1
  const isLeap = isCustomLeapYear(year, details.leapYearRule)

  for (let m = 0; m < details.months.length; m++) {
    const monthDef = details.months[m]!
    let monthDays = monthDef.days

    // Apply leap year day adjustments to the matching month/holiday index
    if (isLeap && details.leapYearRule.applyToMonthIndex === m) {
      monthDays += (details.leapYearRule.extraDays ?? 1)
    }

    if (remainingDays > monthDays) {
      remainingDays -= monthDays
    } else {
      monthName = monthDef.name
      dayOfPeriod = remainingDays
      break
    }
  }

  // 3. Construct the dynamic string based on details.format (e.g. ['year', 'month', 'day'])
  const format = details.format || ['year', 'month', 'day']
  const outputParts = format.map(component => {
    if (component === 'year') return year.toString()
    if (component === 'month') return monthName
    if (component === 'day') return dayOfPeriod.toString()
    return ''
  })

  const s1 = outputParts.filter(Boolean).join(config.delimiter);
  debugger
  return s1
}

// 2. Update the axis label formatter inside the Gantt render engine class
function formatDaysToCalendarString(days: number, config: CalendarConfig | null): string {

  debugger

  if (!config) {
    // const dateObj = new Date(Date.UTC(1, 0, 1)); // Start at Jan 1, Year 1 UTC
    // dateObj.setUTCDate(dateObj.getUTCDate() + (days - 1));
    //
    // const yyyy = String(dateObj.getUTCFullYear()).padStart(4, '0');
    // const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    // const dd = String(dateObj.getUTCDate()).padStart(2, '0');
    //
    // return `${yyyy}-${mm}-${dd}`;

    const dateObj = new Date(days * 24 * 60 * 60 * 1000)
    const s2 = dateObj.toISOString().split('T')[0]!  // TODO remove '!'?
    debugger
    return s2
  }

  if (config.type === 'rule-based') {
    if (config.id === 'gregorian' || config.id === 'iso-8601') {
      return parseDaysToGregorianDateString(days, config);
    } else {
      return parseDaysToNonGregorianDatString(days, config);
    }
  }

  // STRATEGY B: Reverse Engine Positional Multipliers (Mayan, etc.)
  const epochDate = new Date(config.epochGregorian)
  const epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))
  let localDays = days - epochDaysOffset

  if (localDays < 0) return `BCE (${Math.abs(localDays)} days)`

  const stringSegments: string[] = []
  config.positionalUnits?.forEach(unit => {
    const unitCount = Math.floor(localDays / unit.days)
    stringSegments.push(unitCount.toString())
    localDays %= unit.days
  })

  return stringSegments.join(config.delimiter)
}

export const Gregorian = {
  parseToAbsoluteDays,
  parseDaysToGregorianDateString,
  parseDaysToNonGregorianDatString,
  formatDaysToCalendarString
}
