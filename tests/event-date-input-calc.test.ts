import {describe, expect, it} from 'vitest'
import {gregorianConfig, gregorianWithoutMonthsConfig, mayanConfig, shireConfig} from './test-configs'
import {Consts} from '../src/const/constants'
import {parseEventDate} from '../src/date-calculations/event-date-input-calc'
import {CalendarConfig, ParsedDate} from '../src/const/types'
import {runOffsetCalculations} from '../src/date-calculations/calendar-offset-calc'

describe('Parsing event dates fails for', () => {

  it('missing input', () => {
    expect(parseEventDate(null, gregorianConfig)).toBeNull()
  })

  it('missing config', () => {
    expect(parseEventDate('1-2-3', null)).toBeNull()
  })

  it('wrong config type', () => {
    const incompleteConfig: Partial<CalendarConfig> = {type: 'gregorian'}
    expect(parseEventDate('1-2-3', incompleteConfig as CalendarConfig)).toBeNull()
  })

  it('positional event dates of wrong length', () => {
    expect(parseEventDate('1.2.3', mayanConfig)).toBeNull()
    expect(parseEventDate('1.2.3.4.5.6.7', mayanConfig)).toBeNull()
  })

})

describe('Parsing positional event dates works for', () => {

  const config = mayanConfig
  const {positionalUnits} = mayanConfig

  it('mayan input', () => {
    expect(parseEventDate('0.0.0.0.1', config)).toStrictEqual({
      days: mayanConfig.offsetToDayZero + 1, display: '0.0.0.0.1'
    })
    expect(parseEventDate('0.0.11.2.3', mayanConfig)).toStrictEqual({
      days: mayanConfig.offsetToDayZero
        + 11 * positionalUnits[2]!.days
        + 2 * positionalUnits[3]!.days
        + 3 * positionalUnits[4]!.days,
      display: '0.0.11.2.3'
    })
  })
})

describe('Parsing rule-base event dates works for', () => {

  it('differing formats (gregorian)', () => {
    const expected = 7733
    expect(parseEventDate('0022-3-4', gregorianConfig).days).toBe(expected)
    expect(parseEventDate('022-3-4', gregorianConfig).days).toBe(expected)
    expect(parseEventDate('22-3-4', gregorianConfig).days).toBe(expected)
    expect(parseEventDate('22-03-04', gregorianConfig).days).toBe(expected)
    expect(parseEventDate('22-March-04', gregorianConfig).days).toBe(expected)
    expect(parseEventDate('22-Mar-04', gregorianConfig).days).toBe(expected)
  })

  it('calc base offset', () => {
    let epochDate = new Date('1970-01-01T00:00:00Z')
    let epochDaysOffset = Math.abs(Math.round(epochDate.getTime() / (24 * 60 * 60 * 1000)))
    expect(epochDaysOffset).toBe(0)

    epochDate = new Date('1970-01-30T00:00:00Z')
    epochDaysOffset = Math.round(epochDate.getTime() / (24 * 60 * 60 * 1000))
    expect(epochDaysOffset).toBe(29)

    epochDate = new Date('1970-01-05T00:00:00Z')
    epochDaysOffset = Math.round(epochDate.getTime() / (24 * 60 * 60 * 1000))
    expect(epochDaysOffset).toBe(4)

    epochDate = new Date('1969-12-28T00:00:00Z')
    epochDaysOffset = Math.round(epochDate.getTime() / (24 * 60 * 60 * 1000))
    expect(epochDaysOffset).toBe(-4)

    /* Explicitly pass year, monthIndex (0 = Jan), day  */
    epochDate = new Date('1970-01-01T00:00:00Z')
    epochDate.setFullYear(1, 0, 1)
    epochDaysOffset = Math.round(epochDate.getTime() / (24 * 60 * 60 * 1000))
    /* +1 because we are 1 day after day zero */
    expect(epochDaysOffset).toBe(-Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + 1)
  })

  it('default gregorian dates', () => {
    expect(parseEventDate('0001-01-01', gregorianConfig)).toStrictEqual({
      days: 1, display: '1-Jan-1'
    })
    expect(parseEventDate('0001-12-31', gregorianConfig)).toStrictEqual({
      days: 365, display: '1-Dec-31'
    })
    expect(parseEventDate('1970-1-1', gregorianConfig)).toStrictEqual({
      days: Consts.DAYS_FROM_0_12_31_TO_1_1_1970, display: '1970-Jan-1'
    })
  })

  it('non-positive gregorian dates', () => {
    expect(parseEventDate('0000-12-31', gregorianConfig)).toStrictEqual({
      days: 0, display: '0-Dec-31'
    })
    expect(parseEventDate('0000-01-01', gregorianConfig)).toStrictEqual({
      days: -365, display: '0-Jan-1'
    })
    expect(parseEventDate('1970-1-1', gregorianConfig)).toStrictEqual({
      days: Consts.DAYS_FROM_0_12_31_TO_1_1_1970, display: '1970-Jan-1'
    })
  })


  it('gregorian dates without months', () => {
    expect(parseEventDate('0001.01', gregorianWithoutMonthsConfig)).toStrictEqual({
      days: 1, display: '1.1'
    })
    expect(parseEventDate('0001.365', gregorianWithoutMonthsConfig)).toStrictEqual({
      days: 365, display: '1.365'
    })
    expect(parseEventDate('1970.1', gregorianWithoutMonthsConfig)).toStrictEqual({
      days: Consts.DAYS_FROM_0_12_31_TO_1_1_1970, display: '1970.1'
    })
    expect(parseEventDate('1982.123', gregorianWithoutMonthsConfig)).toStrictEqual({
      days: Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + (123 - 1) + 12 * 365 + 3, display: '1982.123'
    })
  })

  it('shire dates', () => {
    expect(parseEventDate('0001-Afteryule-9', shireConfig)).toStrictEqual({
      days: 2,
      display: '1-Afteryule-9'
    })
  })


  it('have identical output (121548), spot test', () => {
    const expected = 121549
    expect(parseEventDate('333-Oct-16', gregorianConfig).days).toBe(expected)
    expect(parseEventDate('333-Blotmath-20', shireConfig).days).toBe(expected)
    expect(parseEventDate('8.14.17.6.16', mayanConfig).days).toBe(expected)
  })

  it('have identical output (443556), spot test', () => {
    const expected = 443557
    expect(parseEventDate('1215-Jun-2', gregorianConfig).days).toBe(expected)
    expect(parseEventDate('1215-Forelithe-1', shireConfig).days).toBe(expected)
    expect(parseEventDate('10.19.11.14.24', mayanConfig).days).toBe(expected)
  })

  it('have identical output (725957), spot test', () => {
    const expected: number = 725958
    let actual: ParsedDate

    actual = parseEventDate('1988-08-09', gregorianConfig)
    expect(actual.days).toBe(expected)

    actual = parseEventDate('1988-Wedmath-30', shireConfig)
    expect(actual.days).toBe(expected)

    actual = parseEventDate('12.18.16.05.05', mayanConfig)
    expect(actual.days).toBe(expected)
  })

})

describe('Fail Suite - Edge Cases & Logic Bugs', () => {

  // -------------------------------------------------------------
  // SECTION A: runOffsetCalculations
  // -------------------------------------------------------------

  it('1. runOffsetCalculations handles empty or partial objects safely', () => {
    // BUG: undefined month/day causes NaN in setUTCFullYear
    const result = runOffsetCalculations({year: 2026} as any)
    expect(Number.isNaN(result)).toBe(false)
  })

  it('2. runOffsetCalculations respects explicit 0 values for month/day without fallback bugs', () => {
    // BUG: month || 1 converts month 0 to 1
    // (0 < 1 ? 1 : 0) converts month 0 to 1
    // Month 0 / Day 0 input should evaluate cleanly to 0000-01-01 (-365 relative days)
    const result = runOffsetCalculations({year: 0, month: 0, day: 0})
    expect(result).toBe(-365)
  })

  // -------------------------------------------------------------
  // SECTION B: Negative / BC Year Calculations
  // -------------------------------------------------------------

  it('3. Negative Year -1 (1 BC) calculates correct elapsed days', () => {
    // BUG: year - 1 on year=-1 passes -2 into calculateDaysForYears,
    // double-counting negative elapsed days.
    const result = parseEventDate('-0001-01-01', gregorianConfig)
    expect(result?.days).toBe(-730) // 0000 = 366 days, -0001 = 365 days -> -731 is Day 1 of -1
  })

  it('4. Negative Leap Year -4 (4 BC) calculates correct leap days', () => {
    // BUG: Math.floor(-upToYear / 4) subtracts leap days instead of adding them
    const resYearMinus3 = parseEventDate('-0003-01-01', gregorianConfig)
    const resYearMinus4 = parseEventDate('-0004-01-01', gregorianConfig)
    const resYearMinus5 = parseEventDate('-0005-01-01', gregorianConfig)
    expect(resYearMinus3).not.toBeNull()
    expect(resYearMinus4).not.toBeNull()
    expect(resYearMinus5).not.toBeNull()
    // Difference between Year -3 start and Year -4 start MUST be 366 days (leap year)
    expect(resYearMinus3!.days - resYearMinus4!.days).toBe(366) // leap
    expect(resYearMinus4!.days - resYearMinus5!.days).toBe(365) // not leap
  })

  // -------------------------------------------------------------
  // SECTION C: Format & Month Index Parsing
  // -------------------------------------------------------------

  it('5. Padded numeric month "00" does not fail or resolve to month index -1', () => {

    // BUG: parseInt('00') = 0
    // 0 - 1 = -1 (invalid index)
    const value = parseInt('00', 10)
    expect(value).toBe(0)

    // '00' is not a valid 1-based month for Gregorian
    const result = parseEventDate('0001-00-01', gregorianConfig)
    expect(result).toBeNull()
  })

  it('6. Mixed-case month names match case-insensitively', () => {
    // BUG: monthName.toLowerCase() fails if shortname in config is undefined or missing
    const result = parseEventDate('2026-jAnUaRy-15', gregorianConfig)
    expect(result).not.toBeNull()
    expect(result?.days).toBeGreaterThan(0)
  })

  it('7. Day out of range for standard month returns null', () => {
    // BUG: Bounds checking edge cases on month lengths
    expect(parseEventDate('2026-02-29', gregorianConfig)).toBeNull() // 2026 is not leap
    expect(parseEventDate('2026-04-31', gregorianConfig)).toBeNull() // April has 30 days
  })

  it('8. Leap year month extra day is strictly enforced', () => {
    expect(parseEventDate('2024-02-29', gregorianConfig)).not.toBeNull() // 2024 IS leap
    expect(parseEventDate('2024-02-30', gregorianConfig)).toBeNull()     // Never valid
  })

  // -------------------------------------------------------------
  // SECTION D: Positional / Mayan Long Count
  // -------------------------------------------------------------

  it('9. Mayan positional parser rejects invalid segment counts', () => {
    // BUG: Incorrect segment length checks vs units count
    expect(parseEventDate('0.0.0.1', mayanConfig)).toBeNull()       // 4 units (needs 5)
    expect(parseEventDate('0.0.0.0.0.1', mayanConfig)).toBeNull()   // 6 units (needs 5)
  })

  it('10. Mayan positional parser rejects NaN or non-numeric tokens', () => {
    // BUG: NaN values slip through if array mapping isn't guarded
    expect(parseEventDate('0.0.foo.0.1', mayanConfig)).toBeNull()
  })

  it('11. Mayan positional parser rejects negative position values', () => {
    // BUG: Unchecked negative segments in positional count
    expect(parseEventDate('0.0.-5.0.1', mayanConfig)).toStrictEqual({
      days: -1139306, // -5*360 + 1*1 + -1_137_507 (offset)
      display: '0.0.-5.0.1'
    })
  })

  // -------------------------------------------------------------
  // SECTION E: Intercalary Days (Shire Config)
  // -------------------------------------------------------------

  it('12. Shire Intercalary 1-day months enforce max day = 1', () => {
    // BUG: Intercalary months like '2. Yule' (days: 1) must reject day > 1
    expect(parseEventDate('0001-2. Yule-1', shireConfig)).not.toBeNull()
    expect(parseEventDate('0001-2. Yule-2', shireConfig)).toBeNull()
  })

})
