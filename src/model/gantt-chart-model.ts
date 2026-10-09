import {Consts} from '../const/constants'
import {GroupOrCalendarDrawerData, GroupOrCalendarSettings} from '../const/types'
import {SettingsContext} from "./settings-context";

type Margin = { top: number, bottom: number, left: number, right: number }

export class GanttChartModel {
  /** Will hide eras if false, default: true */
  private isShowEras = true
  /** Will hide bars if false, default: true */
  private isShowBars = true
  /** Will hide timestamps if false, default: true */
  private isShowPoints = true
  /** Joins all events in a single group if false, default: true */
  private isEnableGrouping = true

  hideDays = false
  hideMonths = false

  /** Names of calendars actively shown as axis. */
  activeCalendars: string[] = []

  /*
   * Constants
   */
  readonly eventRowHeight: number
  readonly eventRowHeightHalf: number
  readonly eventShapeHeight: number
  readonly eventIconHeight: number

  private readonly groupHeaderHeight = 25

  /** Height of calendar axis row. */
  readonly calendarAxisRowHeight = 35
  /** Empty space, in pixels, at chart borders */
  readonly margin: Margin = {
    top: 0, bottom: 10, left: 0, right: 0
  }

  /*
   * Variables
   */
  /** _Absolute_ index of day at lower bound. */
  minDays = 0
  /** _Absolute_ index of day at upper bound. */
  maxDays = 0
  /** Zoom factor. */
  zoomFactor = 1
  /** Horizontal shift of chart */
  panTranslateX = 0
  /** Day diff between 2 axis ticks. Must be positive. */
  stepDays = 1
  /* Default = 400 */
  totalHeight = 400

  private currRenderWidth = -1
  private lastRenderWidth = -1

  /**  Data updated on a redraw, not while panning or zooming */
  mappedGrpConfigs: Record<string, GroupOrCalendarSettings> = {}
  mappedCalConfigs: Record<string, GroupOrCalendarSettings> = {}
  // drawnGroups: Record<string, GroupOrCalendarDrawerData> = {}
  drawnCals: Record<string, GroupOrCalendarDrawerData> = {}

  constructor(private readonly settings: SettingsContext) {
    this.eventRowHeight = settings.viewEventRowHeight
    this.eventRowHeightHalf = this.eventRowHeight / 2
    this.eventShapeHeight = settings.viewEventShapeHeight
    this.eventIconHeight = settings.viewEventIconHeight
    this.updateSvgDrawerData(settings)
  }

  updateSvgDrawerData(settings: SettingsContext) {
    this.mappedGrpConfigs = Object.fromEntries(settings.groups.map(g => [g.id, g]))
    this.mappedCalConfigs = Object.fromEntries(settings.calendars.map(c => [c.id, c]))
    // this.drawnGroups = Object.fromEntries(settings.groups.map(g => [g.id, {y1: 0, y2: 0}]))
    this.drawnCals = Object.fromEntries(settings.calendars.map(c => [c.id, {y1: 0, y2: 0}]))
  }

  getCurrRenderWidth(): number {
    return this.currRenderWidth
  }

  getLastRenderWidth(): number {
    return this.lastRenderWidth
  }

  setRawContainerWidth(rawContainerWidth: number): void {
    this.currRenderWidth = Math.max(0, rawContainerWidth - this.margin.left - this.margin.right)
  }

  cacheCurrentRenderWidth(): void {
    this.lastRenderWidth = this.currRenderWidth
  }

  private get calendarCount() {
    return this.activeCalendars.length
  }

  private get combinedAxesHeight() {
    return this.calendarCount * this.calendarAxisRowHeight
  }

  get eventsAreaHeight() {
    return this.totalHeight - this.margin.bottom - this.combinedAxesHeight
  }

  calculateTotalHeight(currentEventAreaHeight: number) {
    this.totalHeight = currentEventAreaHeight + this.combinedAxesHeight + this.margin.bottom
  }

  get totalDaysSpan() {
    return this.maxDays - this.minDays
  }

  get totalDaysSpanRelativeToZoom() {
    return this.totalDaysSpan / this.zoomFactor
  }

  setPanAndZoom(p: number, z: number) {
    this.panTranslateX = p
    this.zoomFactor = z
  }

  resetPanAndZoom() {
    this.setPanAndZoom(0, 1)
  }

  setDayRange(min: number, max: number) {
    this.minDays = min
    this.maxDays = max
  }

  get showEras(): boolean {
    return this.isShowEras
  }

  get showBars(): boolean {
    return this.isShowBars
  }

  get showPoints(): boolean {
    return this.isShowPoints
  }

  get enableGrouping(): boolean {
    return this.isEnableGrouping
  }

  toggleShowBars(): boolean {
    this.isShowBars = !this.isShowBars
    return this.isShowBars
  }

  toggleShowPoints(): boolean {
    this.isShowPoints = !this.isShowPoints
    return this.isShowPoints
  }

  toggleEnableGrouping(): boolean {
    this.isEnableGrouping = !this.isEnableGrouping
    return this.isEnableGrouping
  }

  get getGroupHeaderHeight(): number {
    return this.isEnableGrouping ? this.groupHeaderHeight : 0
  }

  updateWhichDateElementsToHide(tickStepInDays: number): void {
    this.hideDays = tickStepInDays > Consts.AXIS_TICK_DIFF_TO_HIDE_DAYS
    this.hideMonths = tickStepInDays > Consts.AXIS_TICK_DIFF_TO_HIDE_MONTHS
  }

}
