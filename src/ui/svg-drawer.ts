import {setIcon} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GanttChartSettings, GanttGroup, GanttItem} from '../const/types'
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

  private settings: GanttChartSettings = {showEras: true, showBars: true, showPoints: true, enableGrouping: true}
  config = {
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

  constructor(public readonly container: HTMLElement,
              public rawData: GanttItem[],
              public readonly tooltip: HTMLElement,
              public readonly hoverTitle: HTMLElement,
              public readonly hoverDates: HTMLElement,
              public readonly plugin: FantasyGanttPlugin
  ) {
    this.calculateGlobalBounds()
    this.initLayout()
    this.initChartStructure()

    this.resizeObserver = new ResizeObserver(() => this.handleResize())
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


    let activeData: GanttItem[] = Util.filterActivelyShownEventData(this.rawData, this.plugin.settings, this.settings)

    const {groups: groupConfigs, calendars: calendarConfigs} = this.plugin.settings

    this.activeAxesList = Array.from(new Set(activeData.map(d => d.calendarType)))
    Priorities.sortCalendarAxisByPriority(this.activeAxesList, calendarConfigs)


    const groupNames: string[] = Array.from(new Set(activeData.map(d => d.group)))
    Priorities.sortGroupAxisByPriority(groupNames, groupConfigs)

    this.groups = []
    let currentYOffset = this.config.margin.top

    if (this.settings.enableGrouping) {
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
    Priorities.fixGanttGroupPrioritySetupIfBroken(this.groups, groupConfigs)

    const combinedAxesHeight = this.activeAxesList.length * this.config.singleAxisHeight
    this.totalHeight = currentYOffset + combinedAxesHeight + this.config.margin.bottom
    this.container.style.height = '100%' /* `${this.totalHeight}px` */
  }

  initChartStructure() {
    if (this.eventManager) {
      this.eventManager.destroy()
    }

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

    this.groups.forEach((d, i) => {
      if (this.settings.enableGrouping) {


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
      }
    })
  }

  private truncateText(text: string, maxWidth: number, charWidthEstimate = 7): string {
    const maxChars = Math.floor(maxWidth / charWidthEstimate)
    if (text.length <= maxChars) return text
    if (maxChars <= 3) return '...'
    return text.substring(0, maxChars - 3) + '...'
  }

  renderData(width: number) {
    this.dataG.innerHTML = ''

    let firstYValue: number | null = null

    const totalChartHeight = this.groups.reduce((acc, g) => {
      const header = this.settings.enableGrouping ? this.config.groupHeaderHeight : 0
      const content = (g.lanes ?? 1) * this.config.rowHeight
      return acc + header + content
    }, 0)

    this.groups.forEach(group => {
      firstYValue ??= group.yOffset
      const groupYStart = group.yOffset + (this.settings.enableGrouping ? this.config.groupHeaderHeight : 0)

      const headerHeight = this.settings.enableGrouping ? this.config.groupHeaderHeight : 0
      const groupContentHeight = (group.lanes ?? 1) * this.config.rowHeight
      const totalGroupHeight = headerHeight + groupContentHeight

      group.items.forEach((d: GanttItem) => {
        const lane = d.lane
        const laneY = groupYStart + lane! * this.config.rowHeight
        const displayType = d.displayType

        if (displayType === 'vertical-line') {
          const x1 = this.getXPosition(d.startDays, width)

          const line = Util.createSVGElement('line', Css.item.line)
          line.setAttribute('x1', x1.toString())
          line.setAttribute('x2', x1.toString())
          // line.setAttribute('y', laneY.toString())
          line.setAttribute('y1', String(firstYValue ?? 0))
          line.setAttribute('y2', totalChartHeight.toString())
          line.setAttribute('stroke-width', this.plugin.settings.uxVerticalLineEventWidth.toString())
          if (d.color) line.setAttribute('stroke', d.color ?? 'red')
          line.setAttribute('data-id', d.id.toString())
          this.dataG.appendChild(line)

        } else if (displayType === 'era') {
          const x1 = this.getXPosition(d.startDays, width)
          const x2 = this.getXPosition(d.endDays, width)
          const barWidth = Math.max(2, x2 - x1)
          const eraBackground = Util.createSVGElement('rect', Css.item.era)
          eraBackground.setAttribute('pointer-events', 'none')

          { /* x */
            eraBackground.setAttribute('x', x1.toString())
            eraBackground.setAttribute('width', barWidth.toString())
          }
          if (d.group !== 'general') { /* y */
            eraBackground.setAttribute('y', group.yOffset.toString())
            eraBackground.setAttribute('height', totalGroupHeight.toString())
          } else {
            eraBackground.setAttribute('y', String(firstYValue!))
            eraBackground.setAttribute('height', totalChartHeight.toString())
          }
          { /* color */
            eraBackground.setAttribute('fill', d.color ?? '#ffff00')
            eraBackground.setAttribute('fill-opacity', '0.25')
          }
          this.dataG.appendChild(eraBackground)

          /* icon layout setup */
          const iconSize = 14
          const hasIcon = !!d.displayIcon
          const iconSpacing = hasIcon ? iconSize + 4 : 0

          if (hasIcon) {
            const foreignObj = Util.createSVGElement('foreignObject', Css.item.iconExternal)
            // Placed directly at x1 without left padding
            foreignObj.setAttribute('x', x1.toString())
            foreignObj.setAttribute('y', (eraBackground.getAttribute('y')! /* + (this.config.rowHeight - iconSize) / 2*/).toString())
            foreignObj.setAttribute('width', iconSize.toString())
            foreignObj.setAttribute('height', iconSize.toString())
            foreignObj.style.pointerEvents = 'none'

            const iconDiv = window.createDiv()
            iconDiv.className = Css.item.iconExternal
            iconDiv.style.width = '100%'
            iconDiv.style.height = '100%'
            iconDiv.style.display = 'flex'
            iconDiv.style.alignItems = 'center'
            iconDiv.style.justifyContent = 'center'
            if (d.displayIconColor) iconDiv.style.color = d.displayIconColor

            setIcon(iconDiv, d.displayIcon!)
            foreignObj.appendChild(iconDiv)
            this.dataG.appendChild(foreignObj)
          }

          { /* start text */
            const textLeftPadding = 6
            const textX = x1 + (hasIcon ? iconSpacing : textLeftPadding)
            const availableTextWidth = barWidth - (hasIcon ? iconSpacing : textLeftPadding)

            if (availableTextWidth > 0) {
              const text = Util.createSVGElement('text', Css.item.eraText)
              text.setAttribute('x', textX.toString())
              text.setAttribute('y', (eraBackground.getAttribute('y')!).toString())
              // (laneY + this.config.rowHeight / 2).toString())
              text.textContent = this.truncateText(`Era: ${d.name} (${d.startDateDisplay} - ${d.endDateDisplay})`, availableTextWidth)
              // text.setAttribute('data-id', d.id.toString())
              this.dataG.appendChild(text)
            }
          } /* end text */

        } else if (displayType === 'bar') {
          const x1 = this.getXPosition(d.startDays, width)
          const x2 = this.getXPosition(d.endDays, width)
          const barWidth = Math.max(2, x2 - x1)

          const rect = Util.createSVGElement('rect', Css.item.bar)
          rect.setAttribute('x', x1.toString())
          rect.setAttribute('y', laneY.toString())
          rect.setAttribute('width', barWidth.toString())
          if (d.color) rect.setAttribute('fill', d.color)
          rect.setAttribute('data-id', d.id.toString())
          this.dataG.appendChild(rect)

          /* icon layout setup */
          const iconSize = 14
          const hasIcon = !!d.displayIcon
          const iconSpacing = hasIcon ? iconSize + 4 : 0

          if (hasIcon) {
            const foreignObj = Util.createSVGElement('foreignObject')
            // Placed directly at x1 without left padding
            foreignObj.setAttribute('x', x1.toString())
            foreignObj.setAttribute('y', (laneY + (this.config.rowHeight - iconSize) / 2).toString())
            foreignObj.setAttribute('width', iconSize.toString())
            foreignObj.setAttribute('height', iconSize.toString())
            foreignObj.style.pointerEvents = 'none'

            const iconDiv = window.createDiv()
            iconDiv.className = Css.item.iconExternal
            iconDiv.style.width = '100%'
            iconDiv.style.height = '100%'
            iconDiv.style.display = 'flex'
            iconDiv.style.alignItems = 'center'
            iconDiv.style.justifyContent = 'center'
            if (d.displayIconColor) iconDiv.style.color = d.displayIconColor

            setIcon(iconDiv, d.displayIcon!)
            foreignObj.appendChild(iconDiv)
            this.dataG.appendChild(foreignObj)
          }

          { /* start text */
            const textLeftPadding = 6
            const textX = x1 + (hasIcon ? iconSpacing : textLeftPadding)
            const availableTextWidth = barWidth - (hasIcon ? iconSpacing : textLeftPadding)

            if (availableTextWidth > 0) {
              const text = Util.createSVGElement('text', Css.item.barText)
              text.setAttribute('x', textX.toString())
              text.setAttribute('y', (laneY + this.config.rowHeight / 2).toString())
              text.textContent = this.truncateText(d.name, availableTextWidth)
              text.setAttribute('data-id', d.id.toString())
              this.dataG.appendChild(text)
            }
          } /* end text */

        } else if (displayType === 'point') {
          const cx = this.getXPosition(d.startDays, width)

          const circle = Util.createSVGElement('circle', Css.item.circle)
          circle.setAttribute('cx', cx.toString())
          circle.setAttribute('cy', laneY.toString())
          if (d.color) circle.setAttribute('fill', d.color)
          circle.setAttribute('data-id', d.id.toString())
          this.dataG.appendChild(circle)

        } else if (displayType === 'diamond') {

          const cx = this.getXPosition(d.startDays, width)
          /* Center the diamond vertically in the row */
          const cy = laneY + this.config.rowHeight / 2

          const size = 7
          const points = `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`

          const polygon = Util.createSVGElement('polygon', Css.item.diamond)
          polygon.setAttribute('points', points)
          if (d.color) polygon.setAttribute('fill', d.color)
          polygon.setAttribute('data-id', d.id.toString())
          this.dataG.appendChild(polygon)

        } else if (displayType === 'icon' && d.displayIcon) {

          const cx = this.getXPosition(d.startDays, width)
          const cy = laneY + (this.config.rowHeight / 2)
          /* This is also done in CSS, see .gt-item.point-icon-external  */
          const size = 16

          const group = Util.createSVGElement('g')
          group.setAttribute('transform', `translate(${cx}, ${cy})`)

          const rect = Util.createSVGElement('rect', Css.item.icon)
          rect.setAttribute('x', `-${size / 2}`)
          rect.setAttribute('y', `-${size / 2}`)
          rect.setAttribute('data-id', d.id.toString())
          if (d.color) rect.setAttribute('fill', d.color)
          group.appendChild(rect)

          /* Create a foreignObject to bridge SVG and HTML DOM */
          const foreignObj = Util.createSVGElement('foreignObject')
          foreignObj.setAttribute('x', `-${size / 2}`)
          foreignObj.setAttribute('y', `-${size / 2}`)
          foreignObj.setAttribute('width', String(size))
          foreignObj.setAttribute('height', String(size))
          foreignObj.style.pointerEvents = 'none'

          /* Create a standard HTML div for setIcon */
          const iconDiv = window.createDiv()
          iconDiv.className = Css.item.iconExternal
          iconDiv.style.width = '100%'
          iconDiv.style.height = '100%'
          iconDiv.style.display = 'flex'
          iconDiv.style.alignItems = 'center'
          iconDiv.style.justifyContent = 'center'
          if (d.displayIconColor) iconDiv.style.color = d.displayIconColor

          /* Render icon inside the div */
          setIcon(iconDiv, d.displayIcon)

          foreignObj.appendChild(iconDiv)
          group.appendChild(foreignObj)
          this.dataG.appendChild(group)
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
      const config = this.plugin.calendarConfigsCache.get(calType) ?? null

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
          text.textContent = createAxisDateDescription(currDays, config)

          ticksG.appendChild(text)
          lastTextX = xPos
        }
      }

      /* Layer 2: Badge and label (rendered on top so ticks scroll beneath them) */
      const headerG = Util.createSVGElement('g')
      individualAxisG.appendChild(headerG)

      const badge = Util.createSVGElement('rect', Css.axis.labelBadge)
      badge.setAttribute('x', '8')
      badge.setAttribute('y', '7')

      /* Calculate width accurately off-screen with explicit uppercase padding */
      const textWidth = this.measureTextWidth(calType)
      const badgePadding = 12
      const exactWidth = textWidth + badgePadding

      badge.setAttribute('width', exactWidth.toFixed(1))
      headerG.appendChild(badge)

      const label = Util.createSVGElement('text', Css.axis.label)
      label.setAttribute('x', '14')
      label.setAttribute('y', '19')
      label.textContent = calType

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


}
