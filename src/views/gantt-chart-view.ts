import FantasyGanttPlugin from '../main'
import {Util} from '../view/svg-drawer-util'
import {Css} from '../const/constants'
import {ManualSvg} from '../view/manual-svg-icons'
import {GanttChartViewModel} from '../model/gantt-chart-model'
import TextWidthCache from '../view/text-space-cache'

export class GanttChartView {
  svg: SVGElement
  /**
   * Group background colors
   */
  backgroundGroup: SVGElement
  chartArea: SVGElement
  gridG: SVGElement
  dataG: SVGElement
  axisG: SVGElement
  clipRect: SVGElement

  constructor(readonly plugin: FantasyGanttPlugin,
              readonly container: HTMLElement,
              readonly viewConfig: GanttChartViewModel,
              readonly textCache: TextWidthCache  ) {

    this.container.empty()

    /*
     * cursor: grab;
     * display: block;
     * width: 100%;
     *
     * :active -> cursor: grabbing;
     */
    this.svg = Util.createSvg('svg', Css.svg.canvas)
    this.svg.setAttribute('height', this.viewConfig.totalHeight.toString())
    this.container.appendChild(this.svg)

    ManualSvg.addArrowTipAsSvgDef(this.svg)

    this.backgroundGroup = Util.createSvg('g')
    this.svg.appendChild(this.backgroundGroup)

    this.chartArea = Util.createSvg('g')
    this.svg.appendChild(this.chartArea)

    /* Dedicated grid container behind bars and points */
    this.gridG = Util.createSvg('g')
    this.chartArea.appendChild(this.gridG)

    const defs = Util.createSvg('defs')
    const clipPath = Util.createSvg('clipPath')
    clipPath.setAttribute('id', 'gantt-clip')
    this.clipRect = Util.createSvg('rect')

    const itemsAreaHeight = this.viewConfig.totalHeight - (this.viewConfig.activeAxesList.length * this.viewConfig.calendarAxisRowHeight) - this.viewConfig.margin.bottom
    this.clipRect.setAttribute('height', itemsAreaHeight.toString())

    clipPath.appendChild(this.clipRect)
    defs.appendChild(clipPath)
    this.svg.appendChild(defs)

    this.dataG = Util.createSvg('g')
    this.dataG.setAttribute('clip-path', 'url(#gantt-clip)')
    this.chartArea.appendChild(this.dataG)

    this.axisG = Util.createSvg('g')
    this.chartArea.appendChild(this.axisG)
  }

  clearGroupBackground() {
    this.backgroundGroup.empty()
  }

  addGroupBackground(name:string, yOffset: number, height:number, isEvenGroup: boolean) {

    const groupG = Util.createSvg('g')
    groupG.setAttribute('transform', `translate(0, ${yOffset})`)
    this.backgroundGroup.appendChild(groupG)

    const cssClass = isEvenGroup ? Css.group.rowEven : Css.group.rowOdd
    const rect = Util.createSvg('rect', cssClass, {width:this.clientWidth, height})
    groupG.appendChild(rect)


    const badge = Util.createSvg('rect', Css.group.badge, {x: 10})
    const label = Util.createSvg('text', Css.group.text, {x: 20, y: 17})
    groupG.appendChild(badge)
    groupG.appendChild(label)

    label.textContent = name.toUpperCase()
    const badgeWidth = this.textCache.getSvgWidth(label, name)
    badge.setAttribute('width', String(badgeWidth))

  }

  private get clientWidth() {
    return this.container.clientWidth
  }
}

