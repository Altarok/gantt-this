import {RuleBasedCalendarConfig} from '../const/types'
import {isGregorianLeapYear} from '../date-calculations/leap-year-calc'

export class GregorianDateFormatter {

  /**
   * Formats a Gregorian date given an absolute day count and the current tick step interval in days.
   *
   * Rules:
   * - Hide days if tick step > 365 days (~1 year).
   * - Hide months if tick step > 730 days (~2 years).
   * - Years <= 6 digits: Display full year with thousands separators (e.g., 100,000).
   * - Years > 6 digits (Millions): Compact notation with 2 decimals (e.g., 1.23M).
   * - Years > 9 digits (Billions): Compact notation with 2 decimals (e.g., 1.23B).
   *
   * @param days Absolute day count (since Day 0)
   * @param tickStepInDays Difference in days between adjacent axis ticks
   * @param config RuleBasedCalendarConfig for Gregorian calendar
   */
  public static formatGregorianAxisDate(
    days: number,
    tickStepInDays: number,
    config: RuleBasedCalendarConfig
  ): string {
    const remainingDays = days - (config.offsetToDayZero ?? 0)

    // Calculate Gregorian year and 1-based day of year
    let year = Math.floor((remainingDays - 1) / 365.2425 + 1)
    let totalDaysToYearStart = this.getDaysToYearStart(year)

    while (totalDaysToYearStart >= remainingDays) {
      year--
      totalDaysToYearStart = this.getDaysToYearStart(year)
    }
    while (this.getDaysToYearStart(year + 1) < remainingDays) {
      year++
      totalDaysToYearStart = this.getDaysToYearStart(year)
    }

    let dayOfYear = remainingDays - totalDaysToYearStart
    const monthDays = [31, isGregorianLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    let month = 1
    for (const daysInMonth of monthDays) {
      if (dayOfYear > daysInMonth) {
        dayOfYear -= daysInMonth
        month++
      } else {
        break
      }
    }

    const displayedYear = config.ruleBasedDetails?.noYearZero === true && year <= 0 ? year - 1 : year
    const isNegative = displayedYear < 0
    const absYear = Math.abs(displayedYear)

    // Format Year according to magnitude rules
    const formattedYear = this.formatYearValue(absYear)

    // Resolution filters based on tick step interval
    const hideDays = tickStepInDays > 365
    const hideMonths = tickStepInDays > 730

    const parts: string[] = []

    // Year component
    parts.push(formattedYear)

    // Month component
    if (!hideMonths) {
      const monthDef = config.ruleBasedDetails?.months?.[month - 1]
      const monthStr = monthDef?.shortname ?? monthDef?.name ?? month.toString().padStart(2, '0')
      parts.push(monthStr)
    }

    // Day component
    if (!hideDays) {
      parts.push(dayOfYear.toString().padStart(2, '0'))
    }

    const prefix = isNegative ? '-' : ''
    const suffixRaw = isNegative ? config.bcSuffix : config.adSuffix
    const suffix = suffixRaw ? ` ${suffixRaw}` : ''

    return prefix + parts.join(config.delimiter ?? '-') + suffix
  }

  /**
   * Helper to format large year numbers with commas or dynamic compact units (M/B).
   */
  public static formatYearValue(absYear: number): string {
    if (absYear >= 1_000_000_000) {
      return `${(absYear / 1_000_000_000).toFixed(2).replace('.', ',')}B`
    }

    if (absYear >= 1_000_000) {
      return `${(absYear / 1_000_000).toFixed(2).replace('.', ',')}M`
    }

    if (absYear >= 10_000) {
      return absYear.toLocaleString('en-US')
    }

    return absYear.toString().padStart(4, '0')
  }

  private static getDaysToYearStart(year: number): number {
    const y = year - 1
    return y * 365 + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)
  }
}
