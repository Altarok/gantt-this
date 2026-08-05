import {Consts} from '../const/constants'

/**
 * Calculates base offset for calendar definitions.
 * This is a different static value for each calendar telling you the offset to the base calendar used for calculations (gregorian).
 * Runs once on creation instead of millions of times for each zoom/pan/whatever.
 * <p>
 * Calculates offset to gregorian day 0 (1 BC December 31).
 */
export function runOffsetCalculations(epochGregorian: { year: number, month: number, day: number } | number): number {

  if (typeof epochGregorian === 'number') {
    return epochGregorian
  } else if (epochGregorian && typeof epochGregorian === 'object') {
    const year = epochGregorian.year ?? 1 // keep zero if given
    const month = (!epochGregorian.month || epochGregorian.month < 1) ? 1 : epochGregorian.month
    const day = (!epochGregorian.day || epochGregorian.day < 1) ? 1 : epochGregorian.day

    // Date.UTC() correctly handles 0001-0099 without shifting to 1900s
    const utcDate = new Date('0001-01-01T00:00:00Z')
    utcDate.setUTCFullYear(year, month - 1, day)
    const dateTime = utcDate.getTime()
    const offsetTo1_1_1970 = Math.round(dateTime / Consts.MILLIS_IN_1_DAY)
    return Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970
  } else {
    return 0
  }
}
