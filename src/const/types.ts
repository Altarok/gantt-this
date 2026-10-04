import {FrontMatterCache, TFile} from 'obsidian'

export const NO_GROUP = ''

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
  daysInStandardYear: number
  noYearZero?: boolean // default false
  leapYearRule?: LeapYearRule
  months: MonthDefinition[]
  /**
   * Defines the order of elements in the date string.
   * For '1420-Afterlithe-21', format is ['year', 'month', 'day']
   * For '195-2026' (Ordinal), format is ['day', 'year']
   */
  format: DateFormatComponent[]
  outputFormat: DateFormatComponent[]
}

export type EpochOffsetDefinition = { year: number, month: number, day: number } | number


/**
 * This one has to be implemented by the user inside a Markdown note.
 */
export type CalendarConfig = {
  /** Mandatory, unique, and case-sensitive identifier. */
  id: string
  name?: string
  displayName?: string
  /** Defined by user, in Markdown file. Not to be used during zooming/panning calculation. */
  sharedOffset: EpochOffsetDefinition
  startDay?: EpochOffsetDefinition
  endDay?: EpochOffsetDefinition
  /** Not defined by user, calculated based on shared offset */
  offsetToDayZero: number /* offset to 1 AD January 1, calculated by plugin, not defined in Markdown */
  /** Calendar type */
  type: 'positional' | 'rule-based'
  delimiter: string
  bcSuffix?: string
  adSuffix?: string
  moons?: Moon[]
  /** Filepath or calendar note, used for click listener. */
  link: string
  /** Current date in fantasy world. MUST match the calendar's date format. */
  today?: number
}

/* e.g. Mayan */
export type PositionalCalendarConfig = CalendarConfig & {
  type: 'positional',
  positionalUnits: { name: string, days: number }[]
}

/* e.g. Gregorian */
export type RuleBasedCalendarConfig = CalendarConfig & {
  type: 'rule-based',
  ruleBasedDetails: RuleBasedDetails
}


export const DEFAULT_TIMESPAN = 'bar'
export const DEFAULT_TIMESTAMP = 'point'

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

export type ParsedDate = {
  /** Absolute offset to day 0 of the event's relative calendar. */
  days: number
  /** Human-readable display of date. May include (short) month names if given. */
  display: string
  repeatRule?: RepeatRule
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
  group: string
  displayType: GanttItemDisplayType
  displayIcon?: string /* SVG icon ID */
  displayIconColor?: string
  calendarType: string
  color?: string
  link?: string
  lane?: number
  frontMatter: FrontMatterCache
  file: TFile
  predecessors: EventId[] // IDs of predecessor GanttItems
  successors: EventId[] // IDs of successors GanttItems

  // stuff for repetition:
  repeatRule?: RepeatRule
  // repeatEveryDays?: number // X interval in days from your regex
  // repeatUntilDays?: number // Optional upper end bound for recurrence
  isRecurringInstance?: boolean
  parentEventId?: EventId
}

export type GanttGroup = {
  name: string
  items: GanttItem[]
  yOffset: number
  height: number
  lanes: number
}

/**
 * Global setting for calendars and groups.
 */
export type GroupOrCalendarSettings = {
  /** Unique identifier, case-sensitive */
  id: string
  /** Visibility toggle */
  visible: boolean
  /** Default color */
  color?: string
  /** Index in array, used for priority */
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

// export type GanttChartConfig = GanttChartButtonSelection & CodeBlockContent & {
//   // rowHeight: number,
//   groupHeaderHeight: number,
//   singleAxisHeight: number,
//   margin: { top: number, right: number, bottom: number, left: number }
// }

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
  frontMatterProperty_event_calendar: string
  frontMatterProperty_event_group: string
  frontMatterProperty_event_symbol: string
  frontMatterProperty_event_color: string
  frontMatterProperty_event_icon_name: string
  frontMatterProperty_event_icon_color: string
  frontMatterProperty_note_header: string
  frontMatterProperty_event_predecessors: string
  frontMatterProperty_event_successors: string
}

export type HideableSettingPages = {
  hideSettingsPageUx: boolean
  hideSettingsPageFrontmatterProperties: boolean
}

export type PluginSettings = GanttChartSources & {
  defaultCalendar: string
  defaultGroup: string
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
  uxPanButton: ControlKey // TODO #v2: keyboard key! not button
  uxZoomButton: ControlKey // TODO #v2: keyboard key! not button
  showPanAndZoomButtonsInToolbar: boolean
  // customTooltipButton: OptionalControlKey
  // nativeTooltipButton: OptionalControlKey
  uxUseCalColorForCalAxis: boolean
  uxTooltipOpacity: number
  uxAddDaySuffixToTooltipTitle: boolean
  useFilenameAsFallbackStartDate: boolean
  uxRerenderCooldownSeconds: number
  uxHighlightRelatedEvents: boolean // highlight predecessors and successors
  uxConnectRelatedEvents: boolean // connect predecessors and successors
  uxMoveToolbarBelowChart: boolean
  uxMakeToolbarSticky: boolean

  viewEventRowHeight: number
  viewEventShapeHeight: number
  viewEventIconHeight: number
} & ConfigurableFrontmatterPropertyNames & HideableSettingPages


/**  Data updated on a redraw, not while panning or zooming */
export type GroupOrCalendarDrawerData = {
  y1: number
  y2: number
}
/**  Data updated on a redraw, not while panning or zooming */
export type SvgDrawerData = {
  mappedGrpConfigs: Record<string, GroupOrCalendarSettings>
  mappedCalConfigs: Record<string, GroupOrCalendarSettings>
  // drawnGroups: Record<string, GroupOrCalendarDrawerData>
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

