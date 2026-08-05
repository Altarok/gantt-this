import {LeapYearRule} from '../const/types'


export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
}

export function isCustomLeapYear(year: number, rule?: LeapYearRule): boolean {
  if (!rule || rule.ruleType === 'none') return false
  if (rule.ruleType === 'interval' && rule.intervalYears) return year % rule.intervalYears === 0
  if (rule.ruleType === 'gregorian') return isLeapYear(year)
  return false
}
