import FantasyGanttPlugin from "../main";

export type GanttChartViewModel = {
  /** Will hide eras if false, default: true */
  showEras: boolean
  /** Will hide bars if false, default: true */
  showBars: boolean
  /** Will hide timestamps if false, default: true */
  showPoints: boolean
  /** Joins all events in a single group if false, default: true */
  enableGrouping: boolean

  /** Collection of calendars to be shown as axis. */
  activeAxesList: string[]

  readonly eventRowHeight: number
  readonly eventShapeHeight: number
  readonly eventIconHeight: number

  readonly groupHeaderHeight: number
  /** Height of calendar axis row. */
  readonly calendarAxisRowHeight: number
  /** Empty space, in pixels, at chart borders */
  readonly margin:
    {
      top: number /* Default: 0 */
      bottom: number /* Default: 10 */
      left: number /* Default: 0 */
      right: number /* Default: 0 */
    }

  /* Bounds tracked in raw day counts */
  /** Absolute number of day at lower bound. */
  minDays: number
  /** Absolute number of day at upper bound. */
  maxDays: number
  /** Zoom factor. */
  zoomFactor: number
  /** Horizontal shift of chart */
  panTranslateX: number
  /** Day diff between 2 axis ticks. Must be positive. */
  stepDays: number

  totalHeight: number /* Default = 400 */

  setPanAndZoom: (p: number, z: number) => void
  resetPanAndZoom: () => void
  setDayRange: (min: number, max: number) => void

  /** Returns variables, not constants. */
  toString: () => string
}

export class GanttChartModelImpl implements GanttChartViewModel {
  /*
   * Toggles
   */
  showEras = true
  showBars = true
  showPoints = true
  enableGrouping = true

  /** Collection of calendars to be shown as axis. */
  activeAxesList = []

  /*
   * Constants
   */
  readonly eventRowHeight: number
  readonly eventShapeHeight: number
  readonly eventIconHeight: number

  readonly groupHeaderHeight = 25
  readonly calendarAxisRowHeight = 35
  readonly margin = {
    top: 0, bottom: 10, left: 0, right: 0
  }

  /*
   * Variables
   */
  minDays = 0
  maxDays = 0
  zoomFactor = 1
  panTranslateX = 0
  stepDays = 1

  totalHeight = 400


  constructor(public readonly plugin: FantasyGanttPlugin) {
    this.eventRowHeight = plugin.settings.viewEventRowHeight
    this.eventShapeHeight = plugin.settings.viewEventShapeHeight
    this.eventIconHeight = plugin.settings.viewEventIconHeight
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

  toString() {
    return `GanttChartModel: zoom ${this.zoomFactor}`
  }

}
