import {HoverParent, HoverPopover} from 'obsidian'
import {EventId, GanttItem, isTimespan} from '../types/settings-types'
import {CalendarConfig} from '../types/calendar-types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {GanttConnectorDrawer} from '../graphics/arrow-drawer'
import {GanttChartView} from '../views/gantt-chart-view'
import {createSvg} from '../view/svg-drawer-util'
import {Css} from '../const/constants'
import {createAxisDateDescription} from '../date-calculations/dates'
import {ChartContext} from '../model/chart-context'
import {SettingsContext} from '../model/settings-context'
import {debug} from '../util/debug'

type VerticalOverlay = { upper: SVGLineElement, lower: SVGLineElement }

type HighLightTarget = { item: GanttItem, svg: SVGElement }
type RelatedTargets = { predecessors: HighLightTarget[], successors: HighLightTarget[] }

export default class TooltipManager implements HoverParent {
  private readonly searchForRelatedEventsOnHover: boolean
  private readonly isDrawArrows: boolean

  hoverPopover: HoverPopover | null = null
  private verticalGuides: VerticalOverlay[] = []
  private lastHoveredTarget: HTMLElement | null = null
  private lastHoverTarget: HTMLElement | null = null
  private connectorDrawer?: GanttConnectorDrawer
  private readonly boundMouseOver: (evt: MouseEvent) => void

  constructor(private readonly chartCtx: ChartContext,
              private readonly engine: GanttRenderEngine) {
    this.searchForRelatedEventsOnHover = chartCtx.settings.uxHighlightRelatedEvents
    this.isDrawArrows = this.searchForRelatedEventsOnHover && chartCtx.settings.uxConnectRelatedEvents
    if (this.isDrawArrows) this.connectorDrawer = new GanttConnectorDrawer(engine.view)

    this.boundMouseOver = (evt: MouseEvent) => this.handleMouseOver(evt)
    this.engine.view.container.addEventListener('mouseover', this.boundMouseOver)
  }

  public destroy() {
    this.engine.view.container.removeEventListener('mouseover', this.boundMouseOver)
    this.connectorDrawer?.destroy()
    this.hideTooltip()
  }

  private handleMouseOver(evt: MouseEvent) {
    let hoverData: { target: HTMLElement, ganttItem: GanttItem } | null = this.getTargetAndMatchingEvent(evt)
    if (!hoverData) {
      this.hideTooltip('not data-id')
      return
    }

    const {target, ganttItem} = hoverData

    /*
     * At THIS point we decided to really show a tooltip
     */

    if (this.lastHoverTarget) delete this.lastHoverTarget.dataset.hasPopover

    /* CTRL key is reserved for native file preview */
    if (evt.ctrlKey) {
      if (this.lastHoverTarget) delete this.lastHoverTarget.dataset.hasPopover
      this.showNativePreview(evt, target, ganttItem.link)
      return
    }

    this.lastHoverTarget = target

    target.dataset.hasPopover = 'true' // mark element to not duplicate popover on internal mouse moves

    this.showHighlightAroundElement(target, ganttItem)
    this.showVerticalGuide(target, ganttItem)

    try {
      /* create single popover and populate/position it once in onload */
      const popover = new SelfAligningHoverPopover(this, target, ganttItem, this.chartView.container.getBoundingClientRect(),
        (item, el) => this.setTooltipContent(item, el)
      )

      popover.hoverEl.addEventListener('mouseleave', () => {
        /* Reset marker when popover closes/leaves */
        this.hideTooltip('mouse leave')
        delete target.dataset.hasPopover
      })
    } catch (err) {
      debug.warn(String(err))
    }
  }

  private getEventById(id: EventId): GanttItem | undefined {
    return this.engine.drawnData.find(d => d.id === id) // is it a GanttItem?
  }

  private getTargetAndMatchingEvent(evt: MouseEvent): { target: HTMLElement, ganttItem: GanttItem } | null {
    const target = evt.target as HTMLElement // Find the closest task element (works for SVG rects or HTML bars)
    if (!target?.hasAttribute('data-id')) return this.hideTooltip('not data-id') // is it a gantt chart with data?
    const id = target.getAttribute('data-id') // extract data ID (unique)
    if (id === null) return this.hideTooltip('data-id is null')
    const ganttItem: GanttItem | undefined = this.getEventById(id)
    if (!ganttItem) return this.hideTooltip('target not a GanttItem')

    if (!target) return this.hideTooltip('target missing')
    if (target.dataset.hasPopover === 'true') return this.hideTooltip('target already has a popover') // already hovering said target?

    return {target, ganttItem}
  }

  /**
   * @param event
   * @param tooltip the popover's main div: hoverEl
   * @private
   */
  private setTooltipContent(event: GanttItem, tooltip: HTMLElement) {

    const g = tooltip.createDiv({cls: Css.tooltip.tooltip})

    const tooltipTitle = (event.name || event.file.basename)

    g.createDiv({text: tooltipTitle, cls: Css.tooltip.title})

    if (this.hasSelectedBaseProperties) this.createBasesTooltipContent(g, event)

    g.createDiv({text: 'Click to open in new tab', cls: Css.tooltip.link})

    this.addDateDetails(g, event)
  }

  private dateInOutputFormat(days: number, cc: CalendarConfig): string {
    return createAxisDateDescription(days, cc)
  }

  /**
   * Add event date details below "click here" tip. Date gets parsed to output format.
   * @param container where to add the tooltip
   * @param item event data
   */
  private addDateDetails(container: HTMLDivElement, item: GanttItem): void {

    const calendarConfig = this.chartCtx.calendarCache.get(item.calendarType)
    if (!calendarConfig) return

    const datesContainer = container.createDiv({cls: Css.tooltip.dateDetails})

    /*
     * 1. Add current date
     */
    this.addEventDateBelowTableRow(datesContainer, calendarConfig, false, item)

    /*
     * 2. Add repeating event metadata
     */
    if (item.isRecurringInstance) {
      const {repeatRule} = item
      if (repeatRule?.delta && repeatRule.step)
        datesContainer.createDiv({
          text: `Repeats every ${repeatRule.delta} ${repeatRule.step}${repeatRule.delta > 1 ? 's' : ''}`,
          cls: 'gt-repeat-value'
        })
    }

    /*
     * 3. Add absolute day (optional)
     */
    if (this.addDaySuffixToTooltipTitle) {
      const absoluteDay = (!isNaN(item.endDays) && item.endDays > item.startDays)
        ? ` ${item.startDays} to ${item.endDays}`
        : ` ${item.startDays}`
      datesContainer.createDiv({text: `Absolute day: ${absoluteDay}`, cls: 'gt-repeat-value'})
    }
  }

  /*
   * TODO fix duration : show years instead of days
   */
  private addEventDateBelowTableRow(datesContainer: HTMLDivElement,
                                    calendarConfig: CalendarConfig,
                                    addDuration: boolean,
                                    item: GanttItem) {
    const dateRow = datesContainer.createDiv({cls: 'gt-repeat-row'})
    dateRow.createSpan({
      text: isTimespan(item.displayType)
        ? `Date: ${this.dateInOutputFormat(item.startDays, calendarConfig)} to ${this.dateInOutputFormat(item.endDays, calendarConfig)}`
        // + `${addDuration ? ` (${(item.endDays - item.startDays + 1)} days)` : ''}`
        : this.dateInOutputFormat(item.startDays, calendarConfig),
      cls: 'gt-repeat-value'
    })
  }

  private get hasSelectedBaseProperties(): boolean {
    return this.chartCtx.bases?.hasSelectedProperties() ?? false
  }

  private createBasesTooltipContent(container: HTMLDivElement, d: GanttItem): void {
    if (!this.chartCtx.bases) return
    const propertyKeyValues: { key: string, value: string }[] | undefined = this.chartCtx.bases?.readPropertyValues(d)
    if (!propertyKeyValues || propertyKeyValues.length === 0) return

    container.createDiv({text: 'Selected Base properties:', cls: Css.tooltip.dateDetails})
    const table = container.createEl('table', {cls: Css.tooltip.table})

    for (const p of propertyKeyValues) {
      const row = table.insertRow()
      const cellKey = row.insertCell()
      cellKey.textContent = p.key
      const cellVal = row.insertCell()
      cellVal.textContent = p.value
    }

    return
  }

  private showNativePreview(event: MouseEvent, targetEl: HTMLElement, linktext?: string) {
    if (!linktext) return

    this.chartCtx.workspace.trigger('hover-link', {
      event, targetEl, linktext, source: 'gantt-this', hoverParent: this.engine.view.container,
    })
  }

  private showVerticalGuide(target: HTMLElement, ganttItem: GanttItem) {
    if (!this.settings.mouseOverEventShowVerticalLine) return
    if (ganttItem.displayType === 'era') return

    const svg = target.closest('svg')
    if (!svg) return

    /* Get the bounding box of the hovered element relative to the SVG container */
    const targetRect = target.getBoundingClientRect()
    const svgRect = svg.getBoundingClientRect()

    if (ganttItem.displayType === 'bar') {
      /*
       * For bars, we want two lines: one at the left edge (start) and one at the right edge (end)
       * Note: If your SVG bar element bounds represent the full width, we can use targetRect.left and targetRect.right.
       */
      const x1 = targetRect.left - svgRect.left
      const x2 = targetRect.right - svgRect.left

      /* Ensure we have two guideline elements */
      this.ensureVerticalGuidesCount(2)

      if (this.verticalGuides.length === 2) {
        this.updateLine(ganttItem, this.verticalGuides[0]!, x1)
        this.updateLine(ganttItem, this.verticalGuides[1]!, x2)
      }
    } else {
      /* Calculate X position centered on the target element */
      const x = targetRect.left + targetRect.width / 2 - svgRect.left

      this.ensureVerticalGuidesCount(1)

      if (this.verticalGuides.length === 1) {
        this.updateLine(ganttItem, this.verticalGuides[0]!, x)
      }
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
      const upper = createSvg('line', 'gt-item vertical-overlay', {stroke: this.overlayColor})
      const lower = createSvg('line', 'gt-item vertical-overlay', {stroke: this.overlayColor})
      this.chartView.lowerHoverLayer.appendChild(upper)
      this.chartView.dynamicCalendarLayer.appendChild(lower)
      /*
       * TODO add calendar hover layer to be able to draw in the view
       */
      // if (svg.firstChild) {
      //   svg.insertBefore(upper, svg.firstChild)
      //   svg.insertBefore(lower, svg.firstChild)
      // } else {
      //   svg.appendChild(upper)
      //   svg.appendChild(lower)
      // }
      this.verticalGuides.push({upper, lower})
    }
  }

  /**
   * Show red, dotted, vertical lines around event on mouseover. Vertical line runs through entire gantt chart (upper half),
   * but will only be visible over calendar related to event (lower half).
   * <p>
   * Param height unused, but keep this for now as there will be a plugin setting for this
   *
   * @param ganttItem
   * @param line
   * @param x
   * @private
   */
  private updateLine(ganttItem: GanttItem, line: VerticalOverlay, x: number) {

    const totalChartHeight = this.engine.calculateTotalChartHeight() + this.engine.viewModel.margin.top

    const xS = String(x)

    line.upper.setAttribute('x1', xS)
    line.upper.setAttribute('y1', String(this.engine.viewModel.margin.top))
    line.upper.setAttribute('x2', xS)
    line.upper.setAttribute('y2', String(totalChartHeight))

    const cal = this.engine.viewModel.drawnCals[ganttItem.calendarType]
    if (cal) { /* should exist */
      line.lower.setAttribute('x1', xS)
      line.lower.setAttribute('y1', String(cal.y1))
      line.lower.setAttribute('x2', xS)
      line.lower.setAttribute('y2', String(cal.y2))
    }
  }

  /** Remove vertical line. */
  private hideVerticalGuide() {
    for (const lines of this.verticalGuides) {
      lines?.upper?.remove()
      lines?.lower?.remove()
    }
    this.verticalGuides = []
  }

  private findRelatedElementsToHighlight(gtItem: GanttItem): RelatedTargets {

    const predecessors: HighLightTarget[] = []
    const successors: HighLightTarget[] = []

    if (this.searchForRelatedEventsOnHover) {
      const predecessorsRaw = gtItem.predecessors.map(p => this.getEventById(p)).filter(x => !!x) ?? []
      const successorsRaw = gtItem.successors.map(s => this.getEventById(s)).filter(x => !!x) ?? []

      predecessorsRaw.forEach(item => {
        const svg: SVGElement | null = this.engine.view.findSvgElementById(item.id)
        if (svg) predecessors.push({item, svg})
      })

      successorsRaw.forEach(item => {
        const svg: SVGElement | null = this.engine.view.findSvgElementById(item.id)
        if (svg) successors.push({item, svg})
      })
    }

    return {predecessors, successors}
  }

  /** Show box around hovered element. */
  private showHighlightAroundElement(target: HTMLElement, ganttItem: GanttItem) {
    if (!this.settings.mouseOverEventShowBox) return

    if (this.lastHoveredTarget && this.lastHoveredTarget !== target) {
      this.hideHighlightAroundElement()
    }

    if (ganttItem.displayType === 'era' || ganttItem.displayType === 'vertical-line') return

    this.lastHoveredTarget = target
    const svgBackground = target.closest('svg')
    if (!svgBackground) return

    this.addHighLightAroundSvg(ganttItem, svgBackground, target)
  }

  private addHighLightAroundSvg(ganttItem: GanttItem, svgBackground: SVGElement, target: SVGElement | HTMLElement) {

    this.createShape(ganttItem, target, svgBackground, Css.hover.highlightHoveredEvent)

    const relatedTargets: RelatedTargets = this.findRelatedElementsToHighlight(ganttItem)

    relatedTargets.predecessors.forEach(predecessor => {
      this.createShape(predecessor.item, predecessor.svg, svgBackground, Css.hover.highlightRelatedEvent)
      this.connectorDrawer?.drawCurvedArrow(predecessor.svg, target)
    })

    relatedTargets.successors.forEach(successor => {
      this.createShape(successor.item, successor.svg, svgBackground, Css.hover.highlightRelatedEvent)
      this.connectorDrawer?.drawCurvedArrow(target, successor.svg)
    })
  }

  private createShape(ganttItem: GanttItem,
                      target: SVGElement | HTMLElement,
                      backgroundContainer: SVGElement,
                      cssClass: string): void {

    const targetRect: DOMRect = target.getBoundingClientRect()
    const svgRect: DOMRect = backgroundContainer.getBoundingClientRect()

    const x: number = targetRect.left - svgRect.left
    const y: number = targetRect.top - svgRect.top
    const width: number = targetRect.width
    const height: number = targetRect.height

    let shape: SVGElement | null

    const centreX = x + width / 2
    const centreY = y + height / 2

    if (ganttItem.displayType === 'era' || ganttItem.displayType === 'vertical-line') {
      shape = null // duplicate code added as fallback after method was split
    } else if (ganttItem.displayType === 'bar' || ganttItem.displayType === 'box') {
      shape = createSvg('rect', cssClass, {
        x: x - 1, y: y - 1, width: width + 2, height: height + 2, stroke: this.overlayColor,
        'pointer-events': 'none'
      })
    } else if (ganttItem.displayType === 'point') {
      shape = createSvg('circle', cssClass, {
        cx: String(centreX), cy: String(centreY), r: String(width / 2 + 3), stroke: this.overlayColor
      })
    } else {
      const points = this.calculatePolygonPointsForOverlay(centreX, centreY, ganttItem.displayType)
      shape = createSvg('polygon', cssClass, {points, stroke: this.overlayColor})
    }

    if (shape) {
      this.chartView.upperHoverLayer.appendChild(shape)
    }

  }

  private get svgDrawerUtil() {
    return this.chartCtx.svgDrawerUtil
  }

  private calculatePolygonPointsForOverlay(x: number, y: number, symbol: 'triangle' | 'diamond' | 'pentagon' | 'hexagon' | 'octagon' | 'star') {
    switch (symbol) {
      case 'triangle':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y + 2, 3, 1, 0, 3)
      case 'diamond':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y, 4, 1, 0, 3)
      case 'pentagon':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y + 1, 5, 1, 0, 3)
      case 'hexagon':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y, 6, 1, 0, 3)
      case 'octagon':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y, 8, 1, 1 / 8, 3)
      case 'star':
        return this.svgDrawerUtil.calculatePolygonPoints(x, y + 1, 10, 0.382, 0, 4)
    }
  }

  private hideHighlightAroundElement() {
    // debug.trace('<> hideHighlightAroundElement')
    this.connectorDrawer?.clearArrows()
    this.chartView.clearHoverLayer()
  }

  /* Clean up if mouse drifted off a data element onto empty SVG space */
  hideTooltip(_msg?: string): null {
    if (this.lastHoverTarget) delete this.lastHoverTarget.dataset.hasPopover
    this.hideHighlightAroundElement()
    if (this.lastHoveredTarget) {
      this.lastHoveredTarget = null
    }
    this.hideVerticalGuide()
    return null
  }

  get chartView(): GanttChartView {
    return this.engine.view
  }

  get settings(): SettingsContext {
    return this.chartCtx.settings
  }

  get overlayColor(): string {
    return this.settings.uxVerticalOverlayColor
  }

  get addDaySuffixToTooltipTitle(): boolean {
    return this.settings.uxAddDaySuffixToTooltipTitle
  }

}

/**
 * AI-assisted hell of a class which aligns itself to be contained on the screen.
 * Subclass of HoverPopover to populate content once, measure its actual height,
 * and position it correctly with boundary checking (no double creation / no flicker).
 */
class SelfAligningHoverPopover extends HoverPopover {
  constructor(parent: HoverParent,
              private targetEl: HTMLElement,
              private ganttItem: GanttItem,
              private chartRect: DOMRect,
              private contentPopulator: (item: GanttItem, el: HTMLElement) => void) {
    super(parent, targetEl, -1)
  }

  onload() {
    super.onload()
    this.contentPopulator(this.ganttItem, this.hoverEl)
    this.hoverEl.setCssStyles({bottom: ''})

    const rect = this.hoverEl.getBoundingClientRect()
    const targetRect = (this.targetEl as unknown as HTMLDivElement).getBoundingClientRect()
    const spacing = 8

    let y = targetRect.top - rect.height - spacing
    let x = Math.max(targetRect.right, this.chartRect.left + 10)
    x = Math.min(x, this.chartRect.right - 10 - rect.width)

    if (y < 10) {
      y = targetRect.bottom + spacing
    }

    if (y + rect.height > this.chartRect.height - 10) {
      y = Math.max(10, this.chartRect.height - rect.height - 10)
    }

    if (x + rect.width > this.chartRect.right - 10) {
      x = Math.max(this.chartRect.left + 10, targetRect.right - rect.width - 10)
    }

    this.hoverEl.style.left = `${x}px`
    this.hoverEl.style.top = `${y}px`
  }
}
