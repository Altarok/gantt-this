import {CalendarConfig} from '../const/types'

export function isGregorianLeapYear(year: number): boolean {
  const absYear = Math.abs(year)
  return (absYear % 4 === 0 && absYear % 100 !== 0) || (absYear % 400 === 0)
}

/** Checks whether a target year is a leap year according to rules */
export function isCustomLeapYear(year: number, calConfig: CalendarConfig, yearWasAlreadyShifted = false): boolean {
  if (calConfig?.type !== 'rule-based') return false

  const leapYearRule = calConfig.ruleBasedDetails.leapYearRule

  /* No rule means there never is a leap year. */
  if (!leapYearRule || leapYearRule.ruleType === 'none') return false

  // Apply noYearZero offset once upfront if active on negative years
  let targetYear = year
  if (!yearWasAlreadyShifted) {
    targetYear = (calConfig.ruleBasedDetails.noYearZero && year < 0) ? year + 1 : year
  }

  if (leapYearRule.ruleType === 'gregorian') {
    if (typeof calConfig.sharedOffset === 'object') {
      /*
       * WORKAROUND - <b>Use with care!</b>
       *
       * Convert custom year back to target Gregorian year based on epoch.
       * This is meant only for calendars which mimic the Gregorian leap year rule.
       * This means the same year length, the same year start date and the same leap year rule.
       * This code is meant to piggyback on the default Gregorian's leap year rule, but with an offset.
       *
       * For example, a real-world SciFi calendar starting in the year 1 in
       * Gregorian year 2422, which wants to mimic Gregorian.
       * This means the SciFi calendar's year 3 would be a leap year because
       * it mimics Gregorian year 2424.
       */
      const epochYear = calConfig.sharedOffset.year
      const targetGregorianYear = epochYear + (targetYear - 1)
      return isGregorianLeapYear(targetGregorianYear)
    }

    return isGregorianLeapYear(targetYear)
  }

  if (leapYearRule.ruleType === 'interval') {
    const interval = leapYearRule.intervalYears
    if (!interval || interval <= 0) return false

    return targetYear % interval === 0
  }

  return false
}
