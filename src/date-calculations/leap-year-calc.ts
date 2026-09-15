import {LeapYearRule} from '../const/types'

export function isGregorianLeapYear(year: number): boolean {
  const absYear = Math.abs(year)
  return (absYear % 4 === 0 && absYear % 100 !== 0) || (absYear % 400 === 0)
}



/** Checks whether a target year is a leap year according to rules */
export function isCustomLeapYear(year: number,
                                 leapYearRule?: LeapYearRule): boolean {

  if (!leapYearRule || leapYearRule.ruleType === 'none') return false

  if (leapYearRule.ruleType === 'gregorian') return isGregorianLeapYear(year)

  if (leapYearRule.ruleType === 'interval') {
    const interval = leapYearRule.intervalYears
    return !!interval && interval > 0 && Math.abs(year) % interval === 0
  }

  return false
}
