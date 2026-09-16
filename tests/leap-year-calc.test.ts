import {describe, expect, it} from 'vitest'
import {isCustomLeapYear, isGregorianLeapYear} from '../src/date-calculations/leap-year-calc'
import {gregorianConfig, mayanConfig, shireConfig} from './test-configs'
import {CalendarConfig, LeapYearRule} from '../src/const/types'


const bullshitCalendarConfig: CalendarConfig = {
  id: 'id',
  sharedOffset: 0,
  offsetToDayZero: 0,
  type: 'gregorian',
  delimiter: '',
  ruleBasedDetails: {
    daysInStandardYear: 365,
    noYearZero: false,
    leapYearRule: {ruleType: 'gregorian'},
    months: [],
    /**
     * Defines the order of elements in the date string.
     * For '1420-Afterlithe-21', format is ['year', 'month', 'day']
     * For '195-2026' (Ordinal), format is ['day', 'year']
     */
    format: ['year', 'month', 'day']
  }
}

describe('Leap year calculations should work for', () => {

  it('Gregorian years', () => {
    expect(isGregorianLeapYear(-4000)).toBe(true) // 400's exception
    expect(isGregorianLeapYear(-1000)).toBe(false)
    expect(isGregorianLeapYear(4)).toBe(true)
    expect(isGregorianLeapYear(0)).toBe(true) // 400's exception
    expect(isGregorianLeapYear(1)).toBe(false)
    expect(isGregorianLeapYear(2)).toBe(false)
    expect(isGregorianLeapYear(3)).toBe(false)
    expect(isGregorianLeapYear(4)).toBe(true)
    expect(isGregorianLeapYear(8)).toBe(true)
    expect(isGregorianLeapYear(100)).toBe(false)
    expect(isGregorianLeapYear(200)).toBe(false)
    expect(isGregorianLeapYear(400)).toBe(true) // 400's exception
    expect(isGregorianLeapYear(800)).toBe(true) // 400's exception

    expect(isCustomLeapYear(0, gregorianConfig)).toBe(true)
    expect(isCustomLeapYear(1, gregorianConfig)).toBe(false)
  })

  it('shire years', () => {

    expect(isCustomLeapYear(0, shireConfig)).toBe(true)
    expect(isCustomLeapYear(1, shireConfig)).toBe(false)
    expect(isCustomLeapYear(2, shireConfig)).toBe(false)
    expect(isCustomLeapYear(3, shireConfig)).toBe(false)
    expect(isCustomLeapYear(4, shireConfig)).toBe(true)
    expect(isCustomLeapYear(8, shireConfig)).toBe(true)
    expect(isCustomLeapYear(100, shireConfig)).toBe(true)
    expect(isCustomLeapYear(200, shireConfig)).toBe(true)
    expect(isCustomLeapYear(400, shireConfig)).toBe(true)
    expect(isCustomLeapYear(800, shireConfig)).toBe(true)
  })

})

describe('Leap year calculations should be skipped for', () => {

  it('positional calendars', () => {
    const mayanLeapYearRule: LeapYearRule = {ruleType: 'none'}
    expect(isCustomLeapYear(0, mayanConfig)).toBe(false)
  })

  it('nonsense data', () => {
    bullshitCalendarConfig.ruleBasedDetails.leapYearRule.ruleType = 'interval'
    expect(isCustomLeapYear(0, bullshitCalendarConfig)).toBe(false)

    // @ts-ignore bullshit data
    bullshitCalendarConfig.ruleBasedDetails.leapYearRule.ruleType = 'foo'
    expect(isCustomLeapYear(0, bullshitCalendarConfig)).toBe(false)
  })

  it('no data', () => {
    expect(isCustomLeapYear(0, null)).toBe(false)
  })
})

/**
 * Test noYearZero Boundary (Shire / Interval Rule)
 * In a calendar skipping Year 0, the year sequence is ..., -2, -1, 1, 2, ....
 * The distance between Year -1 and Year 1 is 1 year, not 2.
 */
describe('noYearZero with interval rules', () => {

  const shireNoYearZeroConfig: CalendarConfig = {
    ...shireConfig,
    ruleBasedDetails: {
      ...shireConfig.ruleBasedDetails,
      noYearZero: true,
      leapYearRule: {ruleType: 'interval', intervalYears: 4}
    }
  }

  it('maintains a 4-year leap interval across the zero boundary', () => {
    // Basic positive checks
    expect(isCustomLeapYear(4, shireNoYearZeroConfig)).toBe(true)
    expect(isCustomLeapYear(1, shireNoYearZeroConfig)).toBe(false)

    // FAILS if using Math.abs(-1) % 4 === 0 (evaluates to false, but should be TRUE)
    expect(isCustomLeapYear(-1, shireNoYearZeroConfig)).toBe(true)

    // FAILS if using Math.abs(-4) % 4 === 0 (evaluates to true, but should be FALSE: -4 is only 3 years from -1)
    expect(isCustomLeapYear(-4, shireNoYearZeroConfig)).toBe(false)
  })
})

/**
 * Test 2: The Sci-Fi / Gregorian Workaround with Negative Years
 * Assume a Sci-Fi calendar starts Year 1 in Gregorian Year 2024 (a leap year).
 * Year 1 -> 2024 (Leap Year)
 * Year 2 -> 2025 (Normal)
 * Year 3 -> 2026 (Normal)
 * Year 4 -> 2027 (Normal)
 * Year 5 -> 2028 (Leap Year)
 *
 * Now step backward into negative years:
 * If noYearZero: false: Year 0 -> 2023 (Normal). Year -1 -> 2022 (Normal). Year -4 -> 2020 (Leap Year).
 * If noYearZero: true: Year -1 comes immediately before Year 1. Year -1 -> 2023 (Normal). Year -4 -> 2020 (Leap Year).
 */
describe('Sci-Fi Gregorian workaround with negative years', () => {

  const sciFiConfig: CalendarConfig = {
    id: 'sci-fi',
    type: 'rule-based',
    delimiter: '-',
    offsetToDayZero: 0,
    sharedOffset: {year: 2024, month: 1, day: 1}, // Year 1 = 2024 (Leap Year)
    ruleBasedDetails: {
      daysInStandardYear: 365,
      noYearZero: true,
      leapYearRule: {ruleType: 'gregorian'},
      months: [],
      format: ['year', 'month', 'day']
    }
  }

  it('correctly maps negative custom years to Gregorian target years', () => {
    // Year 1 maps to 2024 -> LEAP
    expect(isCustomLeapYear(1, sciFiConfig)).toBe(true)

    // Year -1 maps to 2023 -> NOT LEAP
    // FAILS if (year - 1) is used blindly: -1 - 1 = -2 => 2024 + (-2) = 2022 (Normal, but wrong year target)
    expect(isCustomLeapYear(-1, sciFiConfig)).toBe(false)

    // Year -4 maps to 2020 -> LEAP
    // FAILS without targetYear = year + 1 adjustment: -4 - 1 = -5 => 2024 - 5 = 2019 (FALSE instead of TRUE)
    expect(isCustomLeapYear(-4, sciFiConfig)).toBe(true)
  })
})
