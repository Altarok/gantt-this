import FantasyGanttPlugin from '../main'
import {Css} from '../const/constants'
import {ManualSvg} from '../view/manual-svg-icons'
import {GanttChartModel} from '../model/gantt-chart-model'
import TextWidthCache from '../view/text-space-cache'

export class GanttChartView {
  chartContainer: HTMLDivElement
  toolbarContainer: HTMLDivElement

  svg: SVGElement
  /** Group background colors + group badges   */
  private readonly backgroundLayer: SVGElement
  /** Foreground. Everything else */
  private readonly foregroundLayer: SVGElement
  /** Inside foregroundLayer: background grid elements */
  gridLayer: SVGElement
  /** Inside foregroundLayer: data events */
  private readonly dataLayer: SVGElement
  /** Inside foregroundLayer > dataLayer : era layer used for eras and vertical-line events */
  eraLayer: SVGElement
  /** Inside foregroundLayer > dataLayer : layer used for mouse overlay */
  lowerHoverLayer: SVGElement
  repeaterEventLayer: SVGElement
  /** Inside foregroundLayer > dataLayer : event layer used for other events */
  eventLayer: SVGElement
  upperHoverLayer: SVGElement

  /** Inside foregroundLayer: calendars */
  dynamicCalendarLayer: SVGElement
  staticCalendarLayer: SVGElement
  /** Prevent overflow rectangle */
  private readonly clipRect: SVGElement

  constructor(readonly plugin: FantasyGanttPlugin,
              readonly container: HTMLElement,
              readonly viewModel: GanttChartModel,
              readonly textCache: TextWidthCache) {

    this.container.empty()

    const {settings} = plugin

    if (settings.uxMoveToolbarBelowChart && settings.uxMakeToolbarSticky) {
      /* separate toolbar and chart, chart first */
      const mainWrapper = container.createDiv({cls: Css.wrapper})
      this.chartContainer = mainWrapper.createDiv({cls: Css.chartContainer})
      this.toolbarContainer = container.createDiv({cls: Css.toolbar.container})
    } else if (settings.uxMoveToolbarBelowChart) {
      /* join toolbar and chart, chart first  */
      const mainWrapper = container.createDiv({cls: Css.wrapper})
      this.chartContainer = mainWrapper.createDiv({cls: Css.chartContainer})
      this.toolbarContainer = mainWrapper.createDiv({cls: Css.toolbar.container})
    } else if (settings.uxMakeToolbarSticky) {
      /* separate toolbar and chart, toolbar first */
      this.toolbarContainer = container.createDiv({cls: Css.toolbar.container})
      const mainWrapper = container.createDiv({cls: Css.wrapper})
      this.chartContainer = mainWrapper.createDiv({cls: Css.chartContainer})
    } else {
      /* join toolbar and chart, toolbar first */
      const mainWrapper = container.createDiv({cls: Css.wrapper})
      this.toolbarContainer = mainWrapper.createDiv({cls: Css.toolbar.container})
      this.chartContainer = mainWrapper.createDiv({cls: Css.chartContainer})
    }


    /*
     * cursor: grab
     * display: block
     * width: 100%
     *
     * :active -> cursor: grabbing
     */
    this.svg = this.chartContainer.createSvg('svg', {
      cls: Css.svg.canvas,
      attr: {height: this.viewModel.totalHeight.toString()}
    })

    ManualSvg.addArrowTipAsSvgDef(this.svg)

    this.backgroundLayer = this.svg.createSvg('g')
    this.foregroundLayer = this.svg.createSvg('g')
    const defs = this.svg.createSvg('defs')

    /* Dedicated grid container behind bars and points */
    /*
     * TODO create a chart specific ID (e.g. gantt-clip-UUID)
     */
    const clipPath = defs.createSvg('clipPath', {attr: {id: 'gantt-clip'}})
    const eventsAreaHeight = this.viewModel.eventsAreaHeight
    this.clipRect = clipPath.createSvg('rect', {attr: {height: eventsAreaHeight}})

    this.gridLayer = this.foregroundLayer.createSvg('g')
    this.dataLayer = this.foregroundLayer.createSvg('g', {attr: {'clip-path': 'url(#gantt-clip)'}})

    this.dynamicCalendarLayer = this.foregroundLayer.createSvg('g')
    this.staticCalendarLayer = this.foregroundLayer.createSvg('g')

    this.eraLayer = this.dataLayer.createSvg('g', {cls: Css.itemLayer.era})
    this.lowerHoverLayer = this.dataLayer.createSvg('g')
    this.repeaterEventLayer = this.dataLayer.createSvg('g', {cls: Css.itemLayer.repeater})
    this.eventLayer = this.dataLayer.createSvg('g')
    this.upperHoverLayer = this.dataLayer.createSvg('g')
  }

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
    const badgeWidth = this.textCache.getSvgWidth(label, name)
    badge.setAttribute('width', String(badgeWidth))
  }

  createCalAxisGroup(currentAxisYStart: number): SVGGElement {
    const g: SVGGElement = this.dynamicCalendarLayer.createSvg('g')
    g.setAttribute('transform', `translate(0, ${currentAxisYStart})`)
    return g
  }

  drawCalAxisBaseline(calGroup: SVGGElement, x1: number, x2: number, axisColor: string): void {
    calGroup.createSvg('line', {
      cls: Css.axis.baseline, attr: {x1, y1: 0, x2, y2: 0, 'stroke-width': 2.5, stroke: axisColor}
    })
  }

  drawCalAxisCap(calGroup: SVGGElement, x: number, axisColor: string): void {
    calGroup.createSvg('line', {
      cls: 'calendar-cap-marker', attr: {x1: x, y1: -6, x2: x, y2: +6, 'stroke-width': 2.5, stroke: axisColor}
    })
  }

  drawCalAxisTick(calGroup: SVGGElement, xPos: number): void {
    calGroup.createSvg('line', {
      cls: Css.axis.tick, attr: {x1: xPos, y1: 0, x2: xPos, y2: 5}
    })
  }

  drawCalAxisDate(calGroup: SVGGElement, xPos: number, date: string): void {
    const textSvg = calGroup.createSvg('text', {
      cls: Css.axis.text, attr: {x: xPos, y: 20}
    })
    textSvg.textContent = date
  }

  /** Draw vertical gridlines into dedicated grid container. */
  drawVerticalGridlineBehindEvents(xPos: number, itemsAreaHeight: number): void {
    this.gridLayer.createSvg('line', {
      cls: Css.axis.gridline, attr: {x1: xPos, y1: 0, x2: xPos, y2: itemsAreaHeight}
    })
  }


  drawCalendarBadge(calBadgeTextContent: string, sourceFilePath: string, currentAxisYStart: number) {
    const badgeWidth = this.textCache.getWidth(calBadgeTextContent).toFixed(1)

    const badge = this.staticCalendarLayer.createSvg('rect', {
      cls: Css.axis.labelBadge, attr: {x: 8, y: currentAxisYStart + 7, width: badgeWidth}
    })

    const label = this.staticCalendarLayer.createSvg('text', {
      cls: Css.axis.label, attr: {x: 14, y: currentAxisYStart + 19}
    })
    label.textContent = calBadgeTextContent

    if (sourceFilePath) {
      this.plugin.registerDomEvent(badge as unknown as HTMLElement,
        'click', () => void this.plugin.app.workspace.openLinkText(sourceFilePath, '', true)
      )
    }
  }

  setWidth(width: number) {
    this.clipRect.setAttribute('width', width.toString())
  }

}

