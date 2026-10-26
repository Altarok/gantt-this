import {
  ControlKey,
  GanttChartSources,
  GanttItemDisplayTypeTimespans,
  GanttItemDisplayTypeTimestamp,
  GroupOrCalendarSettings,
  LocalChartSettings,
  ParsedDate,
  PluginSettings,
  RawChartInput
} from '../types/settings-types'
import {parseEventDate} from '../date-calculations/event-date-input-calc'
import {createAxisDateDescription} from '../date-calculations/dates'
import {ChartContext} from './chart-context'
import {GanttError} from './gantt-error'
import {CalendarConfig} from '../types/calendar-types'
import {createFallbackGroupConfig} from '../types/types-util'

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

      grpConfigs: {},
      calConfigs: {},
    }

    this.updateGrpAndCalData()
  }

  // updateRawChartInput(data: RawChartInput): void {
  //
  // }

  updateGrpAndCalData(): void {
    this.local.grpConfigs = Object.fromEntries(this.global.groups.map(g => [g.id, {...g}]))
    this.local.calConfigs = Object.fromEntries(this.global.calendars.map(c => [c.id, {...c}]))
  }

  getGroupConfig(id: string): GroupOrCalendarSettings | undefined {
    return this.local.grpConfigs[id]
  }

  getOrCreateGroupConfig(id: string): GroupOrCalendarSettings {
    let grpConfig = this.getGroupConfig(id)
    if (!grpConfig) {
      grpConfig = createFallbackGroupConfig(id)
      this.local.grpConfigs[id] = grpConfig
    }
    return grpConfig
  }

  getCalendarConfig(id: string): GroupOrCalendarSettings | undefined {
    return this.local.calConfigs[id]
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

  get frontMatterProperty_gantt_this_optional(): boolean {
    return this.global.frontMatterProperty_gantt_this_optional
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

  get defaultGroup(): string {
    return this.global.defaultGroup
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

  // get groups(): GroupOrCalendarSettings[] {
  //   return this.global.groups
  // }

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

  get mouseOverEventShowVerticalLine(): boolean {
    return /* TODO implement this.local.mouseOverEventShowVerticalLine ?? */ this.global.mouseOverEventShowVerticalLine
  }

  get mouseOverEventShowBox(): boolean {
    return /* TODO implement this.local.mouseOverEventShowBox ?? */ this.global.mouseOverEventShowBox
  }

  get uxVerticalOverlayColor(): string {
    return /* TODO implement this.local.uxVerticalOverlayColor ?? */ this.global.uxVerticalOverlayColor
  }

  get uxAddDaySuffixToTooltipTitle(): boolean {
    return /* TODO implement this.local.uxAddDaySuffixToTooltipTitle ?? */ this.global.uxAddDaySuffixToTooltipTitle
  }

  get uxMakeToolbarSticky(): boolean {
    return /* TODO implement this.local.uxMakeToolbarSticky ?? */ this.global.uxMakeToolbarSticky
  }

  get uxShowMoons(): boolean {
    return this.local.uxShowMoons ?? this.global.uxShowMoons
  }

  setShowMoons(val: boolean) {
    this.local.uxShowMoons = val
  }

  get uxUseCalColorForCalAxis(): boolean {
    return this.local.uxUseCalColorForCalAxis ?? this.global.uxUseCalColorForCalAxis
  }

  setUseCalColorForCalAxis(val: boolean) {
    this.local.uxUseCalColorForCalAxis = val
  }

  get uxHighlightRelatedEvents(): boolean {
    return /* TODO implement this.local.uxHighlightRelatedEvents ?? */ this.global.uxHighlightRelatedEvents
  }

  get uxConnectRelatedEvents(): boolean {
    return /* TODO implement this.local.uxConnectRelatedEvents ?? */ this.global.uxConnectRelatedEvents
  }

  get uxRerenderCooldownSeconds(): number {
    return /* TODO implement this.local.uxRerenderCooldownSeconds ?? */ this.global.uxRerenderCooldownSeconds
  }

  get useFilenameAsFallbackStartDate(): boolean {
    return /* TODO implement this.local.useFilenameAsFallbackStartDate ?? */ this.global.useFilenameAsFallbackStartDate
  }

  get autoRestrictZoom(): boolean {
    return /* TODO implement this.local.autoRestrictZoom ?? */ this.global.autoRestrictZoom
  }

  get uxZoomButton(): ControlKey {
    return this.global.uxZoomButton
  }

  get uxPanButton(): ControlKey {
    return this.global.uxPanButton
  }


  /**
   * Call this AFTER parsing calendars!
   * @param  chartCtx
   */
  parseRawChartInput(chartCtx: ChartContext): void {

    const {local, rawChartInput} = this
    if (!rawChartInput.lowerBoundDate && !rawChartInput.centerHereDate && !rawChartInput.upperBoundDate) return

    const calendarID = rawChartInput.calendar ?? this.global.defaultCalendar
    const calendarConfig = chartCtx.calendarCache.get(calendarID)

    if (!calendarConfig) return chartCtx.addLog('noCalForChartBounds', {calendarID})

    if (rawChartInput.lowerBoundDate) local.lowerBoundDateParsed = this.parseCodeBlockDate(chartCtx, rawChartInput.lowerBoundDate, calendarConfig, 'lower bound')
    if (rawChartInput.centerHereDate) local.centerHereDateParsed = this.parseCodeBlockDate(chartCtx, rawChartInput.centerHereDate, calendarConfig, 'center here')
    if (rawChartInput.upperBoundDate) local.upperBoundDateParsed = this.parseCodeBlockDate(chartCtx, rawChartInput.upperBoundDate, calendarConfig, 'upper bound')
  }

  parseCodeBlockDate(chartCtx: ChartContext, date: string | number, calendarConfig: CalendarConfig, description: string): ParsedDate | undefined {
    try {
      if (typeof date === 'string') return parseEventDate(false, false, date, calendarConfig) ?? undefined
      if (typeof date === 'number') return {days: date, display: createAxisDateDescription(date, calendarConfig)}
    } catch (err) {
      if (err instanceof GanttError) {
        err.message = `Invalid ${description}. ${err.message}`
        chartCtx.addErr(err)
      }
      return undefined
    }

    /* Do not throw error, the other bounds may still work */
    chartCtx.addLog('illegalChartBoundFormat', {bound: description, date: String(date)})
    return undefined
  }

}
