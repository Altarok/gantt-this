import {HoverParent, HoverPopover} from 'obsidian'
import {GanttItem, PluginSettings} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {FrontMatterUtil} from '../io/frontmatter-reader'
import {GanttConnectorDrawer} from './arrow-drawer'
import {GanttChartView} from '../views/gantt-chart-view'
import {createSvg, SvgDrawerUtil} from '../view/svg-drawer-util'

type VerticalOverlay = { upper: SVGLineElement, lower: SVGLineElement }

type HighLightTarget = { item: GanttItem, svg: SVGElement }
type RelatedTargets = { predecessors: HighLightTarget[], successors: HighLightTarget[] }

export class TooltipManager implements HoverParent {
  private readonly searchForRelatedEventsOnHover: boolean
  private readonly isDrawArrows: boolean

  hoverPopover: HoverPopover | null = null
  private verticalGuides: VerticalOverlay[] = []
  private lastHoveredTarget: HTMLElement | null = null
  private lastHoverTarget: HTMLElement | null = null
  private connectorDrawer = new GanttConnectorDrawer()

  constructor(readonly engine: GanttRenderEngine,
              readonly pluginSettings: PluginSettings,
              private readonly svgDrawerUtil: SvgDrawerUtil) {
    this.searchForRelatedEventsOnHover = pluginSettings.uxHighlightRelatedEvents
    this.isDrawArrows = this.searchForRelatedEventsOnHover && pluginSettings.uxConnectRelatedEvents

    this.setupDelegatedHover()
  }

  private setupDelegatedHover() {
    // Single listener on the parent container using mouseover/mouseout for bubble up support
    this.engine.container.addEventListener('mouseover', (evt: MouseEvent) => {

      let hoverData: { target: HTMLElement, ganttItem: GanttItem } | null = this.getTargetAndMatchingEvent(evt)
      if (!hoverData) {
        this.hideTooltip()
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

      /* create single popover attached to the hovered event */
      const popover = new HoverPopover(this, target, -1)

      /* populate content based on event data  */
      this.setTooltipContent(ganttItem, popover.hoverEl)

      popover.hoverEl.addEventListener('mouseleave', () => {
        /* Reset marker when popover closes/leaves */
        this.hideTooltip('mouse leave')
        delete target.dataset.hasPopover
      })
    })
  }

  private getEventById(id: number): GanttItem | undefined {
    return this.engine.rawData.find(d => d.id === id) // is it a GanttItem?
  }

  private getTargetAndMatchingEvent(evt: MouseEvent): { target: HTMLElement, ganttItem: GanttItem } | null {

    const target = evt.target as HTMLElement // Find the closest task element (works for SVG rects or HTML bars)
    if (!target?.hasAttribute('data-id')) return this.hideTooltip('not data-id') // is it a gantt chart with data?
    const rawId = target.getAttribute('data-id') // extract data ID (unique)
    if (rawId === null) return this.hideTooltip('data-id is null')
    const id = Number(rawId)
    const ganttItem: GanttItem | undefined = this.getEventById(id)
    if (!ganttItem) return this.hideTooltip('target not a GanttItem')

    if (!target) return this.hideTooltip('target missing')
    if (target.dataset.hasPopover === 'true') return this.hideTooltip('target already has a popover') // already hovering said target?

    return {target, ganttItem}
  }

  private setTooltipContent(d: GanttItem, tooltip: HTMLElement) {

    const g = tooltip.createDiv({cls: 'gt-tooltip'})

    g.createDiv({text: (d.name || d.file.basename) + this.getTooltipTitleSuffix(d), cls: 'gt-tooltip-title'})
    const table = g.createEl('table', {cls: 'gt-tooltip-table'})
    g.createDiv({text: 'Click to open in new tab', cls: 'gt-tooltip-link'})

    const hasSelectedBaseProperties = Boolean((this.engine.selectedFrontmatterProperties?.length ?? 0) > 0)

    if (hasSelectedBaseProperties) {
      const selectedProps = this.engine.selectedFrontmatterProperties!
      this.createBasesTooltipContent(table, d, selectedProps)
    } else {
      table.textContent = this.createFallbackTooltipContent(d)
    }
  }

  private createBasesTooltipContent(table: HTMLTableElement, d: GanttItem, selectedProps: string[]) {
    const properties: { key: string, value: string }[] = FrontMatterUtil.readUnknownProperties(d, selectedProps)
    if (properties.length === 0) return
    for (const p of properties) {
      const row = table.insertRow()
      const cellKey = row.insertCell()
      cellKey.textContent = p.key
      const cellVal = row.insertCell()
      cellVal.textContent = p.value
      /*
       * TODO @CePeU replace started and end dates with output format
       */
    }
  }

  private showNativePreview(event: MouseEvent, targetEl: HTMLElement, linktext?: string) {
    if (!linktext) return

    this.engine.plugin.app.workspace.trigger('hover-link', {
      event, targetEl, linktext, source: 'gantt-this', hoverParent: this.engine.container,
    })
  }

  private createFallbackTooltipContent(d: GanttItem): string {
    return d.displayType === 'bar' ? `${d.startDateDisplay} to ${d.endDateDisplay}` : d.startDateDisplay
  }

  private showVerticalGuide(target: HTMLElement, ganttItem: GanttItem) {
    if (!this.pluginSettings.mouseOverEventShowVerticalLine) return
    if (ganttItem.displayType === 'era') return

    const svg = target.closest('svg')
    if (!svg) return

    /* Get the bounding box of the hovered element relative to the SVG container */
    const targetRect = target.getBoundingClientRect()
    const svgRect = svg.getBoundingClientRect()

    if (ganttItem.displayType === 'bar') {
      /* For bars, we want two lines: one at the left edge (start) and one at the right edge (end)
      Note: If your SVG bar element bounds represent the full width, we can use targetRect.left and targetRect.right. */
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
      this.chartView.calendarLayer.appendChild(lower)
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

    const totalChartHeight = this.engine.calculateTotalChartHeight() + this.engine.viewConfig.margin.top

    const xS = String(x)

    line.upper.setAttribute('x1', xS)
    line.upper.setAttribute('y1', String(this.engine.viewConfig.margin.top))
    line.upper.setAttribute('x2', xS)
    line.upper.setAttribute('y2', String(totalChartHeight))

    const cal = this.engine.svgDrawerData.drawnCals[ganttItem.calendarType]
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
        const svg: SVGElement | null = this.engine.findSvgElementById(item.id)
        if (svg) predecessors.push({item, svg})
      })

      successorsRaw.forEach(item => {
        const svg: SVGElement | null = this.engine.findSvgElementById(item.id)
        if (svg) successors.push({item, svg})
      })
    }

    return {predecessors, successors}
  }

  /** Show box around hovered element. */
  private showHighlightAroundElement(target: HTMLElement, ganttItem: GanttItem) {
    if (!this.pluginSettings.mouseOverEventShowBox) return

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

    const relatedTargets: RelatedTargets = this.findRelatedElementsToHighlight(ganttItem)


    this.createShape(ganttItem, target, svgBackground, 'gt-item symbol-hover')

    relatedTargets.predecessors.forEach(r => {
      this.createShape(r.item, r.svg, svgBackground, 'gt-item symbol-hover-related')

      if (this.isDrawArrows) this.connectorDrawer.drawCurvedArrow(r.svg, target,
        // this.chartView.upperHoverLayer)
        svgBackground)
    })

    relatedTargets.successors.forEach(r => {
      this.createShape(r.item, r.svg, svgBackground, 'gt-item symbol-hover-related')

      /* switch start and end in this loop */
      if (this.isDrawArrows) this.connectorDrawer.drawCurvedArrow(target, r.svg,
        // this.chartView.upperHoverLayer)
        svgBackground)
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
        x: x - 1, y: y - 1, width: width + 2, height: height + 2, stroke: this.overlayColor
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
      const highlightElement: SVGGElement = this.chartView.upperHoverLayer.createSvg('g')
      highlightElement.appendChild(shape)
    }

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
    this.connectorDrawer.clearArrows()
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

  private getTooltipTitleSuffix(d: GanttItem) {
    return this.addDaySuffixToTooltipTitle ? ` (day ${d.startDays})` : ''
  }

  get chartView(): GanttChartView {
    return this.engine.view
  }

  get settings(): PluginSettings {
    return this.engine.plugin.settings
  }

  get overlayColor(): string {
    return this.settings.uxVerticalOverlayColor
  }

  get addDaySuffixToTooltipTitle(): boolean {
    return this.settings.uxAddDaySuffixToTooltipTitle
  }

}
