import {CalendarConfig} from '../const/types'
import {RuleBasedCalendarParser} from "./rule-based-calendar-parser";

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)

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

  // debugger

  if (!input || !config) return null
  const cleanInput = input.toString().trim()

  if (config?.type === 'positional') {
    return parsePositionalToAbsoluteDays(cleanInput, config)
  }

  if (config?.type === 'rule-based') {
    return RuleBasedCalendarParser.parseToAbsoluteDays(cleanInput, config.ruleBasedDetails!, config.delimiter)
  }

  return null

  // Fallback default: standard browser JS date parsing
  // const date = new Date(cleanInput)
  // if (isNaN(date.getTime())) return null
  // return {
  //   days: Math.floor(date.getTime() / (24 * 60 * 60 * 1000)),
  //   display: date.toISOString().split('T')[0]!
  // }
}

// 2. Update the axis label formatter inside the Gantt render engine class
function formatDaysToCalendarString(days: number, config: CalendarConfig | null): string {

  debugger

  if (!config) {
    const dateObj = new Date(days * 24 * 60 * 60 * 1000)
    return dateObj.toISOString().split('T')[0]! // TODO remove '!'?
  }

  if (config.type === 'rule-based') { // gregorian ?
    let remainingDays = days

    // Approximate year selection step
    let year = Math.floor(remainingDays / 365.2425) + 1
    let totalDaysToYearStart = (year - 1) * 365 + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)

    // Micro adjust to pinpoint exact leap layout boundary alignment
    while (totalDaysToYearStart > remainingDays) {
      year--
      totalDaysToYearStart = (year - 1) * 365 + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)
    }

    remainingDays -= totalDaysToYearStart

    const monthDays = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    let month = 1
    for (let m = 0; m < 12; m++) {
      if (remainingDays >= monthDays[m]!) {
        remainingDays -= monthDays[m]! // TODO remove '!'?
        month++
      } else {
        break
      }
    }
    const day = remainingDays + 1

    return `${year}${config.delimiter}${month.toString().padStart(2, '0')}${config.delimiter}${day.toString().padStart(2, '0')}`
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
  formatDaysToCalendarString
}
