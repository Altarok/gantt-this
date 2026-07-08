import {CalendarConfig, GanttGroup, GanttItem} from './types'
import FantasyGanttPlugin from './main'
import {Css} from "./const/strings";

const css = 'class'

export class GanttRenderEngine {
  private svg!: SVGElement
  private backgroundG!: SVGElement
  private chartArea!: SVGElement
  private dataG!: SVGElement
  private axisG!: SVGElement
  private clipRect!: SVGElement

  private groups: GanttGroup[] = []
  private activeAxesList: string[] = []
  private totalHeight = 400
  private resizeObserver: ResizeObserver

  private settings = {showBars: true, showPoints: true, enableGrouping: true}
  private config = {
    rowHeight: 24,
    groupHeaderHeight: 25,
    singleAxisHeight: 35,
    margin: {top: 20, right: 0, bottom: 10, left: 0}
  }

  // Bounds tracked in raw day counts rather than standard dates milliseconds
  private minDays = 0
  private maxDays = 0
  private zoomScale = 1
  private zoomTranslateX = 0

  private isDragging = false
  private startX = 0
  private startTranslateX = 0

  constructor(
    public readonly container: HTMLElement,
    public rawData: GanttItem[],
    public readonly tooltip: HTMLElement,
    public readonly hoverTitle: HTMLElement,
    public readonly hoverDates: HTMLElement,
    public readonly plugin: FantasyGanttPlugin
  ) {

    window.addEventListener('mousemove', (e) => {
      window.document.documentElement.style.setProperty('--mouse-x', `${e.clientX + 15}px`)
      window.document.documentElement.style.setProperty('--mouse-y', `${e.clientY + 15}px`)
    })

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
    if (this.settings.showBars) activeData = activeData.concat(this.rawData.filter(d => d.type === 'bar'))
    if (this.settings.showPoints) activeData = activeData.concat(this.rawData.filter(d => d.type === 'point'))

    this.activeAxesList = Array.from(new Set(activeData.map(d => d.calendarType)))

    this.groups = []
    let currentYOffset = this.config.margin.top

    if (this.settings.enableGrouping) {
      const groupedMap = new Map<string, GanttItem[]>()
      activeData.forEach(item => {
        const gName = item.group || 'General'
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

    const combinedAxesHeight = this.activeAxesList.length * this.config.singleAxisHeight
    this.totalHeight = currentYOffset + combinedAxesHeight + this.config.margin.bottom
    this.container.style.height = `${this.totalHeight}px`
  }

  initChartStructure() {
    this.container.innerHTML = ''

    this.svg = this.createSVGElement('svg')
    this.svg.setAttribute('width', '100%')
    this.svg.setAttribute('height', this.totalHeight.toString())
    this.svg.setAttribute(css, Css.svg.canvas)
    this.container.appendChild(this.svg)

    this.backgroundG = this.createSVGElement('g')
    this.svg.appendChild(this.backgroundG)

    this.chartArea = this.createSVGElement('g')
    this.chartArea.setAttribute('transform', `translate(${this.config.margin.left}, 0)`)
    this.svg.appendChild(this.chartArea)

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

    this.setupNativeZoomAndPan()
    this.setupInteractions()
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

        const text = this.createSVGElement('text')
        text.setAttribute('x', '20')
        text.setAttribute('y', '17')
        text.setAttribute(css, Css.group.text)
        text.textContent = d.name.toUpperCase()
        groupG.appendChild(text)

        const computedLength = text.getComputedTextLength()
        const textWidthEstimate = computedLength || d.name.length * 6.5
        const badgeWidth = (textWidthEstimate + 20).toString()

        const shadowRect = this.createSVGElement('rect')
        shadowRect.setAttribute('x', '10')
        shadowRect.setAttribute('width', badgeWidth)
        shadowRect.setAttribute(css, Css.group.shadow)

        const badge = this.createSVGElement('rect')
        badge.setAttribute('x', '10')
        badge.setAttribute('width', badgeWidth)
        badge.setAttribute(css, Css.group.badge)

        groupG.insertBefore(shadowRect, text)
        groupG.insertBefore(badge, text)

        this.backgroundG.appendChild(groupG)
      }
    })
  }

  private renderData(width: number) {
    this.dataG.innerHTML = ''

    this.groups.flatMap(g => g.items)
    // .forEach(d => {
    //   if (d.type === 'bar' || d.type === 'point') {
    //     let dateStr: string | undefined //  = "INVALID_DATE"
    //     try {
    //       dateStr = new Date(d.startDays * 86400000).toISOString().split('T')[0] ?? undefined
    //     } catch {
    //       dateStr = `Raw Days: ${d.startDays}`
    //     }
    // console.debug(`"${d.name}" (${d.type}) -> Start ISO: ${dateStr}`)
    //   }
    // })

    this.groups.forEach(group => {
      const groupYStart = group.yOffset + (this.settings.enableGrouping ? this.config.groupHeaderHeight : 0)

      group.items.forEach((d: GanttItem) => {
        const laneY = groupYStart + d.lane! * this.config.rowHeight

        if (d.type === 'bar') {
          const x1 = this.getXPosition(d.startDays, width)
          const x2 = this.getXPosition(d.endDays, width)
          const barWidth = Math.max(2, x2 - x1)

          const rect = this.createSVGElement('rect')
          rect.setAttribute(css, Css.item.bar)
          rect.setAttribute('x', x1.toString())
          rect.setAttribute('y', (laneY).toString())
          rect.setAttribute('width', barWidth.toString())
          // rect.setAttribute('height', (this.config.rowHeight - 8).toString())
          if (d.color) rect.setAttribute('fill', d.color)
          rect.setAttribute('data-id', d.id.toString())
          this.dataG.appendChild(rect)
        } else if (d.type === 'point') {
          const cx = this.getXPosition(d.startDays, width)

          const circle = this.createSVGElement('circle')
          circle.setAttribute(css, Css.item.point)
          circle.setAttribute('cx', cx.toString())
          circle.setAttribute('cy', (laneY).toString())
          // circle.setAttribute('r', '6')
          if (d.color) circle.setAttribute('fill', d.color)
          circle.setAttribute('data-id', d.id.toString())
          this.dataG.appendChild(circle)
        }
      })
    })
  }

  private drawAxes(width: number) {
    this.axisG.innerHTML = ''
    const renderWidth = width - this.config.margin.left - this.config.margin.right

    const itemsAreaHeight = this.totalHeight - (this.activeAxesList.length * this.config.singleAxisHeight) - this.config.margin.bottom
    const totalDaysSpan = (this.maxDays - this.minDays) / this.zoomScale

    let stepDays = 1
    if (totalDaysSpan > 365 * 3) stepDays = 365
    else if (totalDaysSpan > 365) stepDays = 90
    else if (totalDaysSpan > 60) stepDays = 30
    else if (totalDaysSpan > 20) stepDays = 7
    else if (totalDaysSpan > 5) stepDays = 2

    const startDaysValue = Math.floor(this.minDays / stepDays) * stepDays - stepDays
    const endDaysValue = Math.ceil(this.maxDays / stepDays) * stepDays + stepDays

    this.activeAxesList.forEach((calType, index) => {
      const currentAxisYStart = itemsAreaHeight + (index * this.config.singleAxisHeight)

      const individualAxisG = this.createSVGElement('g')
      individualAxisG.setAttribute('transform', `translate(0, ${currentAxisYStart})`)

      const baseline = this.createSVGElement('line')
      baseline.setAttribute('x1', '0')
      baseline.setAttribute('x2', renderWidth.toString())
      baseline.setAttribute('y1', '0')
      baseline.setAttribute('y2', '0')
      baseline.setAttribute(css, Css.axis.baseline)
      individualAxisG.appendChild(baseline)

      const label = this.createSVGElement('text')
      label.setAttribute('x', '10')
      label.setAttribute('y', '20')
      // label.setAttribute('style', 'font-size: 0.75em; font-weight: bold; fill: var(--text-muted); text-transform: uppercase;')
      label.setAttribute(css, Css.axis.label)
      label.textContent = calType
      individualAxisG.appendChild(label)

      let lastTextX = -999

      // Access configuration directly via plugin async cache
      const config = this.plugin.calendarConfigsCache.get(calType) ?? null

      for (let currDays = startDaysValue; currDays <= endDaysValue; currDays += stepDays) {
        const xPos = this.getXPosition(currDays, width)
        if (xPos < 0 || xPos > renderWidth) continue

        if (index === 0) {
          const gridLine = this.createSVGElement('line')
          gridLine.setAttribute('x1', xPos.toString())
          gridLine.setAttribute('x2', xPos.toString())
          gridLine.setAttribute('y1', `-${itemsAreaHeight}`)
          gridLine.setAttribute('y2', '0')
          gridLine.setAttribute(css, Css.axis.gridline)
          this.axisG.appendChild(gridLine)
        }

        const tick = this.createSVGElement('line')
        tick.setAttribute('x1', xPos.toString())
        tick.setAttribute('x2', xPos.toString())
        tick.setAttribute('y1', '0')
        tick.setAttribute('y2', '5')
        tick.setAttribute(css, Css.axis.tick)
        individualAxisG.appendChild(tick)

        if (xPos - lastTextX > 80) { // Slight padding bump for wider text layouts
          const text = this.createSVGElement('text')
          text.setAttribute('x', xPos.toString())
          text.setAttribute('y', '20')
          text.setAttribute('text-anchor', 'middle')
          text.setAttribute(css, Css.axis.text)

          text.textContent = this.formatDaysToCalendarString(currDays, config)

          individualAxisG.appendChild(text)
          lastTextX = xPos
        }
      }

      this.axisG.appendChild(individualAxisG)
    })
  }

  private setupNativeZoomAndPan() {
    this.svg.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('gantt-item')) return
      this.isDragging = true
      this.startX = e.clientX
      this.startTranslateX = this.zoomTranslateX
    })

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return
      const width = this.container.clientWidth || 800
      const deltaX = e.clientX - this.startX
      this.zoomTranslateX = this.startTranslateX + deltaX
      this.renderData(width)
      this.drawAxes(width)
    })

    window.addEventListener('mouseup', () => {
      this.isDragging = false
    })

    this.svg.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault()
      const width = this.container.clientWidth || 800
      const rect = this.svg.getBoundingClientRect()
      const mouseX = e.clientX - rect.left - this.config.margin.left

      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const nextScale = Math.min(100, Math.max(0.05, this.zoomScale * zoomFactor))

      this.zoomTranslateX = mouseX - (mouseX - this.zoomTranslateX) * (nextScale / this.zoomScale)
      this.zoomScale = nextScale

      this.renderData(width)
      this.drawAxes(width)
    }, {passive: false})
  }

  resetZoom() {
    this.zoomScale = 1
    this.zoomTranslateX = 0
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

  setupInteractions() {
    const showTooltip = (event: MouseEvent, d: GanttItem) => {
      this.hoverTitle.textContent = d.name
      this.hoverDates.textContent = d.type === 'bar' ? `${d.startDateDisplay} to ${d.endDateDisplay}` : d.startDateDisplay
      this.tooltip.classList.add('is-active')

      if (d.link) {
        this.tooltip.setAttribute('data-link', d.link)
      } else {
        this.tooltip.removeAttribute('data-link')
      }
    }

    this.svg.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement
      if (target?.classList.contains('gantt-item')) {
        const id = +(target.getAttribute('data-id') ?? 0)
        const dataObj = this.rawData.find(d => d.id === id)
        if (dataObj) showTooltip(event, dataObj)
      }
    })

    this.svg.addEventListener('mousemove', (event) => {
      window.document.documentElement.style.setProperty('--mouse-x', `${event.clientX + 15}px`)
      window.document.documentElement.style.setProperty('--mouse-y', `${event.clientY + 15}px`)

      const target = event.target as HTMLElement
      if (target?.classList.contains(Css.item.item)) {
        if (!this.tooltip.classList.contains('is-active')) {
          const id = +(target.getAttribute('data-id') ?? 0)
          const dataObj = this.rawData.find(d => d.id === id)
          if (dataObj) showTooltip(event, dataObj)
        }
      } else {
        this.tooltip.classList.remove('is-active')
      }
    })

    this.svg.addEventListener('mouseleave', () => {
      this.tooltip.classList.remove('is-active')
    })

    this.svg.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (target?.classList.contains('gantt-item')) {
        const id = +(target.getAttribute('data-id') ?? 0)
        const dataObj = this.rawData.find(d => d.id === id)
        if (dataObj?.link) {
          void this.plugin.app.workspace.openLinkText(dataObj.link, '', true)
        }
      }
    })
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

// 2. UPDATE THE AXIS LABEL FORMATTER INSIDE THE GANTT RENDER ENGINE CLASS
  private formatDaysToCalendarString(days: number, config: CalendarConfig | null): string {
    if (!config) {
      const dateObj = new Date(days * 24 * 60 * 60 * 1000)
      return dateObj.toISOString().split('T')[0]! // TODO remove '!'?
    }

    // STRATEGY A: Reverse Engine Real Gregorian Dates from Day Counts
    if (config.type === 'gregorian') {
      let remainingDays = days

      // Approximate year selection step
      let year = Math.floor(remainingDays / 365.2425) + 1
      let totalDaysToYearStart = (year - 1) * 365 + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)

      // Micro adjust to pinpoint exact leap layout boundary alignment
      while (totalDaysToYearStart > remainingDays) {
        year--
        totalDaysToYearStart = (year - 1) * 365 + Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)
      }

      remainingDays -= totalDaysToYearStart
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
      const monthDays = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

      let month = 1
      for (let m = 0; m < 12; m++) {
        if (remainingDays >= monthDays[m]!) {
          remainingDays -= monthDays[m]! // TODO remove '!'?
          month++
        } else {
          break
        }
      }
      const day = remainingDays + 1

      return `${year}${config.delimiter}${month.toString().padStart(2, '0')}${config.delimiter}${day.toString().padStart(2, '0')}`
    }

    // STRATEGY B: Reverse Engine Positional Multipliers (Mayan, etc.)
    const epochDate = new Date(config.epochGregorian)
    const epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))
    let localDays = days - epochDaysOffset

    if (localDays < 0) return `BCE (${Math.abs(localDays)} days)`

    const stringSegments: string[] = []
    config.units.forEach(unit => {
      const unitCount = Math.floor(localDays / unit.days)
      stringSegments.push(unitCount.toString())
      localDays %= unit.days
    })

    return stringSegments.join(config.delimiter)
  }
}
