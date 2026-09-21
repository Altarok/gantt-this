import FantasyGanttPlugin from '../main'
import {Util} from '../view/svg-drawer-util'
import {Css} from '../const/constants'
import {ManualSvg} from '../view/manual-svg-icons'
import {GanttChartViewModel} from '../model/gantt-chart-model'

export class GanttChartView {
  svg: SVGElement
  backgroundG: SVGElement
  chartArea: SVGElement
  gridG: SVGElement
  dataG: SVGElement
  axisG: SVGElement
  clipRect: SVGElement

  constructor(readonly plugin: FantasyGanttPlugin,
              readonly container: HTMLElement,
              readonly viewConfig: GanttChartViewModel) {

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

    this.backgroundG = Util.createSvg('g')
    this.svg.appendChild(this.backgroundG)

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

}

