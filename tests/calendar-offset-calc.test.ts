import {describe, expect, it} from 'vitest'
import {
  frenchRevolutionConfig,
  gregorianConfig,
  gregorianWithoutMonthsConfig,
  mayanConfig,
  shireConfig
} from './test-configs'
import {runOffsetCalculations} from '../src/date-calculations/calendar-offset-calc'

describe('Calendar offset calculations are done correctly for', () => {

  it('gregorian calendar', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(gregorianConfig.epochGregorian)
    expect(calculatedOffsetToDayZero).toBe(gregorianConfig.offsetToDayZero)
    expect(calculatedOffsetToDayZero).toBe(0)
  })


  it('gregorian calendar without months', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(gregorianWithoutMonthsConfig.epochGregorian)
    expect(calculatedOffsetToDayZero).toBe(gregorianWithoutMonthsConfig.offsetToDayZero)
    expect(calculatedOffsetToDayZero).toBe(0)
  })

  it('shire calendar', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(shireConfig.epochGregorian)
    expect(calculatedOffsetToDayZero).toBe(shireConfig.offsetToDayZero)
    expect(calculatedOffsetToDayZero).toBe(-8)
  })

  it('mayan calendar', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(mayanConfig.epochGregorian)
    expect(calculatedOffsetToDayZero).toBe(mayanConfig.offsetToDayZero)
    expect(calculatedOffsetToDayZero).toBe(-1_137_507)
  })

  it('french revolution calendar', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(frenchRevolutionConfig.epochGregorian)
    expect(calculatedOffsetToDayZero).toBe(frenchRevolutionConfig.offsetToDayZero)
    expect(calculatedOffsetToDayZero).toBe(654_415)
  })

  it('mock data (null)', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(null)
    expect(calculatedOffsetToDayZero).toBe(0)
  })

  /*
   * Month and day must be greater than zero
   */
  it('mock data (month and day get switched to 1)', () => {
    let calculatedOffsetToDayZero = runOffsetCalculations({year: 0, month: 0, day: 0})
    // = 0000-01-01
    expect(calculatedOffsetToDayZero).toBe(-365)

    calculatedOffsetToDayZero = runOffsetCalculations({year: 0, month: -3, day: -12})
    // = 0000-01-01
    expect(calculatedOffsetToDayZero).toBe(-365)
  })

})

