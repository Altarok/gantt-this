import {ChartContext} from '../model/chart-context'
import {GanttRenderEngine} from '../render/svg-drawer'
import {createSvg} from '../render/svg-drawer-util'
import {GanttItem} from '../types/event-types'
import {Css} from '../const/constants'
import {TooltipRendererHelper} from './tooltip-renderer-helper'

type VerticalOverlay = {
  /**
   * Rendered in event area
   */
  upper: SVGLineElement,
  /**
   * Rendered in calendar area
   */
  lower: SVGLineElement
}

export class VerticalLineRenderer extends TooltipRendererHelper {
  private verticalGuides: VerticalOverlay[] = []

  constructor(chartCtx: ChartContext, engine: GanttRenderEngine) {
    super(chartCtx, engine)
  }

  destroy(): void {
    this.hideLines()
  }

  /**
   * Renders dotted vertical lines at event: 2 lines for bars, 1 line for other events.
   */
  render(target: HTMLElement, ganttItem: GanttItem, eventSvg: SVGSVGElement): void {

    /* No love for era events */
    if (ganttItem.displayType === 'era') return

    /* Get the bounding box of the hovered element relative to the SVG container */
    const targetRect = target.getBoundingClientRect()
    const svgRect = eventSvg.getBoundingClientRect()

    if (ganttItem.displayType === 'bar') {
      this.renderTwoLines(targetRect, svgRect, ganttItem)
    } else {
      this.renderOneLine(targetRect, svgRect, ganttItem)
    }
  }


  /**
   * For bars, we want two lines: one at the left edge (start) and one at the right edge (end)
   * Note: If your SVG bar element bounds represent the full width, we can use targetRect.left and targetRect.right.
   */
  private renderTwoLines(targetRect: DOMRect, svgRect: DOMRect, ganttItem: GanttItem) {
    const svgLeftX = targetRect.left - svgRect.left
    const svgRightX = targetRect.right - svgRect.left

    /* Ensure we have two guideline elements */
    this.ensureVerticalGuidesCount(2)

    if (this.verticalGuides.length === 2) {
      this.updateLine(ganttItem, this.verticalGuides[0]!, svgLeftX)
      this.updateLine(ganttItem, this.verticalGuides[1]!, svgRightX)
    }
  }

  /** Calculate X position centered on the target element. */
  private renderOneLine(targetRect: DOMRect, svgRect: DOMRect, ganttItem: GanttItem) {
    const svgCenterX = targetRect.left + targetRect.width / 2 - svgRect.left

    this.ensureVerticalGuidesCount(1)

    if (this.verticalGuides.length === 1) this.updateLine(ganttItem, this.verticalGuides[0]!, svgCenterX)
  }


  /**
   * Show red, dotted, vertical lines around event on mouseover. Vertical line runs through entire gantt chart (upper half),
   * but will only be visible over calendar related to event (lower half).
   *
   * @param ganttItem
   * @param line
   * @param x
   */
  private updateLine(ganttItem: GanttItem, line: VerticalOverlay, x: number) {

    const totalChartHeight = this.engine.calculateTotalChartHeight() + this.engine.viewModel.margin.top

    const xS = String(x)

    line.upper.setAttribute('x1', xS)
    line.upper.setAttribute('y1', String(this.engine.viewModel.margin.top))
    line.upper.setAttribute('x2', xS)
    line.upper.setAttribute('y2', String(totalChartHeight))

    const cal = this.engine.viewModel.drawnCals[ganttItem.calendarType]
    if (cal) {
      /* should exist */
      line.lower.setAttribute('x1', xS)
      line.lower.setAttribute('y1', String(cal.y1))
      line.lower.setAttribute('x2', xS)
      line.lower.setAttribute('y2', String(cal.y2))
    }
  }

  private ensureVerticalGuidesCount(count: number) {
    /* Remove excess if switching from bar to point */
    while (this.verticalGuides.length > count) {
      const lines = this.verticalGuides.pop()
      lines?.upper?.remove()
      lines?.lower?.remove()
    }

    /* Add missing if switching from point to bar */
    while (this.verticalGuides.length < count) {
      const upper: SVGLineElement = createSvg('line', Css.item.verticalOverlay, {stroke: this.overlayColor})
      const lower: SVGLineElement = createSvg('line', Css.item.verticalOverlay, {stroke: this.overlayColor})
      this.chartView.renderVerticalGuidesOverEvent(upper, lower)
      this.verticalGuides.push({upper, lower})
    }
  }

  /**
   * Remove vertical line(s).
   */
  hideLines() {
    for (const lines of this.verticalGuides) {
      lines?.upper?.remove()
      lines?.lower?.remove()
    }
    this.verticalGuides = []
  }


}
