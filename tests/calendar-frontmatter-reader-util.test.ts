import {describe, expect, it} from 'vitest'
import {frenchRevolutionConfig, gregorianConfig, mayanConfig, shireConfig} from './test-configs'
import {runOffsetCalculations} from '../src/io/calendar-frontmatter-reader-util'

describe('Calendar offset calculations are done correctly for', () => {

  it('gregorian calendar', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(gregorianConfig.epochGregorian)
    expect(calculatedOffsetToDayZero).toBe(gregorianConfig.offsetToDayZero)
    expect(calculatedOffsetToDayZero).toBe(0)
  })

  it('shire calendar', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(shireConfig.epochGregorian)
    expect(calculatedOffsetToDayZero).toBe(shireConfig.offsetToDayZero)
  })

  it('mayan calendar', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(mayanConfig.epochGregorian)
    expect(calculatedOffsetToDayZero).toBe(mayanConfig.offsetToDayZero)
  })

  it('french revolution calendar', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(frenchRevolutionConfig.epochGregorian)
    expect(calculatedOffsetToDayZero).toBe(frenchRevolutionConfig.offsetToDayZero)
  })

  it('mock data (null)', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations(null)
    expect(calculatedOffsetToDayZero).toBe(0)
  })

  /*
   * Month and day get switched to 1. So 0-0-0 means January 1 (1 BC / Year 0).
   */
  it('mock data (month and day get switched to 1)', () => {
    const calculatedOffsetToDayZero = runOffsetCalculations({year: 0, month: 0, day: 0})
    expect(calculatedOffsetToDayZero).toBe(-365)
  })

})

