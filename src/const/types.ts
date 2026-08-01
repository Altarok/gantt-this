export const CALENDAR_CONFIG_TYPES = [
  'positional',
  'rule-based',
  'gregorian' /* default value */
] as const
export type CalendarConfigType = (typeof CALENDAR_CONFIG_TYPES)[number]

export function isCalendarIdentifier(value: string): value is CalendarConfigType {
  return (CALENDAR_CONFIG_TYPES as readonly string[]).includes(value)
}

export type DateFormatComponent = 'year' | 'month' | 'day' | 'intercalary'

export type MonthDefinition = {
  name: string
  shortname?: string
  days: number
  /* For calendars like the Hobbit/Shire calendar where mid-year festivals or Yule days sit between months and don't belong to any month. */
  isIntercalary?: boolean
}

/*
 * 'gregorian' rule or a custom fantasy rule frequency like 'every-4-years-except-100'
 */
export type LeapYearRule = {
  ruleType: 'gregorian' | 'interval' | 'none'
  intervalYears?: number
  extraDays?: number
  applyToMonthIndex?: number /* Which month gets the leap day (e.g., February / index 1) */
}

export type RuleBasedDetails = {
  months: MonthDefinition[]
  leapYearRule?: LeapYearRule
  daysInStandardYear: number
  /**
   * Defines the order of elements in the date string.
   * For '1420-Afterlithe-21', format is ['year', 'month', 'day']
   * For '195-2026' (Ordinal), format is ['day', 'year']
   */
  format: DateFormatComponent[]
}

export type CalendarConfig = {
  id: string
  name: string
  epochGregorian: string
  type: CalendarConfigType
  delimiter: string
  positionalUnits?: {
    name: string
    days: number
  }[]

  /* Used if type === 'rule-based' (Gregorian, Hobbit, Elven, etc.) */
  ruleBasedDetails?: RuleBasedDetails
}

/** Calendar event display type */
export const GANTT_ITEM_DISPLAY_TYPE = [
  'bar', 'point', /* = default values */
  'icon', /* = must be accompanied by a lucide-dev icon */
  'era', /* = must be accompanied by differing start and end dates */
  'diamond'] as const
export type GanttItemDisplayType = (typeof GANTT_ITEM_DISPLAY_TYPE)[number]

export function isGanttItemDisplayType(value: string): value is GanttItemDisplayType {
  return (GANTT_ITEM_DISPLAY_TYPE as readonly string[]).includes(value)
}

/** Calendar event */
export type GanttItem = {
  id: number
  name: string
  startDateDisplay: string /* human-readable for UI */
  endDateDisplay: string
  startDays: number /* Quantized timeline tracking unit: Days from default point zero */
  endDays: number
  group: string
  displayType: GanttItemDisplayType
  displayIcon?: string /* lucide-dev icon */
  displayIconColor?: string
  calendarType: string
  color?: string
  link?: string
  lane?: number
}

export type GanttGroup = {
  name: string
  items: GanttItem[]
  yOffset: number
  height: number
  lanes: number
}

export type GroupOrCalendarSettings = {
  id: string
  visible: boolean
  color?: string
  priority?: number
}

export type PluginSettings = {
  eventPath: string
  eventPathSearchRecursive: boolean
  calendarPath: string
  calendarPathSearchRecursive: boolean
  defaultCalendar: string
  fallbackColor: string
  calendars: GroupOrCalendarSettings[]
  groups: GroupOrCalendarSettings[]
  placeholder: number
  mouseOverEventShowBox: boolean
  mouseOverEventShowVerticalLine: boolean
  showButtonsToHideGroups: boolean

  frontMatterProperty_manual_override: boolean
  frontMatterProperty_gantt_this: string
  frontMatterProperty_calendar_name: string
  frontMatterProperty_event_time_start: string
  frontMatterProperty_event_time_end: string
  frontMatterProperty_event_name: string
  frontMatterProperty_event_color: string,
  frontMatterProperty_event_group: string
  frontMatterProperty_event_symbol: string
  frontMatterProperty_event_calendar: string
  frontMatterProperty_event_icon_name: string
  frontMatterProperty_event_icon_color: string
  frontMatterProperty_note_header: string
}

export const DEFAULT_SETTINGS: PluginSettings = {
  eventPath: '/',
  eventPathSearchRecursive: false,
  calendarPath: '/',
  calendarPathSearchRecursive: false,
  defaultCalendar: 'gregorian',
  fallbackColor: '#1565c0',
  calendars: [
    {id: 'gregorian', visible: true, priority: 0},
  ],
  groups: [],
  placeholder: 0,
  mouseOverEventShowBox: true,
  mouseOverEventShowVerticalLine: false,
  showButtonsToHideGroups: false,

  frontMatterProperty_manual_override: false,
  frontMatterProperty_gantt_this: 'gantt-item', // boolean; "activates" file as event source
  frontMatterProperty_calendar_name: 'gantt-type-definition', // string; "activates" file as calendar source
  frontMatterProperty_event_calendar: 'gantt-type', // name of matching calendar or 'gregorian'

  frontMatterProperty_event_time_start: 'gantt-start', // start of event (or timestamp if no end is given )
  frontMatterProperty_event_time_end: 'gantt-end', // ... or time.start
  frontMatterProperty_event_name: 'gantt-name', // ... or filename
  frontMatterProperty_event_color: 'gantt-color', // hex value | human-readable color  ... or global fallback color
  frontMatterProperty_event_group: 'gantt-group', // ... or 'general'
  frontMatterProperty_event_symbol: 'gantt-symbol', // diamond ... or auto-(bar | point)
  frontMatterProperty_event_icon_name: 'gantt-displayIcon', // icon name from https://lucide.dev
  frontMatterProperty_event_icon_color: 'gantt-displayIconColor',  // color for said icon
  frontMatterProperty_note_header: 'gantt-linkToHeader', // note-internal header to link to

}

