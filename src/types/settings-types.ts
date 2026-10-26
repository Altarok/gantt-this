import {FrontMatterCache, TFile} from 'obsidian'

export type Destroyable = {
  destroy(): void
}

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
  displayIconColor: string
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
  /** Known to plugin, defined in settings */
  unknown?: boolean
  /** Default color */
  color?: string
  /** Index in array, used for priority */
  priority?: number
}

export type GanttChartDateBound = string | number

export type ControlKey = 'ctrl' | 'alt' | 'shift'
export const ControlKeyMapped = {
  'alt': 'alt / option',
  'ctrl': 'ctrl / cmd',
  'shift': 'shift'
}


export type GanttChartSources = {
  eventPath: string
  eventPathSearchRecursive: boolean
  calendarPath: string /* part of bases configuration */
  calendarPathSearchRecursive: boolean /* part of bases configuration */
}

export type RawChartInput = Partial<GanttChartSources> & {
  calendar?: string /* part of bases configuration */
  lowerBoundDate?: GanttChartDateBound  /* part of bases configuration */
  centerHereDate?: GanttChartDateBound
  upperBoundDate?: GanttChartDateBound  /* part of bases configuration */
}
/**
 * Global plugin settings inheriting chart settings and adding global UX/app options
 */
export type PluginSettings = GanttChartSources & {
  defaultCalendar: string
  defaultGroup: string
  calendars: GroupOrCalendarSettings[]
  groups: GroupOrCalendarSettings[]

  /*
   * Advanced UX settings
   */
  uxDefaultTimespanEventSymbol: GanttItemDisplayTypeTimespans
  uxDefaultTimestampEventSymbol: GanttItemDisplayTypeTimestamp
  viewEventRowHeight: number
  viewEventShapeHeight: number
  viewEventIconHeight: number
  fallbackColor: string
  fallbackColorForIcons: string
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
  uxPanButton: ControlKey // WNM-#v2 naming: keyboard key! not button
  uxZoomButton: ControlKey // WNM-#v2 naming: keyboard key! not button
  showPanAndZoomButtonsInToolbar: boolean
  // customTooltipButton: OptionalControlKey
  // nativeTooltipButton: OptionalControlKey
  uxUseCalColorForCalAxis: boolean
  uxTooltipOpacity: number
  uxAddDaySuffixToTooltipTitle: boolean
  useFilenameAsFallbackStartDate: boolean
  uxRerenderCooldownSeconds: number
  /** Highlight events related to hovered event */
  uxHighlightRelatedEvents: boolean // highlight predecessors and successors
  /** Draw arrows btw hovered event and its related events */
  uxConnectRelatedEvents: boolean // connect predecessors and successors
  uxMoveToolbarBelowChart: boolean
  uxMakeToolbarSticky: boolean

  /*
   * Front-matter property names configurable by user
   */
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

  /*
   * Hideable setting pages. WNM-#v2 This is part of a future feature.
   *
   * Hidden settings disappear from the main settings into sub-pages.
   * Not hidden would mean be present on the main settings page.
   */
  hideSettingsPageUx: boolean
  hideSettingsPageFrontmatterProperties: boolean
}

/**
 * Local chart-specific settings
 */
export type LocalChartSettings = Partial<PluginSettings> & {
  lowerBoundDateParsed?: ParsedDate
  centerHereDateParsed?: ParsedDate
  upperBoundDateParsed?: ParsedDate
  calendarForBounds?: string
  grpConfigs: Record<string, GroupOrCalendarSettings>
  calConfigs: Record<string, GroupOrCalendarSettings>
}

/**  Data updated on a redraw, not while panning or zooming */
export type GroupOrCalendarDrawerData = { y1: number, y2: number }

export const BaseKeys = {
  calPath: 'bk-calendar-path',
  calPathRec: 'bk-calendar-path-recursive',
  lbd: 'bk-lower-bound-date',
  ubd: 'bk-upper-bound-date',
  cal: 'bk-calendar-for-bounds'
} as const
