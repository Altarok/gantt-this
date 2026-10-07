import FantasyGanttPlugin from '../main'
import {Consts} from '../const/constants'

type Margin = { top: number, bottom: number, left: number, right: number }

export class GanttChartViewModel {
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


  constructor(plugin: FantasyGanttPlugin,
              /**
               * TODO replace with number
               */
              private readonly chartContainer: HTMLDivElement) {
    this.eventRowHeight = plugin.settings.viewEventRowHeight
    this.eventRowHeightHalf = this.eventRowHeight / 2
    this.eventShapeHeight = plugin.settings.viewEventShapeHeight
    this.eventIconHeight = plugin.settings.viewEventIconHeight
  }

  /*
   * TODO cleanup, evaluate usage
   */
  get calculateRenderWidth(): number {
    const containerWidth = this.chartContainer.clientWidth ?? 0
    return Math.max(0, containerWidth - this.margin.left - this.margin.right)
  }

  get getCalenderCount() {
    return this.activeCalendars.length
  }

  get eventsAreaHeight() {
    return this.totalHeight - this.margin.bottom - (this.getCalenderCount * this.calendarAxisRowHeight)
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
    // console.log('setDayRange', 'min', min, 'max', max)
    this.minDays = min
    this.maxDays = max // TODO add with fixed zoom range max: Math.max(min + 1, max)
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

  get toggleShowBars(): boolean {
    this.isShowBars = !this.isShowBars
    return this.isShowBars
  }

  get toggleShowPoints(): boolean {
    this.isShowPoints = !this.isShowPoints
    return this.isShowPoints
  }

  get toggleEnableGrouping(): boolean {
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

  // /** TODO Returns variables, not constants. */
  // toString() {
  //   return `GanttChartModel: zoom ${this.zoomFactor}`
  // }

}
