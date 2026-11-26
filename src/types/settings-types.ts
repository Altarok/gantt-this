import {GanttItem, GanttItemDisplayTypeTimespans, GanttItemDisplayTypeTimestamp, ParsedDate} from './event-types'

export type Destroyable = {
  destroy(): void
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
  width?: string
  height?: string
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
  uxScrollingWithMouseWheel: boolean
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
  uxMakeCalAxesSticky: boolean
  uxRenderEventsAccordingToTimeOfDay: boolean
  /*
   * Front-matter property names configurable by user
   */
  frontMatterProperty_calendar_name: string
  frontMatterProperty_gantt_this: string
  frontMatterProperty_gantt_this_optional: boolean /* activate to save 1 front-matter property */
  frontMatterProperty_event_time_start: string
  frontMatterProperty_event_time_end: string
  frontMatterProperty_event_time_of_day: string
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
