import {CalendarConfig, LeapYearRule, RuleBasedDetails} from '../const/types'

/*
 * Used solely during the event load phase.
 */
export class RuleBasedCalendarParser {

  /*
   * Parse a date to a number of absolute days.
   * Done once for each loaded event, ___not during runtime___..
   */
  static parseToAbsoluteDays(input: string,
                             calendarConfig: CalendarConfig,
                             delimiter: string): { days: number; display: string } | null {

    /*
     * The delimiter often is '-'. Since this also stands for a negative year value, we need a workaround here.
     */
    let yearMultiplicator = 1
    if (delimiter === '-' && input.startsWith(delimiter)) {
      input = input.slice(1)
      yearMultiplicator = -1
    }

    const parts = input.split(delimiter).map(p => p.trim())
    const details = calendarConfig.ruleBasedDetails!
    const format = details.format

    /* Ensure the input has exactly the number of blocks expected by this calendar */
    if (parts.length !== format.length) return null

    /* Dynamically extract values based on the configuration format mapping */
    let year = 1
    let day = 1
    let monthName: string | number | null = null

    for (let i = 0; i < format.length; i++) {
      const componentType = format[i]
      const partValue = parts[i]!

      if (componentType === 'year') {
        year = parseInt(partValue, 10) * yearMultiplicator
      } else if (componentType === 'day') {
        day = parseInt(partValue, 10)
      } else if (componentType === 'month') {
        monthName = /^\d+$/.exec(partValue) ? parseInt(partValue, 10) : partValue
      }
    }

    if (isNaN(year) || isNaN(day)) return null

    /* Calculate days from previous years */
    const daysFromYears = this.calculateDaysForYears(year - 1, details)
    const isLeap = this.isLeapYear(year, details.leapYearRule)

    /* Handle Ordinal Dates (No month block in the format) */
    if (!monthName) {
      const maxDays = isLeap ? (details.daysInStandardYear + (details.leapYearRule?.extraDays ?? 1)) : details.daysInStandardYear
      if (day < 1 || day > maxDays) return null

      const days = daysFromYears + day + calendarConfig.offsetToDayZero;
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

  private static calculateDaysForYears(upToYear: number, details: RuleBasedDetails): number {
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

  private static isLeapYear(year: number, rule?: LeapYearRule): boolean {
    if (!rule || rule.ruleType === 'none') return false
    if (rule.ruleType === 'interval' && rule.intervalYears) return year % rule.intervalYears === 0
    if (rule.ruleType === 'gregorian') return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    return false
  }
}

