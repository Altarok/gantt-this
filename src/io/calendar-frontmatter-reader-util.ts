import {Consts} from "../const/strings"

/*
 * Run once on creation instead of millions of times for each zoom/pan/whatever
 */
export function runOffsetCalculations(epochGregorian: { year: number, month: number, day: number } | number): number {

  if (typeof epochGregorian === 'number') {
    return epochGregorian
  } else if (epochGregorian && typeof epochGregorian === 'object') {
    const year = epochGregorian.year ?? 1 // keep zero if given
    const month = epochGregorian.month || 1
    const day = epochGregorian.day || 1

    // Date.UTC() correctly handles 0001-0099 without shifting to 1900s
    const date = new Date('0001-01-01T00:00:00Z')
    date.setUTCFullYear(year, month - 1, day)
    const dateTime = date.getTime()
    const offsetTo1_1_1970 = Math.round(dateTime / Consts.MILLIS_IN_1_DAY)
    return Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970
  } else {
    return 0
  }
}
