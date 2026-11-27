import {FrontMatterCache, TFile} from 'obsidian'

export const NO_GROUP = ''
export const DEFAULT_TIMESPAN = 'bar'
export const DEFAULT_TIMESTAMP = 'point'

/** Timespans go from a start date to an end date */
const GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESPANS = [DEFAULT_TIMESPAN, 'era'] as const
export type GanttItemDisplayTypeTimespans = (typeof GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESPANS)[number]

/** Timespans only have a start date */
export const GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP = [DEFAULT_TIMESTAMP,
  'triangle',
  'box',
  'diamond',
  'pentagon',
  'hexagon',
  'octagon',
  'star',
  'vertical-line'] as const
export type GanttItemDisplayTypeTimestamp = (typeof GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP)[number]

export type GanttItemDisplayType = GanttItemDisplayTypeTimespans | GanttItemDisplayTypeTimestamp

const TIMESPAN_SHAPE_SET = new Set<string>(GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESPANS)
const TIMESTAMP_SHAPE_SET = new Set<string>(GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP)

export function isTimespan(value: string): value is GanttItemDisplayTypeTimespans {
  return TIMESPAN_SHAPE_SET.has(value)
}

export function isTimestamp(value: string): value is GanttItemDisplayTypeTimestamp {
  return TIMESTAMP_SHAPE_SET.has(value)
}

export type Step = 'day' /* always works */
  | 'year' /* works only for year-based calendars */

export type RepeatRule = {
  delta: number
  step: Step
  /** Start of repetitions. Absolute day on timeline, or negative infinity. */
  startDay: number
  /** End of repetitions. Absolute day on timeline, or positive infinity. */
  endDay: number
}

export type TimeOfDayParsed = {
  input: string
  value: number /* 0 < x < 1 */
  timeOfDayFractions: { nominator: number, denominator: number }[]
}

export type ParsedDate = {
  /** Absolute offset to day 0 of the event's relative calendar. */
  days: number
  /** Human-readable display of date. May include (short) month names if given. */
  display: string
  repeatRule?: RepeatRule
  timeOfDay?: TimeOfDayParsed
}

export type EventId = string

/** Calendar event */
export type GanttItem = {
  id: EventId
  name: string
  startDateDisplay: string /* human-readable for UI */
  endDateDisplay: string
  startDays: number /* Quantized timeline tracking unit: Days from default point zero */
  endDays: number
  get startDay(): number
  get endDay(): number
  startTimeOfDay: TimeOfDayParsed
  endTimeOfDay: TimeOfDayParsed
  group: string
  displayType: GanttItemDisplayType
  displayIcon?: string /* SVG icon ID */
  displayIconColor: string
  calendarType: string
  color?: string
  link?: string
  lane?: number
  frontMatter: FrontMatterCache
  file: TFile
  predecessors: EventId[] // IDs of predecessor GanttItems
  successors: EventId[] // IDs of successors GanttItems

  /* stuff for repetition: */
  repeatRule?: RepeatRule
  // repeatEveryDays?: number // X interval in days from your regex
  // repeatUntilDays?: number // Optional upper end bound for recurrence
  isRecurringInstance?: boolean
  parentEventId?: EventId

  get startDayWithTimeOfDay(): number
  get endDayWithTimeOfDay(): number
  clone(startDays: number, duration: number): GanttItem
}

