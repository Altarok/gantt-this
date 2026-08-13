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

export type Moon = {
  offset: number
  cycle: number
  color?: string
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

export type EpochOffsetDefinition = { year: number, month: number, day: number } | number

/**
 * This one has to be implemented by the user inside a Markdown note.
 */
export type CalendarConfig = {
  id: string
  name?: string
  displayName?: string
  /* Defined by user, in Markdown file. Not to be used during zooming/panning calculation. */
  sharedOffset: EpochOffsetDefinition
  startDay?: EpochOffsetDefinition
  endDay?: EpochOffsetDefinition
  /* Not defined by user, calculated based on shared offset */
  offsetToDayZero: number /* offset to 1 AD January 1, calculated by plugin, not defined in Markdown */
  type: CalendarConfigType
  delimiter: string
  positionalUnits?: {
    name: string
    days: number
  }[]
  /* Used if type === 'rule-based' (Gregorian, Hobbit, Elven, etc.) */
  ruleBasedDetails?: RuleBasedDetails
  bcSuffix?: string
  adSuffix?: string
  moons?: Moon[]
}

const DEFAULT_TIMESPAN = 'bar'
const DEFAULT_TIMESTAMP = 'point'

/** Timespans go from a start date to an end date */
const GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESPANS = [DEFAULT_TIMESPAN, 'era'] as const
/** Timespans only have a start date */
const GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP = [DEFAULT_TIMESTAMP, 'box', 'vertical-line', 'diamond', 'triangle', 'hexagon', 'pentagon'] as const

type GanttItemDisplayTypeTimespans = (typeof GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESPANS)[number]
type GanttItemDisplayTypeTimestamp = (typeof GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP)[number]

export type GanttItemDisplayType = GanttItemDisplayTypeTimespans | GanttItemDisplayTypeTimestamp

function isGanttItemDisplayTypeTimespan(value: string): value is GanttItemDisplayTypeTimespans {
  return GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESPANS.includes(value as GanttItemDisplayTypeTimespans)
}

function isGanttItemDisplayTypeTimestamp(value: string): value is GanttItemDisplayTypeTimestamp {
  return GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP.includes(value as GanttItemDisplayTypeTimestamp)
}

/** Calendar event display types */
export const GanttItemDisplayTypes = {
  DEFAULT_TIMESPAN, DEFAULT_TIMESTAMP,
  GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESPANS, GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP,
  isTimespan: isGanttItemDisplayTypeTimespan,
  isTimestamp: isGanttItemDisplayTypeTimestamp
}

export type ParsedDate = {
  /** Absolute offset to day 0 of the event's relative calendar. */
  days: number
  /** Human-readable display of date. May include (short) month names if given. */
  display: string
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

export type GanttChartDateBound = string | number

export type GanttChartSources = {
  eventPath: string,
  eventPathSearchRecursive: boolean,
  calendarPath: string,
  calendarPathSearchRecursive: boolean,
}

export type CodeBlockContent = Partial<GanttChartSources> & {
  lowerBoundDate?: GanttChartDateBound
  centerHereDate?: GanttChartDateBound
  upperBoundDate?: GanttChartDateBound
  lowerBoundDateParsed?: ParsedDate
  centerHereDateParsed?: ParsedDate
  upperBoundDateParsed?: ParsedDate
  calendar?: string
}

export type GanttChartButtonSelection = {
  showEras: boolean
  showBars: boolean
  showPoints: boolean
  enableGrouping: boolean
}

export type GanttChartConfig = GanttChartButtonSelection & CodeBlockContent & {
  rowHeight: number,
  groupHeaderHeight: number,
  singleAxisHeight: number,
  margin: { top: number, right: number, bottom: number, left: number }
}

export type PluginSettings = GanttChartSources & {
  defaultCalendar: string
  fallbackColor: string
  fallbackColorForIcons: string
  calendars: GroupOrCalendarSettings[]
  groups: GroupOrCalendarSettings[]

  /*
   * Advanced UX settings
   */
  uxAddRibbonIcon: boolean
  uxAddCommands: boolean
  mouseOverEventShowBox: boolean
  mouseOverEventShowVerticalLine: boolean
  showButtonsToHideGroups: boolean
  uxVerticalLineEventWidth: number
  autoRestrictZoom: boolean
  uxOverrideNoteScrollInCalendar: boolean
  uxSwitchZoomAndPan: boolean
  uxUseCalColorForCalAxis: boolean

  /*
   * Front-matter property names
   */
  frontMatterProperty_calendar_name: string

  frontMatterProperty_gantt_this: string
  frontMatterProperty_event_time_start: string
  frontMatterProperty_event_time_end: string
  frontMatterProperty_event_name: string
  frontMatterProperty_event_color: string
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
  fallbackColor: '#1565C0',
  fallbackColorForIcons: '#FF8800',
  calendars: [
    {id: 'gregorian', visible: true, priority: 0},
  ],
  groups: [],

  /*
   * Advanced UX settings
   */
  uxAddRibbonIcon: false,
  uxAddCommands: true,
  mouseOverEventShowBox: true,
  mouseOverEventShowVerticalLine: false,
  showButtonsToHideGroups: false,
  uxVerticalLineEventWidth: 3,
  autoRestrictZoom: true,
  uxOverrideNoteScrollInCalendar: true,
  uxSwitchZoomAndPan: false,
  uxUseCalColorForCalAxis: false,

  /*
   * Front-matter property names
   */
  frontMatterProperty_calendar_name: 'gantt-type-definition', // string, activates file as calendar source

  frontMatterProperty_gantt_this: 'gantt-item', // boolean, activates file as event source
  frontMatterProperty_event_calendar: 'gantt-type', // name of matching calendar or 'gregorian'
  frontMatterProperty_event_time_start: 'gantt-start', // start of event (or timestamp if no end is given )
  frontMatterProperty_event_time_end: 'gantt-end', // ... or time.start
  frontMatterProperty_event_name: 'gantt-name', // ... or filename
  frontMatterProperty_event_color: 'gantt-color', // hex value | human-readable color  ... or global fallback color
  frontMatterProperty_event_group: 'gantt-group', // ... or 'general'
  frontMatterProperty_event_symbol: 'gantt-symbol', // diamond ... or auto-(bar | point)
  frontMatterProperty_event_icon_name: 'gantt-displayIcon', // icon name from https://lucide.dev
  frontMatterProperty_event_icon_color: 'gantt-displayIconColor',  // color for said icon
  frontMatterProperty_note_header: 'gantt-linkToHeader' // note-internal header to link to


} as const

/**  Data updated on a redraw, not while panning or zooming */
export type GroupOrCalendarDrawerData = {
  y1: number
  y2: number
}
/**  Data updated on a redraw, not while panning or zooming */
export type SvgDrawerData = {
  mappedGrpConfigs: Record<string, GroupOrCalendarSettings>
  mappedCalConfigs: Record<string, GroupOrCalendarSettings>
  drawnGroups: Record<string, GroupOrCalendarDrawerData>
  drawnCals: Record<string, GroupOrCalendarDrawerData>
}

