import {describe, expect, it} from 'vitest'
import {Gregorian, isCustomLeapYear, isLeapYear} from '../src/util/gregorian'
import {gregorianConfig, mayanConfig, shireConfig} from "./test-configs";


describe('Parse date format to days', () => {

  it('gregorian', () => {
    expect(Gregorian.parseToAbsoluteDays('0001-01-01', gregorianConfig)).toStrictEqual({days: 1, display: '0001-01-01'})
    expect(Gregorian.parseToAbsoluteDays('0001-12-31', gregorianConfig)).toStrictEqual({days: 365, display: '0001-12-31'})
  })

  it('shire', () => {
    expect(Gregorian.parseToAbsoluteDays('0001-Afteryule-9', shireConfig)).toStrictEqual({days: 10, display: '0001-Afteryule-9'})
  })

  it('have identical output (121548)' , () => {
    expect(Gregorian.parseToAbsoluteDays('333-10-15', gregorianConfig).days).toBe(121548)
    expect(Gregorian.parseToAbsoluteDays('333-Blotmath-11', shireConfig).days).toBe(121548)
    expect(Gregorian.parseToAbsoluteDays('8.14.16.6.10', mayanConfig).days).toBe(121548)
  })

  it('have identical output (443556)' , () => {
    expect(Gregorian.parseToAbsoluteDays('1215-06-01', gregorianConfig).days).toBe(443556)
    expect(Gregorian.parseToAbsoluteDays('1215-Thrimidge-22', shireConfig).days).toBe(443556)
    expect(Gregorian.parseToAbsoluteDays('10.19.10.14.18', mayanConfig).days).toBe(443556)
  })

  it('have identical output (725957)' , () => {
    expect(Gregorian.parseToAbsoluteDays('1988-08-08', gregorianConfig).days).toBe(725957)
    expect(Gregorian.parseToAbsoluteDays('1988-Forelithe-25', shireConfig).days).toBe(725957)
    expect(Gregorian.parseToAbsoluteDays('12.18.15.4.19', mayanConfig).days).toBe(725957)
  })

})


describe('Parse days to date format', () => {

  it('gregorian', () => {
    expect(Gregorian.parseDaysToGregorianDateString(1, gregorianConfig)).toBe('0001-01-01')
  })

  it('shire', () => {
    expect(Gregorian.parseDaysToNonGregorianDatString(1, shireConfig)).toBe('1-2. Yule-1')
  })

})


describe('Leap year calculations should work for', () => {

  it('default dates', () => {
    expect(isLeapYear(0)).toBe(true)
    expect(isLeapYear(1)).toBe(false)
    expect(isLeapYear(2)).toBe(false)
    expect(isLeapYear(3)).toBe(false)
    expect(isLeapYear(4)).toBe(true)
    expect(isLeapYear(8)).toBe(true)
    expect(isLeapYear(100)).toBe(false)
    expect(isLeapYear(200)).toBe(false)
    expect(isLeapYear(400)).toBe(true)
    expect(isLeapYear(800)).toBe(true)
  })

  it('shre dates', () => {
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



