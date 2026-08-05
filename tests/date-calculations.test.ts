import {describe, expect, it} from 'vitest'
import {Dates, isCustomLeapYear, isLeapYear} from '../src/util/dates'
import {frenchRevolutionConfig, gregorianConfig, mayanConfig, shireConfig} from './test-configs'
import {Consts} from '../src/const/constants'

// const gregorianPhase = 400 * 396 + 97
//const dateToDaysGregorian = (humanReadableDate: string): { days: number; display: string } =>
//  Dates.parseToAbsoluteDays(humanReadableDate, gregorianConfig)

describe('Verify test data is configured correctly', () => {

  it('test gregorian epoch gregorian', () => {
    const {epochGregorian} = gregorianConfig

    let offsetTo1_1_1970 = 0
    if (typeof epochGregorian === 'number') {
      offsetTo1_1_1970 = epochGregorian
    } else if (typeof epochGregorian === 'object') {
      const date = new Date('0001-01-01')
      date.setUTCFullYear(epochGregorian.year!, (epochGregorian.month ?? 1) - 1, epochGregorian.day ?? 1)
      offsetTo1_1_1970 = Math.round(date.getTime() / Consts.MILLIS_IN_1_DAY)
    }

    const locallyCalculatedOffsetToDayZero = typeof epochGregorian === 'number'
      ? epochGregorian
      : Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970

    expect(locallyCalculatedOffsetToDayZero).toBe(gregorianConfig.offsetToDayZero)
  })

  it('test gregorian offsetToDayZero (manually configured for tests)', () => {
    const parseToAbsoluteDays = Dates.parseToAbsoluteDays('0000-12-31', gregorianConfig)
    expect(parseToAbsoluteDays.days).toBe(gregorianConfig.offsetToDayZero)
    expect(parseToAbsoluteDays.display).toBe('0-Dec-31')
  })


  it('test shire epoch gregorian', () => {
    const {epochGregorian} = shireConfig

    const date = new Date('0001-01-01')
    if (typeof epochGregorian === 'object') date.setUTCFullYear(epochGregorian.year, epochGregorian.month - 1, epochGregorian.day)
    const dateTime = date.getTime()
    const offsetTo1_1_1970 = Math.round(dateTime / Consts.MILLIS_IN_1_DAY)

    const locallyCalculatedOffsetToDayZero = Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970

    expect(locallyCalculatedOffsetToDayZero).toBe(shireConfig.offsetToDayZero)
  })

  it('test shire offsetToDayZero (manually configured for tests)', () => {
    const parseToAbsoluteDays = Dates.parseToAbsoluteDays('1-2. Yule-1', shireConfig)
    expect(parseToAbsoluteDays.days).toBe(shireConfig.offsetToDayZero + 1)
    expect(parseToAbsoluteDays.display).toBe('1-2. Yule-1')
  })


  it('test mayan epoch gregorian', () => {
    const {epochGregorian} = mayanConfig

    const date = new Date('0001-01-01')
    if (typeof epochGregorian === 'object') date.setUTCFullYear(epochGregorian.year, epochGregorian.month - 1, epochGregorian.day)
    const offsetTo1_1_1970 = Math.round(date.getTime() / Consts.MILLIS_IN_1_DAY)

    const locallyCalculatedOffsetToDayZero = Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970

    expect(locallyCalculatedOffsetToDayZero).toBe(mayanConfig.offsetToDayZero)
  })

  it('test mayan offsetToDayZero (manually configured for tests)', () => {
    const parseToAbsoluteDays = Dates.parseToAbsoluteDays('0.0.0.0.0', mayanConfig)
    expect(parseToAbsoluteDays.days).toBe(mayanConfig.offsetToDayZero)
    expect(parseToAbsoluteDays.display).toBe('0.0.0.0.0')
  })


  it('test french revolution epoch gregorian', () => {
    const {epochGregorian} = frenchRevolutionConfig

    const date = new Date('0001-01-01')
    if (typeof epochGregorian === 'object') date.setUTCFullYear(epochGregorian.year, epochGregorian.month - 1, epochGregorian.day)
    const offsetTo1_1_1970 = Math.round(date.getTime() / Consts.MILLIS_IN_1_DAY)

    const locallyCalculatedOffsetToDayZero = Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970

    expect(locallyCalculatedOffsetToDayZero).toBe(frenchRevolutionConfig.offsetToDayZero)
  })

  it('test french revolution offsetToDayZero (manually configured for tests)', () => {
    const parseToAbsoluteDays = Dates.parseToAbsoluteDays('0-leap_days-6', frenchRevolutionConfig)
    expect(parseToAbsoluteDays.days).toBe(frenchRevolutionConfig.offsetToDayZero)
    expect(parseToAbsoluteDays.display).toBe('0-leap_days-6')
  })


})

describe('Creation of axis date description works for', () => {

  const gregorian = (days: number) => Dates.createAxisDateDescription(days, gregorianConfig)
  const french = (days: number) => Dates.createAxisDateDescription(frenchRevolutionConfig.offsetToDayZero + days, frenchRevolutionConfig)

  it('default gregorian dates', () => {
    expect(gregorian(1)).toBe('0001-01-01')
    expect(gregorian(334)).toBe('0001-11-30')
    expect(gregorian(365)).toBe('0001-12-31')
    expect(gregorian(366)).toBe('0002-01-01')
    expect(gregorian(367)).toBe('0002-01-02')
    expect(gregorian(397)).toBe('0002-02-01')
    expect(gregorian(3650)).toBe('0010-12-29')
  })

  it('non-positive gregorian dates', () => {
    expect(gregorian(0)).toBe('0000-12-31')
    expect(gregorian(-1)).toBe('0000-12-30')
    expect(gregorian(-31)).toBe('0000-11-30')
    expect(gregorian(-365)).toBe('0000-01-01') // year zero is a leap year
    expect(gregorian(-366)).toBe('-0001-12-31')
    expect(gregorian(-3650)).toBe('-0009-01-03') // 3 leap years > shift 3 days
  })

  it('default french-revolution dates', () => {
    /* day 1 is 1792-Sep-22 */
    expect(french(1)).toBe('1-Vendémiaire-1')
    expect(french(2)).toBe('1-Vendémiaire-2')
    expect(french(3)).toBe('1-Vendémiaire-3')
    expect(french(31)).toBe('1-Brumaire-1')
    expect(french(61)).toBe('1-Frimaire-1')
    expect(french(365)).toBe('1-leap_days-5')
    expect(french(366)).toBe('1-leap_days-6') // 1792 is leap

    // 2-5 years
    expect(french(365 * 2)).toBe('2-leap_days-4')
    expect(french(365 * 3)).toBe('3-leap_days-4')
    expect(french(365 * 4)).toBe('4-leap_days-4')
    expect(french(365 * 5)).toBe('5-leap_days-4')
    expect(french(365 * 6)).toBe('6-leap_days-3') // skipped 1 leap year
  })

  it('non-positive french-revolution dates', () => {
    expect(french(0)).toBe('0-leap_days-5')
    expect(french(-1)).toBe('0-leap_days-4')
    expect(french(-2)).toBe('0-leap_days-3')
    expect(french(-3)).toBe('0-leap_days-2')
    expect(french(-4)).toBe('0-leap_days-1')

    /* check months */
    expect(french(-34)).toBe('0-Fructidor-1')
    expect(french(-64)).toBe('0-Thermidor-1')
    expect(french(-94)).toBe('0-Messidor-1')
    expect(french(-124)).toBe('0-Prairial-1')
    expect(french(-154)).toBe('0-Floréal-1')
    expect(french(-184)).toBe('0-Germinal-1')
    expect(french(-214)).toBe('0-Ventôse-1')
    expect(french(-244)).toBe('0-Pluviôse-1')
    expect(french(-274)).toBe('0-Nivôse-1')
    expect(french(-304)).toBe('0-Frimaire-1')
    expect(french(-334)).toBe('0-Brumaire-1')
    expect(french(-364)).toBe('0-Vendémiaire-1')
  })
})

describe('Parse date to absolute days works for', () => {

  it('differing formats (gregorian)', () => {
    const expected = 7733
    expect(Dates.parseToAbsoluteDays('0022-3-4', gregorianConfig).days).toBe(expected)
    expect(Dates.parseToAbsoluteDays('022-3-4', gregorianConfig).days).toBe(expected)
    expect(Dates.parseToAbsoluteDays('22-3-4', gregorianConfig).days).toBe(expected)
    expect(Dates.parseToAbsoluteDays('22-03-04', gregorianConfig).days).toBe(expected)
    expect(Dates.parseToAbsoluteDays('22-March-04', gregorianConfig).days).toBe(expected)
    expect(Dates.parseToAbsoluteDays('22-Mar-04', gregorianConfig).days).toBe(expected)
  })

  it('calc base offset', () => {
    let epochDate = new Date('1970-01-01T00:00:00Z')
    let epochDaysOffset = Math.abs(Math.round(epochDate.getTime() / (24 * 60 * 60 * 1000)))
    expect(epochDaysOffset).toBe(0)

    epochDate = new Date('01-30-1970')
    epochDaysOffset = Math.round(epochDate.getTime() / (24 * 60 * 60 * 1000))
    expect(epochDaysOffset).toBe(29)

    epochDate = new Date('01-05-1970')
    epochDaysOffset = Math.round(epochDate.getTime() / (24 * 60 * 60 * 1000))
    expect(epochDaysOffset).toBe(4)

    epochDate = new Date('12-28-1969')
    epochDaysOffset = Math.round(epochDate.getTime() / (24 * 60 * 60 * 1000))
    expect(epochDaysOffset).toBe(-4)

    /* Explicitly pass year, monthIndex (0 = Jan), day  */
    epochDate = new Date()
    epochDate.setFullYear(1, 0, 1)
    epochDaysOffset = Math.round(epochDate.getTime() / (24 * 60 * 60 * 1000))
    expect(epochDaysOffset).toBe(-Consts.DAYS_FROM_1_1_1_TO_1_1_1970 + 1)
  })

  it('default gregorian dates', () => {
    expect(Dates.parseToAbsoluteDays('0001-01-01', gregorianConfig)).toStrictEqual({
      days: 1, display: '1-Jan-1'
    })
    expect(Dates.parseToAbsoluteDays('0001-12-31', gregorianConfig)).toStrictEqual({
      days: 365, display: '1-Dec-31'
    })
    expect(Dates.parseToAbsoluteDays('1970-1-1', gregorianConfig)).toStrictEqual({
      days: Consts.DAYS_FROM_1_1_1_TO_1_1_1970 + 1, display: '1970-Jan-1'
    })
  })

  it('non-positive gregorian dates', () => {
    expect(Dates.parseToAbsoluteDays('0000-12-31', gregorianConfig)).toStrictEqual({
      days: 0, display: '0-Dec-31'
    })
    expect(Dates.parseToAbsoluteDays('0000-01-01', gregorianConfig)).toStrictEqual({
      days: -365, display: '0-Jan-1'
    })
    expect(Dates.parseToAbsoluteDays('1970-1-1', gregorianConfig)).toStrictEqual({
      days: Consts.DAYS_FROM_1_1_1_TO_1_1_1970 + 1, display: '1970-Jan-1'
    })
  })

  it('shire', () => {
    expect(Dates.parseToAbsoluteDays('0001-Afteryule-9', shireConfig)).toStrictEqual({
      days: 2,
      display: '1-Afteryule-9'
    })
  })

  it('should match epoch offset for zero dates', () => {
    expect(Dates.parseToAbsoluteDays('0.0.0.0.1', mayanConfig)).toStrictEqual({
      days: mayanConfig.offsetToDayZero + 1,
      display: '0.0.0.0.1'
    })
  })

  it('have identical output (121548), spot test', () => {
    const expected = 121549
    expect(Dates.parseToAbsoluteDays('333-Oct-16', gregorianConfig).days).toBe(expected)
    expect(Dates.parseToAbsoluteDays('333-Blotmath-20', shireConfig).days).toBe(expected)
    expect(Dates.parseToAbsoluteDays('8.14.17.6.16', mayanConfig).days).toBe(expected)
  })

  it('have identical output (443556), spot test', () => {
    const expected = 443557
    expect(Dates.parseToAbsoluteDays('1215-Jun-2', gregorianConfig).days).toBe(expected)
    expect(Dates.parseToAbsoluteDays('1215-Forelithe-1', shireConfig).days).toBe(expected)
    expect(Dates.parseToAbsoluteDays('10.19.11.14.24', mayanConfig).days).toBe(expected)
  })

  it('have identical output (725957), spot test', () => {
    const expected: number = 725958
    let actual: { days: number; display: string }

    actual = Dates.parseToAbsoluteDays('1988-08-09', gregorianConfig)
    expect(actual.days).toBe(expected)

    actual = Dates.parseToAbsoluteDays('1988-Wedmath-30', shireConfig)
    expect(actual.days).toBe(expected)

    actual = Dates.parseToAbsoluteDays('12.18.16.05.05', mayanConfig)
    expect(actual.days).toBe(expected)
  })

  it('have reversible in- and output', () => {
    const expected = Dates.parseToAbsoluteDays('1970-01-01', gregorianConfig)

    const s = Dates.createAxisDateDescription(expected.days, gregorianConfig)

    expect(s).toBe('1970-01-01')
  })

})

describe('Parse days to date format', () => {

  it('gregorian', () => {
    expect(Dates.createAxisDateDescription(1, gregorianConfig)).toBe('0001-01-01')
  })

  it('shire', () => {
    expect(Dates.createAxisDateDescription(-7, shireConfig)).toBe('1-2. Yule-1')
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

  it('shire dates', () => {
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
