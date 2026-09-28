import {DEFAULT_TIMESPAN, DEFAULT_TIMESTAMP, PluginSettings} from './types'

export const DEFAULT_SETTINGS: PluginSettings = {
  eventPath: '/',
  eventPathSearchRecursive: false,
  calendarPath: '/',
  calendarPathSearchRecursive: false,
  defaultCalendar: 'gregorian',
  defaultGroup: 'general',
  fallbackColor: '#1565C0',
  fallbackColorForIcons: '#FF8800',
  calendars: [{id: 'gregorian', visible: true, priority: 0}],
  groups: [{id: 'general', visible: true, priority: 0}],

  /*
   * Advanced UX settings
   */
  uxDefaultTimespanEventSymbol: DEFAULT_TIMESPAN,
  uxDefaultTimestampEventSymbol: DEFAULT_TIMESTAMP,
  uxAddRibbonIcon: false,
  uxAddRibbonIconMobile: false,
  uxAddCommands: true,
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
  uxTooltipOpacity: 1,
  uxAddDaySuffixToTooltipTitle: false,
  useFilenameAsFallbackStartDate: false,
  uxRerenderCooldownSeconds: 5,
  uxHighlightRelatedEvents: true,
  uxConnectRelatedEvents: false,
  uxMoveToolbarBelowChart: false,

  /*
   * Front-matter property names
   */
  frontMatterProperty_calendar_name: 'gantt-calendar-definition', // string, activates file as calendar source
  frontMatterProperty_gantt_this: 'gantt-item', // boolean, activates file as event source
  frontMatterProperty_gantt_this_optional: true,
  frontMatterProperty_event_time_start: 'gantt-start', // start of event (or timestamp if no end is given )
  frontMatterProperty_event_time_end: 'gantt-end', // ... or time.start
  frontMatterProperty_event_name: 'gantt-name', // ... or filename
  frontMatterProperty_event_calendar: 'gantt-calendar', // name of matching calendar or 'Gregorian'
  frontMatterProperty_event_group: 'gantt-group', // ... or 'general'
  frontMatterProperty_event_symbol: 'gantt-symbol', // diamond ... or auto-(bar | point)
  frontMatterProperty_event_color: 'gantt-color', // hex value | human-readable color  ... or global fallback color
  frontMatterProperty_event_icon_name: 'gantt-displayIcon', // SVG icon ID
  frontMatterProperty_event_icon_color: 'gantt-displayIconColor',  // color for said icon
  frontMatterProperty_note_header: 'gantt-linkToHeader', // note-internal header to link to
  frontMatterProperty_event_predecessors: 'gantt-predecessors',
  frontMatterProperty_event_successors: 'gantt-successors',

  hideSettingsPageUx: true,
  hideSettingsPageFrontmatterProperties: true,
  viewEventRowHeight: 24,
  viewEventShapeHeight: 16,
  viewEventIconHeight: 16
} as const
