import {Css} from '../const/constants'
import {ManualSvg} from '../svg/svg-icon-creator'
import {GanttChartModel} from '../model/gantt-chart-model'
import {ChartContext} from '../model/chart-context'
import {debug} from '../util/debug'

export class GanttChartView {
  chartContainer: HTMLDivElement
  private readonly toolbarCont: HTMLDivElement
  private readonly minimizedToolbarCont: HTMLDivElement

  private chartEventContainer!: HTMLDivElement
  private chartCalendarContainer!: HTMLDivElement
  private eventSvg!: SVGElement
  private calendarSvg!: SVGElement

  /** Group background colors + group badges   */
  private backgroundLayer!: SVGGElement
  /** Foreground. Everything else */
  private foregroundLayer!: SVGGElement
  /** Inside foregroundLayer: background grid elements */
  private gridLayer!: SVGGElement
  /** Inside foregroundLayer: data events */
  private dataLayer!: SVGGElement
  /** Inside foregroundLayer > dataLayer : era layer used for eras and vertical-line events */
  private eraLayer!: SVGGElement
  /** Inside foregroundLayer > dataLayer : layer used for mouse overlay (behind events) */
  private lowerHoverLayer!: SVGGElement
  private repeaterEventLayer!: SVGGElement
  /** Inside foregroundLayer > dataLayer : event layer used for other events */
  private eventLayer!: SVGGElement
  /** For arrows btw events and shapes around hovered events. */
  private upperHoverLayer!: SVGGElement

  /** Inside foregroundLayer: calendars */
  private dynamicCalendarLayer!: SVGGElement
  private staticCalendarLayer!: SVGGElement

  private readonly clipId = `gantt-clip-${Math.random().toString(36).substring(2, 9)}`
  /** Prevent overflow rectangle */
  private clipRect!: SVGElement

  constructor(private readonly chartCtx: ChartContext,
              readonly container: HTMLElement,
              private readonly viewModel: GanttChartModel) {
    this.container.empty()
    this.container.addClass(Css.wrapper)

    const stickyCalAxes = chartCtx.settings.stickyCalAxes
    const stickyToolbar = chartCtx.settings.stickyToolbar
    const toolbarBelowChart = chartCtx.settings.toolbarBelowChart

    debug.log(`GanttChartView ** stickyCalAxes ${stickyCalAxes}, stickyToolbar ${stickyToolbar}, toolbarBelowChart ${toolbarBelowChart}`)

    if (toolbarBelowChart) {
      this.chartContainer = this.container.createDiv({cls: Css.chartContainer})
      this.toolbarCont = this.container.createDiv({cls: Css.toolbar.container})
      this.minimizedToolbarCont = this.container.createDiv({cls: Css.toolbar.minimized})
    } else {
      this.toolbarCont = this.container.createDiv({cls: Css.toolbar.container})
      this.minimizedToolbarCont = this.container.createDiv({cls: Css.toolbar.minimized})
      this.chartContainer = this.container.createDiv({cls: Css.chartContainer})
    }

    this.updateToolbarLayout()

    // this.updateCalendarStickyState()
    this.initiateChartContainerSubContainers()
    this.initScrollListener()
  }

  public updateToolbarLayout() {
    const toolbarBelowChart = this.chartCtx.settings.toolbarBelowChart
    if (toolbarBelowChart) {
      this.container.prepend(this.chartContainer)
    } else {
      this.container.prepend(this.toolbarCont, this.minimizedToolbarCont)
    }

    this.makeToolbarSticky(this.chartCtx.settings.stickyToolbar)
  }

  /** Clear chart, not toolbar, and re-fill it with life */
  public redrawChart() {
    this.chartContainer.empty()
    this.initiateChartContainerSubContainers()
  }

  initiateChartContainerSubContainers() {
    this.chartEventContainer = this.chartContainer.createDiv({cls: 'gt-event-container'})
    this.eventSvg = this.chartEventContainer.createSvg('svg', {
      cls: Css.svg.canvas,
      attr: {height: this.viewModel.eventsAreaHeight.toString()}
    })

    ManualSvg.addArrowTipAsSvgDef(this.eventSvg)

    this.backgroundLayer = this.eventSvg.createSvg('g')
    this.foregroundLayer = this.eventSvg.createSvg('g')
    const defs = this.eventSvg.createSvg('defs')

    /* Dedicated grid container behind bars and points */
    const clipPath = defs.createSvg('clipPath', {attr: {id: this.clipId}})
    const eventsAreaHeight = this.viewModel.eventsAreaHeight
    this.clipRect = clipPath.createSvg('rect', {attr: {height: eventsAreaHeight}})

    this.gridLayer = this.foregroundLayer.createSvg('g')
    this.dataLayer = this.foregroundLayer.createSvg('g', {attr: {'clip-path': `url(#${this.clipId})`}})

    // this.dynamicCalendarLayer = this.foregroundLayer.createSvg('g')
    // this.staticCalendarLayer = this.foregroundLayer.createSvg('g')

    this.eraLayer = this.dataLayer.createSvg('g', {cls: Css.itemLayer.era})
    this.lowerHoverLayer = this.dataLayer.createSvg('g')
    this.repeaterEventLayer = this.dataLayer.createSvg('g', {cls: Css.itemLayer.repeater})
    this.eventLayer = this.dataLayer.createSvg('g')
    this.upperHoverLayer = this.dataLayer.createSvg('g')

    this.chartCalendarContainer = this.chartContainer.createDiv({cls: 'gt-calendar-container'})
    this.calendarSvg = this.chartCalendarContainer.createSvg('svg', {
      cls: Css.svg.canvas,
      attr: {height: this.viewModel.calendarAreaHeight.toString()}
    })

    this.dynamicCalendarLayer = this.calendarSvg.createSvg('g')
    this.staticCalendarLayer = this.calendarSvg.createSvg('g')

    // this.updateCalendarStickyState()
  }

  // public updateCalendarStickyState() {
  //   const scrollContainer = this.getScrollableContainer(false)
  //   if (!scrollContainer) return
  //
  //   const isScrollable = scrollContainer.scrollHeight > scrollContainer.clientHeight
  //   this.chartContainer.toggleClass('gt-calendar-sticky', isScrollable)
  // }

  get clientWidth() {
    return this.container.clientWidth
  }

  clearEventLayer() {
    this.eraLayer.empty()
    this.repeaterEventLayer.empty()
    this.eventLayer.empty()

    this.clearHoverLayer()
  }

  clearHoverLayer() {
    this.lowerHoverLayer.empty()
    this.upperHoverLayer.empty()
  }

  clearCalendarLayer(completeReset = false) {
    this.dynamicCalendarLayer.empty()
    if (completeReset) this.staticCalendarLayer.empty()
    this.gridLayer.empty()
  }

  clearGroupBackground() {
    this.backgroundLayer.empty()
  }

  drawGroupBackground(name: string, yOffset: number, height: number, isEvenGroup: boolean) {

    const groupG = this.backgroundLayer.createSvg('g')
    groupG.setAttribute('transform', `translate(0, ${yOffset})`)

    const cssClass = isEvenGroup ? Css.group.rowEven : Css.group.rowOdd
    /* const rect = */
    groupG.createSvg('rect', {cls: cssClass, attr: {width: this.clientWidth, height}})

    const badge = groupG.createSvg('rect', {cls: Css.group.badge, attr: {x: 10}})
    const label = groupG.createSvg('text', {cls: Css.group.text, attr: {x: 20, y: 17}})

    label.textContent = name.toUpperCase()
    const badgeWidth = this.chartCtx.textCache.getSvgWidth(label, name)
    badge.setAttribute('width', String(badgeWidth))
  }

  createCalAxisGroup(currentAxisYStart: number): SVGGElement {
    const g: SVGGElement = this.dynamicCalendarLayer.createSvg('g')
    g.setAttribute('transform', `translate(0, ${currentAxisYStart})`)
    return g
  }

  /**
   * @param calGroup
   * @param x1 on-screen coordinates
   * @param x2 on-screen coordinates
   * @param stroke the axis' color
   */
  drawCalAxisBaseline(calGroup: SVGGElement, x1: number, x2: number, stroke: string): void {
    calGroup.createSvg('line', {
      attr: {x1, y1: 0, x2, y2: 0, 'stroke-width': 2.5, stroke}
    })
  }

  /**
   * @param calGroup
   * @param x on-screen coordinate
   * @param stroke the axis' color
   */
  drawCalAxisCap(calGroup: SVGGElement, x: number, stroke: string): void {
    calGroup.createSvg('line', {
      cls: Css.axis.capMarker, attr: {x1: x, y1: -6, x2: x, y2: +6, 'stroke-width': 2.5, stroke}
    })
  }

  drawCalAxisTick(calGroup: SVGGElement, xPos: number, tickColor: string): void {
    calGroup.createSvg('line', {
      attr: {x1: xPos, y1: 0, x2: xPos, y2: 5, stroke: tickColor}
    })
  }

  drawCalAxisDate(calGroup: SVGGElement, xPos: number, date: string, fill: string): void {
    const textSvg = calGroup.createSvg('text', {
      cls: Css.axis.text, attr: {x: xPos, y: 20, fill}
    })
    textSvg.textContent = date
  }

  /**
   * Draw vertical gridlines into dedicated grid container.
   * @param xPos on-screen coordinate
   * @param y2 height of event area
   */
  drawVerticalGridlineBehindEvents(xPos: number, y2: number): void {
    this.gridLayer.createSvg('line', {
      cls: Css.axis.gridline,
      attr: {x1: xPos, y1: 0, x2: xPos, y2}
    })
  }


  drawCalendarBadge(calBadgeTextContent: string, sourceFilePath: string, currentAxisYStart: number) {
    const badgeWidth = this.chartCtx.textCache.getWidth(calBadgeTextContent).toFixed(1)

    const badge = this.staticCalendarLayer.createSvg('rect', {
      cls: Css.axis.labelBadge, attr: {x: 8, y: currentAxisYStart + 7, width: badgeWidth}
    })

    const label = this.staticCalendarLayer.createSvg('text', {
      cls: Css.axis.label, attr: {x: 14, y: currentAxisYStart + 19}
    })
    label.textContent = calBadgeTextContent

    if (sourceFilePath) {
      this.chartCtx.plugin.registerDomEvent(badge as unknown as HTMLElement,
        'click', () => void this.chartCtx.workspace.openLinkText(sourceFilePath, '', true)
      )
    }
  }

  setWidth(width: number) {
    this.clipRect.setAttribute('width', width.toString())
  }

  /**
   * Provides the primary scrollable container element used for event interactions and panning.
   * @param isMobile - Flag indicating whether the view is running on a mobile device
   * @returns The scrollable HTMLElement or null
   */
  getScrollableContainer(isMobile: boolean): HTMLElement | null {
    if (isMobile) return this.container.parentElement

    const activeWindow = this.eventSvg.ownerDocument.defaultView ?? window
    const isPopout = activeWindow?.document.body.classList.contains('is-popout-window')
    return isPopout ? this.chartContainer : this.container.parentElement
  }

  getLayerForEvent(isRecurringInstance: boolean): SVGElement {
    return isRecurringInstance ? this.repeaterEventLayer : this.eventLayer
  }

  findSvgElementById<T extends SVGElement = SVGElement>(id: string): T | null {
    const selector = `[data-id="${id}"]`
    return this.eventLayer.querySelector<T>(selector)
  }

  makeToolbarSticky(sticky: boolean) {
    if (sticky) {
      this.toolbarCont.addClass('is-sticky')
      this.minimizedToolbarCont.addClass('is-sticky')
    } else {
      this.toolbarCont.removeClass('is-sticky')
      this.minimizedToolbarCont.removeClass('is-sticky')
    }
  }

  /** Draws vertical dotted line when mouse hovers an event. */
  renderArrow(arrow: SVGPathElement): void {
    this.upperHoverLayer.appendChild(arrow)
  }

  /** Draws vertical dotted line when mouse hovers an event. */
  renderShapeAroundEvent(shape: SVGElement): void {
    this.upperHoverLayer.appendChild(shape)
  }

  /** Draws vertical dotted line when mouse hovers an event. */
  renderVerticalGuidesOverEvent(upper: SVGLineElement, lower: SVGLineElement): void {
    this.lowerHoverLayer.appendChild(upper)
    this.dynamicCalendarLayer.appendChild(lower)
  }

  /** Used by ToolbarView to create toolbar */
  get toolbarContainer(): HTMLDivElement {
    return this.toolbarCont
  }

  /** SVG Container for eras and vertical-line events. Behind all other layers in event area */
  get eraAndLineContainer(): SVGElement {
    return this.eraLayer
  }

  /** Used by ToolbarView to create minimize-toolbar-button */
  get minimizedToolbarContainer(): HTMLDivElement {
    return this.minimizedToolbarCont
  }

  /** Used by arrow drawer */
  get canvasDimensions(): DOMRect {
    return this.eventSvg.getBoundingClientRect()
  }

  private initScrollListener() {
    /*
     * TODO
     */
    // if (!this.chartCtx.settings.stickyCalAxes) return
    //
    // const scrollContainer = this.getScrollableContainer(false)
    // if (!scrollContainer) return
    //
    // scrollContainer.addEventListener('scroll', () => {
    //   const scrollTop = scrollContainer.scrollTop
    //   this.calendarSvg.style.transform = `translateY(-${scrollTop}px)`
    // }, {passive: true})
  }

  // private updateStickyAxes(_scrollContainer: HTMLElement) {
  // const scrollTop = scrollContainer.scrollTop
  // const clientHeight = scrollContainer.clientHeight
  // const bottomViewportEdge = scrollTop + clientHeight
  //
  // // Find all calendar axis groups inside dynamicCalendarLayer
  // const axisGroups = Array.from(this.dynamicCalendarLayer.children) as SVGGElement[]
  //
  // axisGroups.forEach((group) => {
  //   const originalY = parseFloat(group.dataset.originalY || '0')
  //   if (!group.dataset.originalY) {
  //     const transform = group.getAttribute('transform') || ''
  //     const match = transform.match(/translate\(([^,]+),\s*([^\)]+)\)/)
  //     if (match) group.dataset.originalY = match[2]
  //   }
  // })
  // }

}

