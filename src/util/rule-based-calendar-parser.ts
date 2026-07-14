import {LeapYearRule, RuleBasedDetails} from '../const/types'

export class RuleBasedCalendarParser {

  static parseToAbsoluteDays(
    input: string,
    details: RuleBasedDetails,
    delimiter: string
  ): { days: number; display: string } | null {

    // debugger

    const parts = input.split(delimiter).map(p => p.trim())
    const format = details.format

    // Ensure the input has exactly the number of blocks expected by this calendar
    if (parts.length !== format.length) return null

    // Dynamically extract values based on the configuration format mapping
    let year = 1
    let day = 1
    let monthName: string | number | null = null

    for (let i = 0; i < format.length; i++) {
      const componentType = format[i]
      const partValue = parts[i]!

      if (componentType === 'year') {
        year = parseInt(partValue, 10)
      } else if (componentType === 'day') {
        day = parseInt(partValue, 10)
      } else if (componentType === 'month') {
        monthName = /\d*/.exec(partValue) ? parseInt(partValue, 10) : partValue
      }
    }

    if (isNaN(year) || isNaN(day)) return null

    // 1. Calculate days from previous years
    const daysFromYears = this.calculateDaysForYears(year - 1, details)
    const isLeap = this.isLeapYear(year, details.leapYearRule)

    // 2. Handle Ordinal Dates (No month block in the format)
    if (!monthName) {
      const maxDays = isLeap ? (details.daysInStandardYear + (details.leapYearRule.extraDays ?? 1)) : details.daysInStandardYear
      if (day < 1 || day > maxDays) return null

      return {
        days: daysFromYears + day,
        display: input
      }
    }

    // 3. Handle Standard/Intercalary Month Dates
    const months = details.months
    const monthIndex = typeof (monthName) === 'number' ? monthName -1 : months.findIndex(m => m.name.toLowerCase() === monthName!.toLowerCase())
    if (monthIndex === -1) return null

    let allowedDays = months[monthIndex]!.days
    if (isLeap && details.leapYearRule.applyToMonthIndex === monthIndex) {
      allowedDays += (details.leapYearRule.extraDays ?? 1)
    }

    if (day < 1 || day > allowedDays) return null

    let daysFromCurrentYearMonths = 0
    for (let i = 0; i < monthIndex; i++) {
      daysFromCurrentYearMonths += months[i]!.days
      if (isLeap && details.leapYearRule.applyToMonthIndex === i) {
        daysFromCurrentYearMonths += (details.leapYearRule.extraDays ?? 1)
      }
    }

    return {
      days: daysFromYears + daysFromCurrentYearMonths + day,
      display: input
    }
  }

  private static calculateDaysForYears(upToYear: number, details: RuleBasedDetails): number {
    if (upToYear <= 0) return 0
    const {leapYearRule, daysInStandardYear} = details
    let totalDays = upToYear * daysInStandardYear

    if (leapYearRule.ruleType === 'interval' && leapYearRule.intervalYears) {
      totalDays += Math.floor(upToYear / leapYearRule.intervalYears) * (leapYearRule.extraDays ?? 1)
    } else if (leapYearRule.ruleType === 'gregorian') {
      totalDays += Math.floor(upToYear / 4) - Math.floor(upToYear / 100) + Math.floor(upToYear / 400)
    }
    return totalDays
  }

  private static isLeapYear(year: number, rule: LeapYearRule): boolean {
    if (rule.ruleType === 'none') return false
    if (rule.ruleType === 'interval' && rule.intervalYears) return year % rule.intervalYears === 0
    if (rule.ruleType === 'gregorian') return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
    return false
  }
}

