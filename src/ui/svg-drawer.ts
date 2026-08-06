import FantasyGanttPlugin from '../main'
import {
  CalendarConfig,
  CodeBlockContent,
  GanttChartConfig,
  GanttGroup,
  GanttItem,
  GanttItemDisplayType,
  GroupOrCalendarSettings,
  SvgDrawerData
} from '../const/types'
import {Css} from '../const/constants'
import {GanttEventManager} from './svg-event-manager'
import {Priorities} from '../util/priority-util'
import {createAxisDateDescription} from '../util/dates'
import {Util} from './svg-drawer-util'

export class GanttRenderEngine {
  private eventManager?: GanttEventManager
  svg!: SVGElement
  private backgroundG!: SVGElement
  private chartArea!: SVGElement
  private gridG!: SVGElement
  private dataG!: SVGElement
  private axisG!: SVGElement
  private clipRect!: SVGElement

  private groups: GanttGroup[] = []
  /** Collection of calendars to be shown as axis. */
  private activeAxesList: string[] = []
  private totalHeight = 400
  private resizeObserver: ResizeObserver

  config: GanttChartConfig = {
    showEras: true,
    showBars: true,
    showPoints: true,
    enableGrouping: true,
    rowHeight: 24,
    groupHeaderHeight: 25,
    singleAxisHeight: 35,
    margin: {top: 20, right: 0, bottom: 10, left: 0}
  }

  /* Bounds tracked in raw day counts */
  private minDays = 0
  private maxDays = 0
  zoomScale = 1
  zoomTranslateX = 0

  private svgDrawerData: SvgDrawerData

  constructor(public readonly container: HTMLElement,
              public rawData: GanttItem[],
              public readonly tooltip: HTMLElement,
              public readonly hoverTitle: HTMLElement,
              public readonly hoverDates: HTMLElement,
              public readonly plugin: FantasyGanttPlugin,
              public readonly codeBlockContent: CodeBlockContent
  ) {
    this.svgDrawerData = this.updateSvgDrawerData()
    this.calculateGlobalBounds()
    this.initLayout()
    this.initChartStructure()

    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(this.container)
  }

  public updateData(newData: GanttItem[]) {
    this.svgDrawerData = this.updateSvgDrawerData()
    this.rawData = newData
    this.calculateGlobalBounds()
    this.initLayout()
    this.initChartStructure()
    this.handleResize()
  }

  updateSvgDrawerData() {
    return {
      mappedGrpConfigs: Object.fromEntries(this.plugin.settings.groups.map((g: GroupOrCalendarSettings) => [g.id, g])),
      mappedCalConfigs: Object.fromEntries(this.plugin.settings.calendars.map((c: GroupOrCalendarSettings) => [c.id, c]))
    }
  }

  initLayout() {
    let activeData: GanttItem[] = Util.filterActivelyShownEventData(this.rawData, this.svgDrawerData, this.config)

    this.activeAxesList = Array.from(new Set(activeData.map(d => d.calendarType)))
    Priorities.sortCalendarAxisByPriority(this.activeAxesList, this.svgDrawerData.mappedCalConfigs)

    const groupNames: string[] = Array.from(new Set(activeData.map(d => d.group)))
    Priorities.sortGroupAxisByPriority(groupNames, this.svgDrawerData.mappedGrpConfigs)

    this.groups = []
    let currentYOffset = this.config.margin.top

    if (this.config.enableGrouping) {
      const groupedMap = new Map<string, GanttItem[]>()
      for (const name of groupNames) { /* groupNames is sorted! */
        groupedMap.set(name, [])
      }
      activeData.forEach(item => {
        const gName = item.group || 'general'
        if (!groupedMap.has(gName)) groupedMap.set(gName, [])
        groupedMap.get(gName)?.push(item)
      })

      groupedMap.forEach((items, groupName) => {
        const {processedData, totalLanes} = this.calculateStacking(items)
        const groupHeight = Math.max(1, totalLanes) * this.config.rowHeight + this.config.groupHeaderHeight
        this.groups.push({
          name: groupName,
          items: processedData,
          yOffset: currentYOffset,
          height: groupHeight,
          lanes: totalLanes
        })
        currentYOffset += groupHeight
      })
    } else {
      const {processedData, totalLanes} = this.calculateStacking(activeData)
      const groupHeight = Math.max(1, totalLanes) * this.config.rowHeight
      this.groups.push({
        name: 'All',
        items: processedData,
        yOffset: currentYOffset,
        height: groupHeight,
        lanes: totalLanes
      })
      currentYOffset += groupHeight
    }

    /* Before going on, we have to sort groups by their respective priority */
    Priorities.fixGanttGroupPrioritySetupIfBroken(this.groups, this.svgDrawerData.mappedGrpConfigs)

    const combinedAxesHeight = this.activeAxesList.length * this.config.singleAxisHeight
    this.totalHeight = currentYOffset + combinedAxesHeight + this.config.margin.bottom
    this.container.style.height = '100%' /* `${this.totalHeight}px` */
  }

  initChartStructure() {
    if (this.eventManager) this.eventManager.destroy()

    this.container.innerHTML = ''

    this.svg = Util.createSVGElement('svg', Css.svg.canvas)
    this.svg.setAttribute('height', this.totalHeight.toString())
    this.container.appendChild(this.svg)

    this.backgroundG = Util.createSVGElement('g')
    this.svg.appendChild(this.backgroundG)

    this.chartArea = Util.createSVGElement('g')
    this.chartArea.setAttribute('transform', `translate(${this.config.margin.left}, 0)`)
    this.svg.appendChild(this.chartArea)

    /* Dedicated grid container behind bars and points */
    this.gridG = Util.createSVGElement('g')
    this.chartArea.appendChild(this.gridG)

    const defs = Util.createSVGElement('defs')
    const clipPath = Util.createSVGElement('clipPath')
    clipPath.setAttribute('id', 'gantt-clip')
    this.clipRect = Util.createSVGElement('rect')

    const itemsAreaHeight = this.totalHeight - (this.activeAxesList.length * this.config.singleAxisHeight) - this.config.margin.bottom
    this.clipRect.setAttribute('height', itemsAreaHeight.toString())

    clipPath.appendChild(this.clipRect)
    defs.appendChild(clipPath)
    this.svg.appendChild(defs)

    this.dataG = Util.createSVGElement('g')
    this.dataG.setAttribute('clip-path', 'url(#gantt-clip)')
    this.chartArea.appendChild(this.dataG)

    this.axisG = Util.createSVGElement('g')
    this.chartArea.appendChild(this.axisG)

    this.eventManager = new GanttEventManager(this,
      this.plugin.settings.mouseOverEventShowBox,
      this.plugin.settings.mouseOverEventShowVerticalLine)
  }

  handleResize() {
    const width = this.container.clientWidth || 800
    this.clipRect.setAttribute('width', (width - this.config.margin.left - this.config.margin.right).toString())

    this.drawGroupBackgrounds(width)
    this.renderData(width)
    this.drawAxes(width)
  }

  private drawGroupBackgrounds(width: number) {
    this.backgroundG.innerHTML = ''

    if (this.config.enableGrouping) {
      this.groups.forEach((d, i) => {

        const groupG = Util.createSVGElement('g')
        groupG.setAttribute('transform', `translate(0, ${d.yOffset})`)

        const rect = Util.createSVGElement('rect', i % 2 === 0 ? Css.group.rowEven : Css.group.rowOdd)
        rect.setAttribute('width', width.toString())
        rect.setAttribute('height', d.height.toString())
        groupG.appendChild(rect)

        this.backgroundG.appendChild(groupG)

        const badge = groupG.createSvg('rect', {attr: {x: 10, class: Css.group.badge}})
        const text = groupG.createSvg('text', {attr: {x: 20, y: 17, class: Css.group.text}})
        text.textContent = d.name.toUpperCase()

        const computedLength = text.getComputedTextLength()
        const textWidthEstimate = computedLength || d.name.length * 6.5
        const badgeWidth = (textWidthEstimate + 20).toString()

        badge.setAttribute('width', badgeWidth)
      })
    }
  }

  renderData(width: number) {
    this.dataG.innerHTML = ''
    const halfRowHeight = this.config.rowHeight / 2

    let firstYValue: number | null = null

    const totalChartHeight = this.groups.reduce((acc, g) => {
      const header = this.config.enableGrouping ? this.config.groupHeaderHeight : 0
      const content = (g.lanes ?? 1) * this.config.rowHeight
      return acc + header + content
    }, 0)

    this.groups.forEach(group => {
      firstYValue ??= group.yOffset
      const groupYStart = group.yOffset + (this.config.enableGrouping ? this.config.groupHeaderHeight : 0)

      const headerHeight = this.config.enableGrouping ? this.config.groupHeaderHeight : 0
      const groupContentHeight = (group.lanes ?? 1) * this.config.rowHeight
      const totalGroupHeight = headerHeight + groupContentHeight

      group.items.forEach((d: GanttItem) => {
        const lane = d.lane
        const laneY = groupYStart + lane! * this.config.rowHeight
        const displayType: GanttItemDisplayType = d.displayType

        if (displayType === 'vertical-line') {

          const x1 = this.getXPosition(d.startDays, width)
          Util.drawVerticalLine(d, x1, firstYValue!, totalChartHeight, this.plugin.settings.uxVerticalLineEventWidth, this.dataG)

        } else if (displayType === 'era') {

          const x1 = this.getXPosition(d.startDays, width)
          const x2 = this.getXPosition(d.endDays, width)
          const isInGeneralGroup = d.group === 'general'
          const y: number = isInGeneralGroup ? firstYValue! : group.yOffset
          const height: number = isInGeneralGroup ? totalChartHeight : totalGroupHeight

          Util.drawEra(d, x1, x2, y, height, this.dataG)

        } else if (displayType === 'bar') {

          const x1 = this.getXPosition(d.startDays, width)
          const x2 = this.getXPosition(d.endDays, width)
          Util.drawBar(d, x1, x2, laneY, this.dataG)

        } else if (displayType === 'point') {

          const x = this.getXPosition(d.startDays, width)
          Util.drawPoint(d, x, laneY + halfRowHeight, this.dataG)

        } else if (displayType === 'diamond') {

          const x = this.getXPosition(d.startDays, width)
          Util.drawDiamond(d, x, laneY + halfRowHeight, this.dataG)

        } else if (displayType === 'box') {

          const x = this.getXPosition(d.startDays, width)
          Util.drawBox(d, x, laneY + halfRowHeight, this.dataG)

        }
      })
    })
  }

  drawAxes(width: number) {
    this.axisG.innerHTML = ''
    this.gridG.innerHTML = ''
    const renderWidth = width - this.config.margin.left - this.config.margin.right

    const itemsAreaHeight = this.totalHeight - (this.activeAxesList.length * this.config.singleAxisHeight) - this.config.margin.bottom
    const totalDaysSpan = (this.maxDays - this.minDays) / this.zoomScale

    const stepDays = Math.floor(totalDaysSpan / 6) + 1

    const startDaysValue = Math.floor(this.minDays / stepDays) * stepDays - stepDays
    const endDaysValue = Math.ceil(this.maxDays / stepDays) * stepDays + stepDays

    this.activeAxesList.forEach((calType, index) => {
      const currentAxisYStart = itemsAreaHeight + (index * this.config.singleAxisHeight)

      const individualAxisG = Util.createSVGElement('g')
      individualAxisG.setAttribute('transform', `translate(0, ${currentAxisYStart})`)

      /* Layer 1: Ticks, baseline, and dates (rendered underneath) */
      const ticksG = Util.createSVGElement('g')
      individualAxisG.appendChild(ticksG)

      const baseline = Util.createSVGElement('line', Css.axis.baseline)
      baseline.setAttribute('x1', '0')
      baseline.setAttribute('x2', renderWidth.toString())
      baseline.setAttribute('y1', '0')
      baseline.setAttribute('y2', '0')
      ticksG.appendChild(baseline)

      let lastTextX = -999
      const calendarConfig: CalendarConfig | undefined = this.plugin.calendarConfigsCache.get(calType) ?? undefined

      for (let currDays = startDaysValue; currDays <= endDaysValue; currDays += stepDays) {
        const xPos = this.getXPosition(currDays, width)
        if (xPos < 0 || xPos > renderWidth) continue

        /* Draw vertical gridlines into dedicated grid container */
        if (index === 0) {
          const gridLine = Util.createSVGElement('line', Css.axis.gridline)
          gridLine.setAttribute('x1', xPos.toString())
          gridLine.setAttribute('x2', xPos.toString())
          gridLine.setAttribute('y1', '0')
          gridLine.setAttribute('y2', itemsAreaHeight.toString())
          this.gridG.appendChild(gridLine)
        }

        const tick = Util.createSVGElement('line', Css.axis.tick)
        tick.setAttribute('x1', xPos.toString())
        tick.setAttribute('x2', xPos.toString())
        tick.setAttribute('y1', '0')
        tick.setAttribute('y2', '5')
        ticksG.appendChild(tick)

        if (xPos - lastTextX > 80) {
          const text = Util.createSVGElement('text', Css.axis.text)
          text.setAttribute('x', xPos.toString())
          text.setAttribute('y', '20')
          text.textContent = createAxisDateDescription(currDays, calendarConfig)

          ticksG.appendChild(text)
          lastTextX = xPos
        }
      }

      const calBadgeTextContent = calendarConfig?.displayName ?? calendarConfig?.name ?? calType

      /* Layer 2: Badge and label (rendered on top so ticks scroll beneath them) */
      const headerG = Util.createSVGElement('g')
      individualAxisG.appendChild(headerG)

      const badge = Util.createSVGElement('rect', Css.axis.labelBadge)
      badge.setAttribute('x', '8')
      badge.setAttribute('y', '7')

      /* Calculate width accurately off-screen with explicit uppercase padding */
      const textWidth = this.measureTextWidth(calBadgeTextContent)
      const badgePadding = 12
      const exactWidth = textWidth + badgePadding

      badge.setAttribute('width', exactWidth.toFixed(1))
      headerG.appendChild(badge)

      const label = Util.createSVGElement('text', Css.axis.label)
      label.setAttribute('x', '14')
      label.setAttribute('y', '19')
      label.textContent = calBadgeTextContent

      headerG.appendChild(label)

      this.axisG.appendChild(individualAxisG)
    })
  }

  private measureTextWidth(text: string): number {
    const canvas = window.createEl('canvas')
    const context = canvas.getContext('2d')
    if (!context) return text.length * 8

    /* Match: font-size: 0.75em (~12px in default Obsidian), font-weight: bold */
    context.font = 'bold 12px sans-serif'

    /* Explicitly measure uppercase because CSS applies text-transform: uppercase */
    return context.measureText(text.toUpperCase()).width
  }

  resetZoom() {
    if (this.eventManager?.isDragging) return
    this.zoomScale = 1
    this.zoomTranslateX = 0
    this.handleResize()
  }

  zoomOut(factor = 1.25) {
    if (this.eventManager?.isDragging) return

    const width = this.container.clientWidth || 800
    const renderWidth = width - this.config.margin.left - this.config.margin.right
    const centerX = renderWidth / 2

    const oldScale = this.zoomScale
    const newScale = oldScale / factor /* Math.max(oldScale / factor, 0.5) - Min zoom floor */

    /* Focal point zoom: adjust translateX so center point stays pinned */
    this.zoomTranslateX = centerX - (centerX - this.zoomTranslateX) * (newScale / oldScale)
    this.zoomScale = newScale

    this.handleResize()
  }

  zoomIn(factor = 1.25) {
    if (this.eventManager?.isDragging) return

    const width = this.container.clientWidth || 800
    const renderWidth = width - this.config.margin.left - this.config.margin.right
    const centerX = renderWidth / 2

    const oldScale = this.zoomScale
    const newScale = oldScale * factor /* Math.min(oldScale * factor, 50) - Max zoom cap */

    /* Focal point zoom: adjust translateX so center point stays pinned */
    this.zoomTranslateX = centerX - (centerX - this.zoomTranslateX) * (newScale / oldScale)
    this.zoomScale = newScale

    this.handleResize()
  }

  /** Shift view left by moving translateX positive */
  panLeft(percentage = 0.25) {
    if (this.eventManager?.isDragging) return
    const width = this.container.clientWidth || 800
    const renderWidth = width - this.config.margin.left - this.config.margin.right

    this.zoomTranslateX += renderWidth * percentage
    this.handleResize()
  }

  /** Shift view right by moving translateX negative */
  panRight(percentage = 0.25) {
    if (this.eventManager?.isDragging) return
    const width = this.container.clientWidth || 800
    const renderWidth = width - this.config.margin.left - this.config.margin.right

    this.zoomTranslateX -= renderWidth * percentage
    this.handleResize()
  }

  toggleShowBars(val: boolean) {
    this.config.showBars = val
    this.updateSettings()
  }

  toggleShowPoints(val: boolean) {
    this.config.showPoints = val
    this.updateSettings()
  }

  toggleGrouping(val: boolean) {
    this.config.enableGrouping = val
    this.updateSettings()
  }

  updateSettings() {
    this.initLayout()
    this.initChartStructure()
    this.handleResize()
  }

  public destroy() {
    this.resizeObserver.disconnect()
    this.eventManager?.destroy()
  }

  private calculateGlobalBounds() {
    if (this.rawData.length === 0) {
      const todayDays = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
      this.minDays = todayDays - 15
      this.maxDays = todayDays + 15
      return
    }

    const startValues = this.rawData.map(d => d.startDays)
    const endValues = this.rawData.map(d => Math.max(d.startDays, d.endDays))

    const paddingDays = 15
    this.minDays = Math.min(...startValues) - paddingDays
    this.maxDays = Math.max(...endValues) + paddingDays
  }

  private calculateStacking(items: GanttItem[]) {
    const sorted = [...items].sort((a, b) => a.startDays - b.startDays)
    const lanes: GanttItem[][] = []
    sorted.forEach(item => {
      let placed = false
      for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i]
        if (!lane) continue

        const lastItem = lane[lane.length - 1]

        if (lastItem && lastItem.endDays < item.startDays - 1) {
          lane?.push(item)
          item.lane = i
          placed = true
          break
        }
      }
      if (!placed) {
        lanes.push([item])
        item.lane = lanes.length - 1
      }
    })
    return {processedData: sorted, totalLanes: lanes.length}
  }

  private getXPosition(days: number, width: number): number {
    const renderWidth = width - this.config.margin.left - this.config.margin.right
    const percentage = (days - this.minDays) / (this.maxDays - this.minDays)
    return (percentage * renderWidth * this.zoomScale) + this.zoomTranslateX
  }

}
