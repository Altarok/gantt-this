import {FrontMatterCache, TFile} from 'obsidian'

export const CALENDAR_CONFIG_TYPES = [
  'positional',
  'rule-based',
  'gregorian' /* default value */
] as const
export type CalendarConfigType = (typeof CALENDAR_CONFIG_TYPES)[number]

// export function isCalendarIdentifier(value: string): value is CalendarConfigType {
//   return (CALENDAR_CONFIG_TYPES as readonly string[]).includes(value)
// }

export type DateFormatComponent = 'year' | 'month' | 'day' | 'intercalary'

export type MonthDefinition = {
  name?: string
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
  outputFormat?: DateFormatComponent[]
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
type GanttItemDisplayTypeTimespans = (typeof GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESPANS)[number]

/** Timespans only have a start date */
const GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP = [DEFAULT_TIMESTAMP,
  'triangle', 'box', 'diamond', 'pentagon', 'hexagon',
  'octagon', 'star', 'vertical-line'] as const
export type GanttItemDisplayTypeTimestamp = (typeof GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP)[number]

export type GanttItemDisplayType = GanttItemDisplayTypeTimespans | GanttItemDisplayTypeTimestamp

function isGanttItemDisplayTypeTimespan(value: string): value is GanttItemDisplayTypeTimespans {
  return GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESPANS.includes(value as GanttItemDisplayTypeTimespans)
}

function isGanttItemDisplayTypeTimestamp(value: string): value is GanttItemDisplayTypeTimestamp {
  return GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP.includes(value as GanttItemDisplayTypeTimestamp)
}

/** Calendar event display types */
export const GanttItemDisplayTypes = {
  GANTT_ITEM_DISPLAY_TYPE_FOR_TIMESTAMP,
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
  frontMatter: FrontMatterCache
  file: TFile
  _predecessors?: number[] // experimental
  _successors?: number[] // experimental
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

export type ControlKey = 'ctrl' | 'alt' | 'shift'
export const ControlKeyMapped = {
  'alt': 'alt / option',
  'ctrl': 'ctrl / cmd',
  'shift': 'shift'
}
// export type OptionalControlKey = ControlKey | 'none'
// export const OptionalControlKeyMapped = {
//   'none': 'none', ...ControlKeyMapped
// }
/**
 * Front-matter property names configurable by user
 */
export type ConfigurableFrontmatterPropertyNames = {
  frontMatterProperty_calendar_name: string
  frontMatterProperty_gantt_this: string
  frontMatterProperty_gantt_this_optional: boolean /* activate to save 1 front-matter property */
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

export type HideableSettingPages = {
  hideSettingsPageUx: boolean
  hideSettingsPageFrontmatterProperties: boolean
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
  uxDefaultTimespanEventSymbol: GanttItemDisplayTypeTimespans
  uxDefaultTimestampEventSymbol: GanttItemDisplayTypeTimestamp
  uxAddRibbonIcon: boolean
  uxAddRibbonIconMobile: boolean
  uxAddCommands: boolean
  mouseOverEventShowBox: boolean
  mouseOverEventShowVerticalLine: boolean
  showButtonsToHideGroups: boolean
  uxVerticalLineEventWidth: number
  uxVerticalOverlayColor: string
  uxShowMoons: boolean
  autoRestrictZoom: boolean
  // uxOverrideNoteScrollInCalendar: boolean
  // uxSwitchZoomAndPan: boolean
  uxPanButton: ControlKey // TODO #v2.0.0 rename to '..Key'
  uxZoomButton: ControlKey
  showPanAndZoomButtonsInToolbar: boolean
  // customTooltipButton: OptionalControlKey
  // nativeTooltipButton: OptionalControlKey
  uxUseCalColorForCalAxis: boolean
  uxAddDaySuffixToTooltipTitle: boolean
  useFilenameAsFallbackStartDate: boolean
} & ConfigurableFrontmatterPropertyNames & HideableSettingPages

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
  uxDefaultTimespanEventSymbol: DEFAULT_TIMESPAN,
  uxDefaultTimestampEventSymbol: DEFAULT_TIMESTAMP,
  uxAddRibbonIcon: false,
  uxAddRibbonIconMobile: false,
  uxAddCommands: false,
  mouseOverEventShowBox: true,
  mouseOverEventShowVerticalLine: false,
  showButtonsToHideGroups: false,
  uxVerticalLineEventWidth: 3,
  uxVerticalOverlayColor: '#ff0000',
  uxShowMoons: true,
  autoRestrictZoom: true,
  // uxOverrideNoteScrollInCalendar: true,
  // uxSwitchZoomAndPan: false,
  uxPanButton: 'shift',
  uxZoomButton: 'ctrl',
  showPanAndZoomButtonsInToolbar: true,
  // customTooltipButton: 'none',
  // nativeTooltipButton: 'ctrl',
  uxUseCalColorForCalAxis: false,
  uxAddDaySuffixToTooltipTitle: false,
  useFilenameAsFallbackStartDate: false,
  /*
   * Front-matter property names
   */
  frontMatterProperty_calendar_name: 'gantt-calendar-definition', // string, activates file as calendar source

  frontMatterProperty_gantt_this: 'gantt-item', // boolean, activates file as event source
  frontMatterProperty_gantt_this_optional: true,
  frontMatterProperty_event_calendar: 'gantt-calendar', // name of matching calendar or 'gregorian'
  frontMatterProperty_event_time_start: 'gantt-start', // start of event (or timestamp if no end is given )
  frontMatterProperty_event_time_end: 'gantt-end', // ... or time.start
  frontMatterProperty_event_name: 'gantt-name', // ... or filename
  frontMatterProperty_event_color: 'gantt-color', // hex value | human-readable color  ... or global fallback color
  frontMatterProperty_event_group: 'gantt-group', // ... or 'general'
  frontMatterProperty_event_symbol: 'gantt-symbol', // diamond ... or auto-(bar | point)
  frontMatterProperty_event_icon_name: 'gantt-displayIcon', // icon name from https://lucide.dev
  frontMatterProperty_event_icon_color: 'gantt-displayIconColor',  // color for said icon
  frontMatterProperty_note_header: 'gantt-linkToHeader', // note-internal header to link to

  hideSettingsPageUx: true,
  hideSettingsPageFrontmatterProperties: true
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

export const BaseKeys = {
  calPath: 'bk-calendar-path',
  calPathRec: 'bk-calendar-path-recursive',
  lbd: 'bk-lower-bound-date',
  ubd: 'bk-upper-bound-date',
  cal: 'bk-calendar-for-bounds'
} as const
export type BaseKey = (typeof BaseKeys)[keyof typeof BaseKeys]
