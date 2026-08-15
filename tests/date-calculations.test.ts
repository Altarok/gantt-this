import {describe, expect, it} from 'vitest'
import {createAxisDateDescription} from '../src/util/dates'
import {
  frenchRevolutionConfig,
  gregorianConfig,
  gregorianWithoutMonthsConfig,
  mayanConfig,
  shireConfig
} from './test-configs'
import {Consts} from '../src/const/constants'
import {parseEventDate} from '../src/date-calculations/event-date-input-calc'


describe('Verify test data is configured correctly', () => {

  it('test gregorian epoch gregorian', () => {
    const {sharedOffset} = gregorianConfig

    let offsetTo1_1_1970 = 0
    if (typeof sharedOffset === 'number') {
      offsetTo1_1_1970 = sharedOffset
    } else if (typeof sharedOffset === 'object') {
      const date = new Date('0001-01-01')
      date.setUTCFullYear(sharedOffset.year!, (sharedOffset.month ?? 1) - 1, sharedOffset.day ?? 1)
      offsetTo1_1_1970 = Math.round(date.getTime() / Consts.MILLIS_IN_1_DAY)
    }

    const locallyCalculatedOffsetToDayZero = typeof sharedOffset === 'number'
      ? sharedOffset
      : Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970

    expect(locallyCalculatedOffsetToDayZero).toBe(gregorianConfig.offsetToDayZero)
  })

  it('test gregorian offsetToDayZero (manually configured for tests)', () => {
    const parseToAbsoluteDays = parseEventDate('0000-12-31', gregorianConfig)
    expect(parseToAbsoluteDays.days).toBe(gregorianConfig.offsetToDayZero)
    expect(parseToAbsoluteDays.display).toBe('0-Dec-31')
  })


  it('test shire epoch gregorian', () => {
    const {sharedOffset} = shireConfig

    const date = new Date('0001-01-01')
    if (typeof sharedOffset === 'object') date.setUTCFullYear(sharedOffset.year, sharedOffset.month - 1, sharedOffset.day)
    const dateTime = date.getTime()
    const offsetTo1_1_1970 = Math.round(dateTime / Consts.MILLIS_IN_1_DAY)

    const locallyCalculatedOffsetToDayZero = Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970

    expect(locallyCalculatedOffsetToDayZero).toBe(shireConfig.offsetToDayZero)
  })

  it('test shire offsetToDayZero (manually configured for tests)', () => {
    const parseToAbsoluteDays = parseEventDate('1-2. Yule-1', shireConfig)
    expect(parseToAbsoluteDays.days).toBe(shireConfig.offsetToDayZero + 1)
    expect(parseToAbsoluteDays.display).toBe('1-2. Yule-1')
  })


  it('test mayan epoch gregorian', () => {
    const {sharedOffset} = mayanConfig

    const date = new Date('0001-01-01')
    if (typeof sharedOffset === 'object') date.setUTCFullYear(sharedOffset.year, sharedOffset.month - 1, sharedOffset.day)
    const offsetTo1_1_1970 = Math.round(date.getTime() / Consts.MILLIS_IN_1_DAY)

    const locallyCalculatedOffsetToDayZero = Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970

    expect(locallyCalculatedOffsetToDayZero).toBe(mayanConfig.offsetToDayZero)
  })

  it('test mayan offsetToDayZero (manually configured for tests)', () => {
    const parseToAbsoluteDays = parseEventDate('0.0.0.0.0', mayanConfig)
    expect(parseToAbsoluteDays.days).toBe(mayanConfig.offsetToDayZero)
    expect(parseToAbsoluteDays.display).toBe('0.0.0.0.0')
  })


  it('test french revolution epoch gregorian', () => {
    const {sharedOffset} = frenchRevolutionConfig

    const date = new Date('0001-01-01')
    if (typeof sharedOffset === 'object') date.setUTCFullYear(sharedOffset.year, sharedOffset.month - 1, sharedOffset.day)
    const offsetTo1_1_1970 = Math.round(date.getTime() / Consts.MILLIS_IN_1_DAY)

    const locallyCalculatedOffsetToDayZero = Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970

    expect(locallyCalculatedOffsetToDayZero).toBe(frenchRevolutionConfig.offsetToDayZero)
  })

  it('test french revolution offsetToDayZero (manually configured for tests)', () => {
    const parseToAbsoluteDays = parseEventDate('0-leap_days-6', frenchRevolutionConfig)
    expect(parseToAbsoluteDays.days).toBe(frenchRevolutionConfig.offsetToDayZero)
    expect(parseToAbsoluteDays.display).toBe('0-leap_days-6')
  })


})

describe('Creation of axis date description works for', () => {

  const gregorian = (days: number) => createAxisDateDescription(days, gregorianConfig)
  const french = (days: number) => createAxisDateDescription(frenchRevolutionConfig.offsetToDayZero + days, frenchRevolutionConfig)

  it('default gregorian dates', () => {
    expect(gregorian(1)).toBe('0001-Jan-01')
    expect(gregorian(334)).toBe('0001-Nov-30')
    expect(gregorian(365)).toBe('0001-Dec-31')
    expect(gregorian(366)).toBe('0002-Jan-01')
    expect(gregorian(367)).toBe('0002-Jan-02')
    expect(gregorian(397)).toBe('0002-Feb-01')
    expect(gregorian(3650)).toBe('0010-Dec-29')
  })

  it('non-positive gregorian dates', () => {
    expect(gregorian(0)).toBe('0000-Dec-31')
    expect(gregorian(-1)).toBe('0000-Dec-30')
    expect(gregorian(-31)).toBe('0000-Nov-30')
    expect(gregorian(-365)).toBe('0000-Jan-01') // year zero is a leap year
    expect(gregorian(-366)).toBe('-0001-Dec-31')
    expect(gregorian(-3650)).toBe('-0009-Jan-03') // 3 leap years > shift 3 days
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


describe('Parse days to date format', () => {

  it('gregorian', () => {
    expect(createAxisDateDescription(1, gregorianConfig)).toBe('0001-Jan-01')
  })

  it('gregorian without months', () => {
    expect(createAxisDateDescription(1, gregorianWithoutMonthsConfig)).toBe('1.1')
    expect(createAxisDateDescription(2, gregorianWithoutMonthsConfig)).toBe('1.2')
    expect(createAxisDateDescription(3, gregorianWithoutMonthsConfig)).toBe('1.3')

    expect(createAxisDateDescription(1 + 2 * 365, gregorianWithoutMonthsConfig)).toBe('3.1')
    expect(createAxisDateDescription(2 + 2 * 365, gregorianWithoutMonthsConfig)).toBe('3.2')
    expect(createAxisDateDescription(3 + 2 * 365, gregorianWithoutMonthsConfig)).toBe('3.3')

    /* add 400 years + 97 leap days */
    expect(createAxisDateDescription(1 + 400 * 365 + 97, gregorianWithoutMonthsConfig)).toBe('401.1')
    expect(createAxisDateDescription(1 + 400 * 365 + 97 + 222, gregorianWithoutMonthsConfig)).toBe('401.223')

  })

  it('shire', () => {
    expect(createAxisDateDescription(-7, shireConfig)).toBe('1-2. Yule-1')
  })

  it('have reversible in- and output', () => {
    const expected = parseEventDate('1970-01-01', gregorianConfig)

    const s = createAxisDateDescription(expected.days, gregorianConfig)

    expect(s).toBe('1970-Jan-01')
  })

})

