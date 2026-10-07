import FantasyGanttPlugin from '../main'
import {Css} from '../const/constants'
import {ManualSvg} from '../view/manual-svg-icons'
import {GanttChartViewModel} from '../model/gantt-chart-model'
import TextWidthCache from '../view/text-space-cache'
import {createSvg} from "../view/svg-drawer-util";

export class GanttChartView {
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
              readonly viewModel: GanttChartViewModel,
              readonly textCache: TextWidthCache) {

    this.container.empty()

    /*
     * cursor: grab;
     * display: block;
     * width: 100%;
     *
     * :active -> cursor: grabbing;
     */
    this.svg = this.container.createSvg('svg', {
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

  drawCalendarBadge(calBadgeTextContent: string, sourceFilePath: string, currentAxisYStart: number) {
    const badgeWidth = this.textCache.getWidth(calBadgeTextContent).toFixed(1)

    const badge = createSvg('rect', Css.axis.labelBadge, {
      x: 8, y: currentAxisYStart + 7, width: badgeWidth
    })

    const label = createSvg('text', Css.axis.label, {
      x: 14, y: currentAxisYStart + 19
    })
    label.textContent = calBadgeTextContent

    if (sourceFilePath) {
      this.plugin.registerDomEvent(badge as unknown as HTMLElement, 'click',
        () => void this.plugin.app.workspace.openLinkText(sourceFilePath, '', true)
      )
    }

    this.staticCalendarLayer.appendChild(badge)
    this.staticCalendarLayer.appendChild(label)
  }

  setWidth(width: number) {
    this.clipRect.setAttribute('width', width.toString())
  }

  private get clientWidth() {
    return this.container.clientWidth
  }
}

