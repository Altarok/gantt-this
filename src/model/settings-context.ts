import {
  CalendarConfig,
  GanttChartSources,
  GanttItemDisplayTypeTimespans,
  GanttItemDisplayTypeTimestamp,
  GroupOrCalendarSettings,
  LocalChartSettings,
  ParsedDate,
  PluginSettings,
  RawChartInput
} from '../const/types'
import FantasyGanttPlugin from '../main'
import {parseEventDate} from '../date-calculations/event-date-input-calc'
import {createAxisDateDescription} from '../date-calculations/dates'

export class SettingsContext implements GanttChartSources {

  /**
   * Chart-related settings
   */
  local: LocalChartSettings

  /**
   * @param global plugin-wide global settings
   * @param rawChartInput chart-related user input
   */
  constructor(private readonly global: PluginSettings,
              private readonly rawChartInput: RawChartInput) {
    this.local = {
      /* I/O sources */
      eventPath: rawChartInput.eventPath,
      eventPathSearchRecursive: rawChartInput.eventPathSearchRecursive,
      calendarPath: rawChartInput.calendarPath,
      calendarPathSearchRecursive: rawChartInput.calendarPathSearchRecursive,
      // viewEventRowHeight: rawChartInput.viewEventRowHeight,
      // viewEventShapeHeight: rawChartInput.viewEventShapeHeight,
      // viewEventIconHeight: rawChartInput.viewEventIconHeight,
      // fallbackColor: rawChartInput.fallbackColor,
      // fallbackColorForIcons: rawChartInput.fallbackColorForIcons
    }
  }

  get hasDateBounds(): boolean {
    return (this.lowerBoundDateParsed ?? this.centerHereDateParsed ?? this.upperBoundDateParsed) !== undefined
  }

  get lowerBoundDateParsed(): ParsedDate | undefined {
    return this.local.lowerBoundDateParsed
  }

  get centerHereDateParsed(): ParsedDate | undefined {
    return this.local.centerHereDateParsed
  }

  get upperBoundDateParsed(): ParsedDate | undefined {
    return this.local.upperBoundDateParsed
  }


  get eventPath(): string {
    return this.local.eventPath ?? this.global.eventPath
  }

  get eventPathSearchRecursive() {
    return this.local.eventPathSearchRecursive ?? this.global.eventPathSearchRecursive
  }

  get calendarPath(): string {
    return this.local.calendarPath ?? this.global.calendarPath
  }

  get calendarPathSearchRecursive() {
    return this.local.calendarPathSearchRecursive ?? this.global.calendarPathSearchRecursive
  }

  get frontMatterProperty_event_time_start(): string {
    return this.global.frontMatterProperty_event_time_start
  }

  get frontMatterProperty_event_time_end(): string {
    return this.global.frontMatterProperty_event_time_end
  }

  get frontMatterProperty_calendar_name(): string {
    return this.global.frontMatterProperty_calendar_name
  }

  get frontMatterProperty_gantt_this(): string {
    return this.global.frontMatterProperty_gantt_this
  }

  get frontMatterProperty_event_calendar(): string {
    return this.global.frontMatterProperty_event_calendar
  }

  get frontMatterProperty_event_color(): string {
    return this.global.frontMatterProperty_event_color
  }

  get frontMatterProperty_event_name(): string {
    return this.global.frontMatterProperty_event_name
  }

  get frontMatterProperty_event_group(): string {
    return this.global.frontMatterProperty_event_group
  }

  get frontMatterProperty_event_icon_name(): string {
    return this.global.frontMatterProperty_event_icon_name
  }

  get frontMatterProperty_event_icon_color(): string {
    return this.global.frontMatterProperty_event_icon_color
  }

  get frontMatterProperty_event_symbol(): string {
    return this.global.frontMatterProperty_event_symbol
  }

  get frontMatterProperty_note_header(): string {
    return this.global.frontMatterProperty_note_header
  }

  get frontMatterProperty_event_predecessors(): string {
    return this.global.frontMatterProperty_event_predecessors
  }

  get frontMatterProperty_event_successors(): string {
    return this.global.frontMatterProperty_event_successors
  }

  get defaultCalendar(): string {
    return this.global.defaultCalendar
  }

  get uxDefaultTimespanEventSymbol(): GanttItemDisplayTypeTimespans {
    return this.global.uxDefaultTimespanEventSymbol
  }

  get uxDefaultTimestampEventSymbol(): GanttItemDisplayTypeTimestamp {
    return this.global.uxDefaultTimestampEventSymbol
  }

  get fallbackColorForIcons(): string {
    return /* TODO implement this.local.fallbackColorForIcons ?? */ this.global.fallbackColorForIcons
  }

  get fallbackColor(): string {
    return /* TODO implement  this.local.fallbackColor ?? */ this.global.fallbackColor
  }

  get groups(): GroupOrCalendarSettings[] {
    return this.global.groups
  }

  get calendars(): GroupOrCalendarSettings[] {
    return this.global.calendars
  }

  get viewEventRowHeight(): number {
    return /* TODO implement this.local.viewEventRowHeight ?? */ this.global.viewEventRowHeight
  }

  get viewEventShapeHeight(): number {
    return /* TODO implement this.local.viewEventShapeHeight ?? */ this.global.viewEventShapeHeight
  }

  get viewEventIconHeight(): number {
    return /* TODO implement this.local.viewEventIconHeight ?? */ this.global.viewEventIconHeight
  }

  get uxVerticalLineEventWidth(): number {
    return /* TODO implement this.local.uxVerticalLineEventWidth ?? */ this.global.uxVerticalLineEventWidth
  }

  get showPanAndZoomButtonsInToolbar(): boolean {
    return /* TODO implement this.local.showPanAndZoomButtonsInToolbar ?? */ this.global.showPanAndZoomButtonsInToolbar
  }

  get showButtonsToHideGroups(): boolean {
    return /* TODO implement this.local.showButtonsToHideGroups ?? */ this.global.showButtonsToHideGroups
  }

  get uxMoveToolbarBelowChart(): boolean {
    return /* TODO implement this.local.uxMoveToolbarBelowChart ?? */ this.global.uxMoveToolbarBelowChart
  }

  get uxMakeToolbarSticky(): boolean {
    return /* TODO implement this.local.uxMakeToolbarSticky ?? */ this.global.uxMakeToolbarSticky
  }

  /**
   * Call this AFTER parsing calendars!
   * @param plugin
   */
  parseRawChartInput(plugin: FantasyGanttPlugin): void {

    const {local, rawChartInput} = this

    const calendarConfig = plugin.calendarConfigsCache.get(rawChartInput.calendar ?? this.global.defaultCalendar)

    if (!calendarConfig) return

    if (rawChartInput.lowerBoundDate) local.lowerBoundDateParsed = this.parseCodeBlockDate(rawChartInput.lowerBoundDate, calendarConfig)
    if (rawChartInput.centerHereDate) local.centerHereDateParsed = this.parseCodeBlockDate(rawChartInput.centerHereDate, calendarConfig)
    if (rawChartInput.upperBoundDate) local.upperBoundDateParsed = this.parseCodeBlockDate(rawChartInput.upperBoundDate, calendarConfig)
  }

  parseCodeBlockDate(date: string | number, calendarConfig: CalendarConfig): ParsedDate | undefined {
    // TODO #errorCache
    if (typeof date === 'string') return parseEventDate(false, false, date, calendarConfig) ?? undefined
    if (typeof date === 'number') return {days: date, display: createAxisDateDescription(date, calendarConfig)}
    return undefined
  }

}
