import {CalendarConfig, LeapYearRule} from '../const/types'
import {RuleBasedCalendarParser} from './rule-based-calendar-parser'

export const Dates = {
  parseToAbsoluteDays,
  parseDaysToGregorianDateString,
  parseDaysToNonGregorianDatString,
  formatDaysToCalendarString
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

export function isCustomLeapYear(year: number, rule?: LeapYearRule): boolean {
  if (!rule || rule.ruleType === 'none') return false
  if (rule.ruleType === 'interval' && rule.intervalYears) return year % rule.intervalYears === 0
  if (rule.ruleType === 'gregorian') return isLeapYear(year)
  return false
}

function parsePositionalToAbsoluteDays(cleanInput: string, config: CalendarConfig) {
  if (!cleanInput.includes(config.delimiter)) return null

  const segments = cleanInput.split(config.delimiter).map(Number)
  let totalDays = 0
  let valid = true

  const units = config.positionalUnits ?? []
  if (units.length === 0) return null

  units.forEach((unit, idx) => {
    const val = segments[idx]
    if (val !== undefined && !isNaN(val)) {
      totalDays += val * unit.days
    } else if (idx < segments.length) {
      valid = false
    }
  })

  if (!valid || segments.length !== units.length) return null

  const epochDate = new Date(config.epochGregorian)
  const epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))

  return {
    /*
     * 719162 = days between 1-1-1 and 1970-1-1
     */
    days: epochDaysOffset + totalDays + 719162,
    display: cleanInput
  }
}

function parseToAbsoluteDays(input: string, config: CalendarConfig | null): { days: number; display: string } | null {

  if (!input || !config) return null
  const cleanInput = input.toString().trim()

  let result: { days: number; display: string } | null = null

  if (config?.type === 'positional') {
    result = parsePositionalToAbsoluteDays(cleanInput, config)
  } else if (config?.type === 'rule-based') {
    result = RuleBasedCalendarParser.parseToAbsoluteDays(cleanInput, config.ruleBasedDetails!, config.delimiter)
  }

  return result
}

function parseDaysToGregorianDateString(days: number, config: CalendarConfig) {
  let remainingDays = days

  /* Approximate year selection step */
  let year = Math.floor((remainingDays - 1) / 365.2425) + 1
  let totalDaysToYearStart = (year - 1) * 365 + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)

  /* Micro adjust to pinpoint exact leap layout boundary alignment */
  while (totalDaysToYearStart >= remainingDays) {
    year--
    totalDaysToYearStart = (year - 1) * 365 + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)
  }

  /* Calculate 1-based day of the year (e.g., Jan 1st is Day 1) */
  remainingDays -= totalDaysToYearStart

  const monthDays = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  let month = 1
  for (const daysInMonth of monthDays) {
    if (remainingDays > daysInMonth) {
      remainingDays -= daysInMonth
      month++
    } else break
  }
  const day = remainingDays

  return `${year.toString().padStart(4, '0')}${config.delimiter}${month.toString().padStart(2, '0')}${config.delimiter}${day.toString().padStart(2, '0')}`
}

function parseDaysToNonGregorianDatString(days: number, config: CalendarConfig) {
  const details = config.ruleBasedDetails
  if (!details) return `Error: No details found for ${config.id}`

  let remainingDays = days
  let year = 1

  /*
  * TODO block entfernen?
   */
  /* Fast-forward large day counts safely if using an interval rule */
  if (details.leapYearRule?.ruleType === 'interval' && details.leapYearRule.intervalYears) {
    const interval = details.leapYearRule.intervalYears
    const extra = details.leapYearRule.extraDays ?? 1

    /*  Calculate average days in one full interval cycle (e.g., 4 years) */
    const daysInCycle = (details.daysInStandardYear * interval) + extra

    if (remainingDays > daysInCycle) {
      const cycles = Math.floor(remainingDays / daysInCycle)
      year += cycles * interval
      remainingDays -= cycles * daysInCycle
    }
  }


  /* Determine the Year */
  while (true) {
    /* Calculate the length of the current year being evaluated */
    const isLeap = isCustomLeapYear(year, details.leapYearRule)
    const daysInYear = details.daysInStandardYear +
      (isLeap ? (details.leapYearRule?.extraDays ?? 1) : 0)

    if (remainingDays > daysInYear) {
      remainingDays -= daysInYear
      year++
    } else break
  }

  /* At this point, remainingDays represents the day offset inside the current 'year' (1-indexed base).
   If remainingDays was 0 (which shouldn't happen with 1-based days), we default it to 1 */
  if (remainingDays <= 0) remainingDays = 1

  /* Determine the Month and Day */
  let monthName = ''
  let dayOfPeriod = 1
  const isLeap = isCustomLeapYear(year, details.leapYearRule)

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

  /* Construct the dynamic string based on details.format (e.g. ['year', 'month', 'day']) */
  const format = details.format || ['year', 'month', 'day']
  const outputParts = format.map(component => {
    if (component === 'year') return year.toString()
    if (component === 'month') return monthName
    if (component === 'day') return dayOfPeriod.toString()
    return ''
  })

  return outputParts.filter(Boolean).join(config.delimiter)
}

/* Update the axis label formatter inside the Gantt render engine class */
function formatDaysToCalendarString(days: number, config: CalendarConfig | null): string {

  if (!config) {
    const dateObj = new Date(days * 24 * 60 * 60 * 1000)
    return dateObj.toISOString().split('T')[0]!
  }

  if (config.type === 'rule-based') {
    if (config.id === 'gregorian') {
      return parseDaysToGregorianDateString(days, config)
    } else {
      return parseDaysToNonGregorianDatString(days, config)
    }
  }

  /* STRATEGY B: Reverse Engine Positional Multipliers (Mayan, etc.) */
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

