import {describe, expect, it} from 'vitest'
import {isCustomLeapYear, isLeapYear} from '../src/date-calculations/leap-year-calc'
import {gregorianConfig, shireConfig} from './test-configs'
import {LeapYearRule} from '../src/const/types'

describe('Leap year calculations should work for', () => {

  it('gregorian years', () => {
    expect(isLeapYear(-4000)).toBe(true) // 400's exception
    expect(isLeapYear(-1000)).toBe(false)
    expect(isLeapYear(4)).toBe(true)
    expect(isLeapYear(0)).toBe(true) // 400's exception
    expect(isLeapYear(1)).toBe(false)
    expect(isLeapYear(2)).toBe(false)
    expect(isLeapYear(3)).toBe(false)
    expect(isLeapYear(4)).toBe(true)
    expect(isLeapYear(8)).toBe(true)
    expect(isLeapYear(100)).toBe(false)
    expect(isLeapYear(200)).toBe(false)
    expect(isLeapYear(400)).toBe(true) // 400's exception
    expect(isLeapYear(800)).toBe(true) // 400's exception

    expect(isCustomLeapYear(0, gregorianConfig.ruleBasedDetails.leapYearRule)).toBe(true)
    expect(isCustomLeapYear(1, gregorianConfig.ruleBasedDetails.leapYearRule)).toBe(false)
  })

  it('shire years', () => {
    const {leapYearRule} = shireConfig.ruleBasedDetails

    expect(isCustomLeapYear(0, leapYearRule)).toBe(true)
    expect(isCustomLeapYear(1, leapYearRule)).toBe(false)
    expect(isCustomLeapYear(2, leapYearRule)).toBe(false)
    expect(isCustomLeapYear(3, leapYearRule)).toBe(false)
    expect(isCustomLeapYear(4, leapYearRule)).toBe(true)
    expect(isCustomLeapYear(8, leapYearRule)).toBe(true)
    expect(isCustomLeapYear(100, leapYearRule)).toBe(true)
    expect(isCustomLeapYear(200, leapYearRule)).toBe(true)
    expect(isCustomLeapYear(400, leapYearRule)).toBe(true)
    expect(isCustomLeapYear(800, leapYearRule)).toBe(true)
  })

})

describe('Leap year calculations should be skipped for', () => {

  it('positional calendars', () => {
    const mayanLeapYearRule: LeapYearRule = {ruleType: 'none'}
    expect(isCustomLeapYear(0, mayanLeapYearRule)).toBe(false)
  })

  it('nonsense data', () => {
    const missingIntervalYears: LeapYearRule = {ruleType: 'interval'}
    expect(isCustomLeapYear(0, missingIntervalYears)).toBe(false)

    const missingLeapYearRuleType: LeapYearRule = {ruleType: 'foo'} as any as LeapYearRule
    expect(isCustomLeapYear(0, missingLeapYearRuleType)).toBe(false)
  })

  it('no data', () => {
    expect(isCustomLeapYear(0, null)).toBe(false)
  })
})
