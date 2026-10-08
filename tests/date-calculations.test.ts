import {describe, expect, it} from 'vitest'
import {createAxisDateDescription} from '../src/date-calculations/dates'
import {
  frenchRevolutionConfig,
  gregorianConfig,
  gregorianConfigWithoutYearZero,
  gregorianWithoutMonthsConfig,
  mayanConfig,
  shireConfig
} from './test-configs'
import {Consts} from '../src/const/constants'
import {parseEventDate} from '../src/date-calculations/event-date-input-calc'


describe('Verify test data is configured correctly', () => {

  it('test Gregorian epoch Gregorian', () => {
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

  it('test Gregorian offsetToDayZero (manually configured for tests)', () => {
    const parseToAbsoluteDays = parseEventDate(false, false, '0000-12-31', gregorianConfig)
    expect(parseToAbsoluteDays.days).toBe(gregorianConfig.offsetToDayZero)
    expect(parseToAbsoluteDays.display).toBe('0-Dec-31')
  })


  it('test shire epoch Gregorian', () => {
    const {sharedOffset} = shireConfig

    const date = new Date('0001-01-01')
    if (typeof sharedOffset === 'object') date.setUTCFullYear(sharedOffset.year, sharedOffset.month - 1, sharedOffset.day)
    const dateTime = date.getTime()
    const offsetTo1_1_1970 = Math.round(dateTime / Consts.MILLIS_IN_1_DAY)

    const locallyCalculatedOffsetToDayZero = Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970

    expect(locallyCalculatedOffsetToDayZero).toBe(shireConfig.offsetToDayZero)
  })

  it('test shire offsetToDayZero (manually configured for tests)', () => {
    const parseToAbsoluteDays = parseEventDate(false, false, '1-2. Yule-1', shireConfig)
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
    const parseToAbsoluteDays = parseEventDate(false, false, '0.0.0.0.0', mayanConfig)
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
    const frenchDayOne = parseEventDate(false, false, '1-1-1', frenchRevolutionConfig)
    expect(frenchDayOne.days).toBe(frenchRevolutionConfig.offsetToDayZero + 1)
    expect(frenchDayOne.display).toBe('1-Vendémiaire-1')
  })


})

describe('Creation of axis date description works for', () => {

  const gregorian = (days: number) => createAxisDateDescription(days, gregorianConfig)
  const gregorianWithoutZero = (days: number) => createAxisDateDescription(days, gregorianConfigWithoutYearZero)
  const french = (days: number) => createAxisDateDescription(frenchRevolutionConfig.offsetToDayZero + days, frenchRevolutionConfig)

  it('positive Gregorian dates (iso-8601)', () => {
    expect(gregorian(1)).toBe('0001-Jan-01')
    expect(gregorian(59)).toBe('0001-Feb-28')
    expect(gregorian(60)).toBe('0001-Mar-01') // not a leap year
    expect(gregorian(334)).toBe('0001-Nov-30')
    expect(gregorian(365)).toBe('0001-Dec-31')
    expect(gregorian(366)).toBe('0002-Jan-01')
    expect(gregorian(367)).toBe('0002-Jan-02')
    expect(gregorian(397)).toBe('0002-Feb-01')
    expect(gregorian(3650)).toBe('0010-Dec-29')
  })

  it('non-positive Gregorian dates (iso-8601)', () => {
    expect(gregorian(0)).toBe('0000-Dec-31')
    expect(gregorian(-1)).toBe('0000-Dec-30')
    expect(gregorian(-2)).toBe('0000-Dec-29')
    expect(gregorian(-3)).toBe('0000-Dec-28')
    expect(gregorian(-31)).toBe('0000-Nov-30')
    expect(gregorian(-305)).toBe('0000-Mar-01')
    expect(gregorian(-306)).toBe('0000-Feb-29') // year zero is a leap year
    expect(gregorian(-365)).toBe('0000-Jan-01')
    expect(gregorian(-366)).toBe('-0001-Dec-31')
    expect(gregorian(-3650)).toBe('-0009-Jan-03') // 3 leap years > shift 3 days
  })

  it('positive Gregorian dates (natural)', () => {
    expect(gregorianWithoutZero(1)).toBe('0001-Jan-01')
    expect(gregorianWithoutZero(59)).toBe('0001-Feb-28')
    expect(gregorianWithoutZero(60)).toBe('0001-Mar-01') // not a leap year
    expect(gregorianWithoutZero(334)).toBe('0001-Nov-30')
    expect(gregorianWithoutZero(365)).toBe('0001-Dec-31')
    expect(gregorianWithoutZero(366)).toBe('0002-Jan-01')
    expect(gregorianWithoutZero(367)).toBe('0002-Jan-02')
    expect(gregorianWithoutZero(397)).toBe('0002-Feb-01')
    expect(gregorianWithoutZero(3650)).toBe('0010-Dec-29')
  })

  it('non-positive Gregorian dates (natural)', () => {
    expect(gregorianWithoutZero(0)).toBe('-0001-Dec-31')
    expect(gregorianWithoutZero(-1)).toBe('-0001-Dec-30')
    expect(gregorianWithoutZero(-2)).toBe('-0001-Dec-29')
    expect(gregorianWithoutZero(-3)).toBe('-0001-Dec-28')
    expect(gregorianWithoutZero(-31)).toBe('-0001-Nov-30')
    expect(gregorianWithoutZero(-305)).toBe('-0001-Mar-01')
    expect(gregorianWithoutZero(-306)).toBe('-0001-Feb-29') // year zero is a leap year
    expect(gregorianWithoutZero(-365)).toBe('-0001-Jan-01')
    expect(gregorianWithoutZero(-366)).toBe('-0002-Dec-31')
    expect(gregorianWithoutZero(-3650)).toBe('-0010-Jan-03') // 3 leap years > shift 3 days
  })

  it('default french-revolution dates', () => {
    /* day 1 is 1792-Sep-22 */
    expect(french(1)).toBe('0001-Vendémiaire-01')
    expect(french(2)).toBe('0001-Vendémiaire-02')
    expect(french(3)).toBe('0001-Vendémiaire-03')
    expect(french(31)).toBe('0001-Brumaire-01')
    expect(french(61)).toBe('0001-Frimaire-01')
    expect(french(365)).toBe('0001-leap_days-05')
    expect(french(366)).toBe('0001-leap_days-06') // 1792 is leap
    // 2-5 years
    expect(french(365 * 2)).toBe('0002-leap_days-04')
    expect(french(365 * 3)).toBe('0003-leap_days-04')
    expect(french(365 * 4)).toBe('0004-leap_days-04')
    expect(french(365 * 5)).toBe('0005-leap_days-04')
    expect(french(365 * 6)).toBe('0006-leap_days-03') // skipped 1 leap year
  })

  it('non-positive french-revolution dates', () => {
    expect(french(0)).toBe('0000-leap_days-05')
    expect(french(-1)).toBe('0000-leap_days-04')
    expect(french(-2)).toBe('0000-leap_days-03')
    expect(french(-3)).toBe('0000-leap_days-02')
    expect(french(-4)).toBe('0000-leap_days-01')

    /* check months */
    expect(french(-34)).toBe('0000-Fructidor-01')
    expect(french(-64)).toBe('0000-Thermidor-01')
    expect(french(-94)).toBe('0000-Messidor-01')
    expect(french(-124)).toBe('0000-Prairial-01')
    expect(french(-154)).toBe('0000-Floréal-01')
    expect(french(-184)).toBe('0000-Germinal-01')
    expect(french(-214)).toBe('0000-Ventôse-01')
    expect(french(-244)).toBe('0000-Pluviôse-01')
    expect(french(-274)).toBe('0000-Nivôse-01')
    expect(french(-304)).toBe('0000-Frimaire-01')
    expect(french(-334)).toBe('0000-Brumaire-01')
    expect(french(-364)).toBe('0000-Vendémiaire-01')
  })
})


describe('Parse days to date format', () => {

  it('Gregorian', () => {
    expect(createAxisDateDescription(1, gregorianConfig)).toBe('0001-Jan-01')
  })

  it('Gregorian without months', () => {
    expect(createAxisDateDescription(1, gregorianWithoutMonthsConfig)).toBe('0001.01')
    expect(createAxisDateDescription(2, gregorianWithoutMonthsConfig)).toBe('0001.02')
    expect(createAxisDateDescription(3, gregorianWithoutMonthsConfig)).toBe('0001.03')

    expect(createAxisDateDescription(1 + 2 * 365, gregorianWithoutMonthsConfig)).toBe('0003.01')
    expect(createAxisDateDescription(2 + 2 * 365, gregorianWithoutMonthsConfig)).toBe('0003.02')
    expect(createAxisDateDescription(3 + 2 * 365, gregorianWithoutMonthsConfig)).toBe('0003.03')

    /* add 400 years + 97 leap days */
    expect(createAxisDateDescription(1 + 400 * 365 + 97, gregorianWithoutMonthsConfig)).toBe('0401.01')
    expect(createAxisDateDescription(1 + 400 * 365 + 97 + 222, gregorianWithoutMonthsConfig)).toBe('0401.223')

  })

  it('shire', () => {
    expect(createAxisDateDescription(-7, shireConfig)).toBe('0001-2. Yule-01')
  })

  it('have reversible in- and output', () => {
    const expected = parseEventDate(false, false, '1970-01-01', gregorianConfig)

    const s = createAxisDateDescription(expected.days, gregorianConfig)

    expect(s).toBe('1970-Jan-01')
  })

})

