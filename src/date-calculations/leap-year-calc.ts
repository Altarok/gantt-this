import {LeapYearRule} from '../const/types'

export function isLeapYear(year: number): boolean {
  const absYear = Math.abs(year)
  return (absYear % 4 === 0 && absYear % 100 !== 0) || (absYear % 400 === 0)
}

export function isCustomLeapYear(year: number, rule?: LeapYearRule): boolean {
  if (!rule || rule.ruleType === 'none') return false

  if (rule.ruleType === 'gregorian') return isLeapYear(year)

  if (rule.ruleType === 'interval') {
    const interval = rule.intervalYears
    return !!interval && interval > 0 && Math.abs(year) % interval === 0
  }

  return false
}
