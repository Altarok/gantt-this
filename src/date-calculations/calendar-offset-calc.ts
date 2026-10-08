import {Consts} from '../const/constants'
import {EpochOffsetDefinition} from '../const/types'

/**
 * Calculates base offset for calendar definitions.
 * This is a different static value for each calendar telling you the offset to the base calendar used for calculations (gregorian).
 * Runs once on creation instead of millions of times for each zoom/pan/whatever.
 * <p>
 * Calculates offset to gregorian day 0 (1 BC / Year 0, December 31).
 *
 * @param offsetConfig = { year: number, month: number, day: number } | number, defined by user
 */
export function runOffsetCalculations(offsetConfig?: EpochOffsetDefinition): number {
  if (typeof offsetConfig === 'number') return offsetConfig
  if (!offsetConfig || typeof offsetConfig !== 'object') return 0

  const year = offsetConfig.year ?? 1 // keep zero if given
  const month = Math.max(1, offsetConfig.month ?? 1)
  const day = Math.max(1, offsetConfig.day ?? 1)

  // Date.UTC() correctly handles 0001-0099 without shifting to 1900s
  const utcDate = new Date('0001-01-01T00:00:00Z')
  utcDate.setUTCFullYear(year, month - 1, day)
  const dateTime = utcDate.getTime()
  const offsetTo1_1_1970 = Math.round(dateTime / Consts.MILLIS_IN_1_DAY)
  return Consts.DAYS_FROM_0_12_31_TO_1_1_1970 + offsetTo1_1_1970
}
