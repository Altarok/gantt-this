import {GanttGroup, GanttItem} from '../const/types'
import FantasyGanttPlugin from '../main'
import {Css} from '../const/strings'
import {Gregorian} from '../util/gregorian'
import {GanttEventManager} from './svg-event-manager'
import {Priorities} from "../util/priority-util";

const css = 'class'

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
  private activeAxesList: string[] = []
  private totalHeight = 400
  private resizeObserver: ResizeObserver

  private settings = {showBars: true, showPoints: true, enableGrouping: true}
  config = {
    rowHeight: 24,
    groupHeaderHeight: 25,
    singleAxisHeight: 35,
    margin: {top: 20, right: 0, bottom: 10, left: 0}
  }

  // Bounds tracked in raw day counts
  private minDays = 0
  private maxDays = 0
  zoomScale = 1
  zoomTranslateX = 0

  constructor(
    public readonly container: HTMLElement,
    public rawData: GanttItem[],
    public readonly tooltip: HTMLElement,
    public readonly hoverTitle: HTMLElement,
    public readonly hoverDates: HTMLElement,
    public readonly plugin: FantasyGanttPlugin
  ) {
    this.calculateGlobalBounds()
    this.initLayout()
    this.initChartStructure()

    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize()
    })
    this.resizeObserver.observe(this.container)
  }

  public updateData(newData: GanttItem[]) {
    this.rawData = newData
    this.calculateGlobalBounds()
    this.initLayout()
    this.initChartStructure()
    this.handleResize()
  }

  initLayout() {
    let activeData: GanttItem[] = []

    const {groups: groupSettings, calendars: calendarSettings} = this.plugin.settings

    if (this.settings.showBars) activeData = activeData.concat(this.rawData.filter(d =>
        d.displayType === 'bar' && (!groupSettings[d.group] || groupSettings[d.group]?.visible) && calendarSettings[d.calendarType]?.visible
      )
    )
    if (this.settings.showPoints) activeData = activeData.concat(this.rawData.filter(d =>
        d.displayType === 'point' && (!groupSettings[d.group] || groupSettings[d.group]?.visible) && calendarSettings[d.calendarType]?.visible
      )
    )

    /*
     * Calendars to be shown as axis:
     */
    this.activeAxesList = Array.from(new Set(activeData.map(d => d.calendarType)))
    this.activeAxesList.sort((a, b) => (calendarSettings[a]?.priority ?? Infinity) - (calendarSettings[b]?.priority ?? Infinity));

    /*
     * TODO first collect and sort group names - then map to groups
     */
    this.groups = []
    let currentYOffset = this.config.margin.top

    if (this.settings.enableGrouping) {
      const groupedMap = new Map<string, GanttItem[]>()
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

    // debugger

    /* Before going on, we have to sort groups by their respective priority */
    Priorities.fixGanttGroupPrioritySetupIfBroken(this.groups, groupSettings)

    Object.values(this.groups).forEach(grp => {
      // TODO fix y offest
    })
    // debugger

    const combinedAxesHeight = this.activeAxesList.length * this.config.singleAxisHeight
    this.totalHeight = currentYOffset + combinedAxesHeight + this.config.margin.bottom
    this.container.style.height = '100%'// `${this.totalHeight}px`
  }

  initChartStructure() {
    if (this.eventManager) {
      this.eventManager.destroy()
    }

    this.container.innerHTML = ''

    this.svg = this.createSVGElement('svg')
    this.svg.setAttribute(css, Css.svg.canvas)
    this.svg.setAttribute('height', this.totalHeight.toString())
    this.container.appendChild(this.svg)

    this.backgroundG = this.createSVGElement('g')
    this.svg.appendChild(this.backgroundG)

    this.chartArea = this.createSVGElement('g')
    this.chartArea.setAttribute('transform', `translate(${this.config.margin.left}, 0)`)
    this.svg.appendChild(this.chartArea)

    // Dedicated grid container behind bars and points
    this.gridG = this.createSVGElement('g')
    this.chartArea.appendChild(this.gridG)

    const defs = this.createSVGElement('defs')
    const clipPath = this.createSVGElement('clipPath')
    clipPath.setAttribute('id', 'gantt-clip')
    this.clipRect = this.createSVGElement('rect')

    const itemsAreaHeight = this.totalHeight - (this.activeAxesList.length * this.config.singleAxisHeight) - this.config.margin.bottom
    this.clipRect.setAttribute('height', itemsAreaHeight.toString())

    clipPath.appendChild(this.clipRect)
    defs.appendChild(clipPath)
    this.svg.appendChild(defs)

    this.dataG = this.createSVGElement('g')
    this.dataG.setAttribute('clip-path', 'url(#gantt-clip)')
    this.chartArea.appendChild(this.dataG)

    this.axisG = this.createSVGElement('g')
    this.chartArea.appendChild(this.axisG)

    this.eventManager = new GanttEventManager(this)
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

    this.groups.forEach((d, i) => {
      if (this.settings.enableGrouping) {


        const groupG = this.createSVGElement('g')
        groupG.setAttribute('transform', `translate(0, ${d.yOffset})`)

        const rect = this.createSVGElement('rect')
        rect.setAttribute('width', width.toString())
        rect.setAttribute('height', d.height.toString())
        rect.setAttribute(css, i % 2 === 0 ? Css.group.rowEven : Css.group.rowOdd)
        groupG.appendChild(rect)

        this.backgroundG.appendChild(groupG)

        const badge = groupG.createSvg('rect', {attr: {x: 10, class: Css.group.badge}})
        const text = groupG.createSvg('text', {attr: {x: 20, y: 17, class: Css.group.text}})
        text.textContent = d.name.toUpperCase()

        const computedLength = text.getComputedTextLength()
        const textWidthEstimate = computedLength || d.name.length * 6.5
        const badgeWidth = (textWidthEstimate + 20).toString()

        badge.setAttribute('width', badgeWidth)
      }
    })
  }

  renderData(width: number) {
    this.dataG.innerHTML = ''

    // debugger

    this.groups.forEach(group => {
      const groupYStart = group.yOffset + (this.settings.enableGrouping ? this.config.groupHeaderHeight : 0)

      group.items.forEach((d: GanttItem) => {
        const lane = d.lane
        // debugger
        const laneY = groupYStart + lane! * this.config.rowHeight

        if (d.displayType === 'bar') {
          const x1 = this.getXPosition(d.startDays, width)
          const x2 = this.getXPosition(d.endDays, width)
          const barWidth = Math.max(2, x2 - x1)

          const rect = this.createSVGElement('rect')
          rect.setAttribute(css, Css.item.bar)
          rect.setAttribute('x', x1.toString())
          rect.setAttribute('y', laneY.toString())
          rect.setAttribute('width', barWidth.toString())
          if (d.color) rect.setAttribute('fill', d.color)
          rect.setAttribute('data-id', d.id.toString())
          this.dataG.appendChild(rect)
        } else if (d.displayType === 'point') {
          const cx = this.getXPosition(d.startDays, width)

          const circle = this.createSVGElement('circle')
          circle.setAttribute(css, Css.item.point)
          circle.setAttribute('cx', cx.toString())
          circle.setAttribute('cy', laneY.toString())
          if (d.color) circle.setAttribute('fill', d.color)
          circle.setAttribute('data-id', d.id.toString())
          this.dataG.appendChild(circle)
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

    let stepDays = 1
    if (totalDaysSpan > 365 * 50) stepDays = 365 * 10
    else if (totalDaysSpan > 365 * 10) stepDays = 365 * 2
    else if (totalDaysSpan > 365 * 3) stepDays = 365
    else if (totalDaysSpan > 365) stepDays = 90
    else if (totalDaysSpan > 60) stepDays = 20
    else if (totalDaysSpan > 20) stepDays = 7
    else if (totalDaysSpan > 5) stepDays = 2

    const startDaysValue = Math.floor(this.minDays / stepDays) * stepDays - stepDays
    const endDaysValue = Math.ceil(this.maxDays / stepDays) * stepDays + stepDays

    this.activeAxesList.forEach((calType, index) => {
      const currentAxisYStart = itemsAreaHeight + (index * this.config.singleAxisHeight)

      const individualAxisG = this.createSVGElement('g')
      individualAxisG.setAttribute('transform', `translate(0, ${currentAxisYStart})`)

      // Layer 1: Ticks, baseline, and dates (rendered underneath)
      const ticksG = this.createSVGElement('g')
      individualAxisG.appendChild(ticksG)

      const baseline = this.createSVGElement('line')
      baseline.setAttribute('x1', '0')
      baseline.setAttribute('x2', renderWidth.toString())
      baseline.setAttribute('y1', '0')
      baseline.setAttribute('y2', '0')
      baseline.setAttribute(css, Css.axis.baseline)
      ticksG.appendChild(baseline)

      let lastTextX = -999
      const config = this.plugin.calendarConfigsCache.get(calType) ?? null

      for (let currDays = startDaysValue; currDays <= endDaysValue; currDays += stepDays) {
        const xPos = this.getXPosition(currDays, width)
        if (xPos < 0 || xPos > renderWidth) continue

        // Draw vertical gridlines into dedicated grid container
        if (index === 0) {
          const gridLine = this.createSVGElement('line')
          gridLine.setAttribute('x1', xPos.toString())
          gridLine.setAttribute('x2', xPos.toString())
          gridLine.setAttribute('y1', '0') // `-${itemsAreaHeight}`)
          gridLine.setAttribute('y2', itemsAreaHeight.toString()) // '0')
          gridLine.setAttribute(css, Css.axis.gridline)
          this.gridG.appendChild(gridLine)
        }

        const tick = this.createSVGElement('line')
        tick.setAttribute('x1', xPos.toString())
        tick.setAttribute('x2', xPos.toString())
        tick.setAttribute('y1', '0')
        tick.setAttribute('y2', '5')
        tick.setAttribute(css, Css.axis.tick)
        ticksG.appendChild(tick)

        if (xPos - lastTextX > 80) {
          const text = this.createSVGElement('text')
          text.setAttribute('x', xPos.toString())
          text.setAttribute('y', '20')
          text.setAttribute(css, Css.axis.text)

          text.textContent = Gregorian.formatDaysToCalendarString(currDays, config)

          ticksG.appendChild(text)
          lastTextX = xPos
        }
      }

      // Layer 2: Badge and label (rendered on top so ticks scroll beneath them)
      const headerG = this.createSVGElement('g')
      individualAxisG.appendChild(headerG)

      const badge = this.createSVGElement('rect')
      badge.setAttribute(css, Css.axis.labelBadge)
      badge.setAttribute('x', '8')
      badge.setAttribute('y', '7')

      // Calculate width accurately off-screen with explicit uppercase padding
      const textWidth = this.measureTextWidth(calType)
      const badgePadding = 12
      const exactWidth = textWidth + badgePadding

      badge.setAttribute('width', exactWidth.toFixed(1))
      headerG.appendChild(badge)

      const label = this.createSVGElement('text')
      label.setAttribute('x', '14')
      label.setAttribute('y', '19')
      label.setAttribute(css, Css.axis.label)
      label.textContent = calType

      headerG.appendChild(label)

      this.axisG.appendChild(individualAxisG)
    })
  }

  private measureTextWidth(text: string): number {
    const canvas = window.document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return text.length * 8

    // Match: font-size: 0.75em (~12px in default Obsidian), font-weight: bold
    context.font = 'bold 12px sans-serif'

    // Explicitly measure uppercase because CSS applies text-transform: uppercase
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
    const newScale = oldScale / factor // Math.max(oldScale / factor, 0.5) // Min zoom floor

    // Focal point zoom: adjust translateX so center point stays pinned
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
    const newScale = oldScale * factor // Math.min(oldScale * factor, 50) // Max zoom cap

    // Focal point zoom: adjust translateX so center point stays pinned
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
    this.settings.showBars = val
    this.updateSettings()
  }

  toggleShowPoints(val: boolean) {
    this.settings.showPoints = val
    this.updateSettings()
  }

  toggleGrouping(val: boolean) {
    this.settings.enableGrouping = val
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

  private createSVGElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
    return window.document.createElementNS('http://www.w3.org/2000/svg', tag)
  }
}
