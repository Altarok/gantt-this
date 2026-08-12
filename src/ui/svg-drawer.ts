import FantasyGanttPlugin from '../main'
import {
  CalendarConfig,
  CodeBlockContent,
  GanttChartConfig,
  GanttGroup,
  GanttItem,
  GanttItemDisplayType,
  GanttItemDisplayTypes,
  GroupOrCalendarSettings,
  Moon,
  SvgDrawerData
} from '../const/types'
import {Css} from '../const/constants'
import {createGanttEventManager, GanttEventManager} from './event-manager'
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
  /** Day diff between 2 axis ticks. Must be positive. */
  stepDays = 1

  svgDrawerData: SvgDrawerData

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
    // this.transitionToPredefinedBounds()
    this.initLayout()
    this.initChartStructure()

    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(this.container)
  }

  public updateData(newData: GanttItem[]) {
    this.svgDrawerData = this.updateSvgDrawerData()
    this.rawData = newData
    this.calculateGlobalBounds()
    // this.transitionToPredefinedBounds()
    this.initLayout()
    this.initChartStructure()
    this.handleResize()
  }

  updateSvgDrawerData() {
    return {
      mappedGrpConfigs: Object.fromEntries(this.plugin.settings.groups.map((g: GroupOrCalendarSettings) => [g.id, g])),
      mappedCalConfigs: Object.fromEntries(this.plugin.settings.calendars.map((c: GroupOrCalendarSettings) => [c.id, c])),
      drawnGrps: Object.fromEntries(this.plugin.settings.groups.map((g: GroupOrCalendarSettings) => [g.id, {
        y1: 0, y2: 0
      }])),
      drawnCals: Object.fromEntries(this.plugin.settings.calendars.map((c: GroupOrCalendarSettings) => [c.id, {
        y1: 0, y2: 0
      }]))
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

    this.eventManager = createGanttEventManager(this,
      this.plugin.settings.mouseOverEventShowBox,
      this.plugin.settings.mouseOverEventShowVerticalLine)
  }

  handleResize() {
    const width = this.container.clientWidth || 800

    // Re-evaluate predefined bounds now that we have the true container width
    if (this.codeBlockContent.lowerBoundDateParsed ||
      this.codeBlockContent.upperBoundDateParsed ||
      this.codeBlockContent.centerHereDateParsed) {
      this.transitionToPredefinedBounds(width)
    }

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

        const cssClass = i % 2 === 0 ? Css.group.rowEven : Css.group.rowOdd
        const rect = Util.createSVGElement('rect', cssClass, {width, height: d.height})
        groupG.appendChild(rect)

        this.backgroundG.appendChild(groupG)

        const badge = Util.createSVGElement('rect', Css.group.badge, {x: 10})
        groupG.appendChild(badge)
        const text = Util.createSVGElement('text', Css.group.text, {x: 20, y: 17})
        groupG.appendChild(text)
        text.textContent = d.name.toUpperCase()

        const computedLength = text.getComputedTextLength()
        const textWidthEstimate = computedLength || d.name.length * 6.5
        const badgeWidth = (textWidthEstimate + 20).toString()

        badge.setAttribute('width', badgeWidth)
      })
    }
  }

  renderData(width: number) {
    this.dataG.empty()

    const eraLayer = Util.createSVGElement('g', 'gt-layer-eras')

    this.dataG.appendChild(eraLayer)

    const halfRowHeight = this.config.rowHeight / 2
    const firstYValue = this.config.margin.top
    const totalChartHeight = this.calculateTotalChartHeight()

    const headerHeight = this.config.enableGrouping ? this.config.groupHeaderHeight : 0

    this.groups.forEach(group => {
      const groupContentHeight = (group.lanes ?? 1) * this.config.rowHeight
      const totalGroupHeight = headerHeight + groupContentHeight
      const groupYStart = group.yOffset + headerHeight

      group.items.forEach((d: GanttItem) => {
        const lane = d.lane
        const laneY = groupYStart + (lane ?? 0) * this.config.rowHeight
        const displayType: GanttItemDisplayType = d.displayType

        const x1 = this.getXPosition(d.startDays, width)
        const x2 = (!d.endDays || d.endDays <= d.startDays) ? x1 : this.getXPosition(d.endDays, width)

        if (GanttItemDisplayTypes.isTimespan(displayType)) switch (displayType) {
          case 'bar':
            return Util.drawBar(d, x1, x2, laneY + halfRowHeight, this.dataG)
          case 'era': {
            const isInGeneralGroup = d.group === 'general'
            const y: number = isInGeneralGroup ? firstYValue : group.yOffset
            const height: number = isInGeneralGroup ? totalChartHeight : totalGroupHeight
            return Util.drawEra(d, x1, x2, y, height, eraLayer)
          }

        } else if (GanttItemDisplayTypes.isTimestamp(displayType)) switch (displayType) {
          case 'point':
            return Util.drawPoint(d, x1, laneY + halfRowHeight, this.dataG)
          case 'box':
            return Util.drawBox(d, x1, laneY + halfRowHeight, this.dataG)
          case 'vertical-line':
            return Util.drawVerticalLine(d, x1, firstYValue, totalChartHeight + this.config.margin.top, this.plugin.settings.uxVerticalLineEventWidth, eraLayer)
          case 'diamond':
            return Util.drawDiamond(d, x1, laneY + halfRowHeight, this.dataG)
          case 'triangle':
            return Util.drawTriangle(d, x1, laneY + halfRowHeight, this.dataG)
          case 'pentagon':
            return Util.drawPentagon(d, x1, laneY + halfRowHeight, this.dataG)
          case 'hexagon':
            return Util.drawHexagon(d, x1, laneY + halfRowHeight, this.dataG)

        }

      }) // end loop group.items.forEach(GanttItem)
    })
  }

  calculateTotalChartHeight() {
    return this.groups.reduce((acc, g) => {
      const header = this.config.enableGrouping ? this.config.groupHeaderHeight : 0
      const content = (g.lanes ?? 1) * this.config.rowHeight
      return acc + header + content
    }, 0)
  }

  drawAxes(width: number) {
    this.axisG.innerHTML = ''
    this.gridG.innerHTML = ''
    const renderWidth = width - this.config.margin.left - this.config.margin.right

    const itemsAreaHeight = this.totalHeight - (this.activeAxesList.length * this.config.singleAxisHeight) - this.config.margin.bottom
    const totalDaysSpan = (this.maxDays - this.minDays) / this.zoomScale

    this.stepDays = Math.floor(totalDaysSpan / (renderWidth / 120))

    const startDaysValue = Math.floor(this.minDays / this.stepDays) * this.stepDays - this.stepDays
    const endDaysValue = Math.ceil(this.maxDays / this.stepDays) * this.stepDays + this.stepDays

    this.activeAxesList.forEach((calType, index) => {
      const currentAxisYStart = itemsAreaHeight + (index * this.config.singleAxisHeight)
      const tickPixelSpacing = (this.stepDays / (this.maxDays - this.minDays)) * renderWidth * this.zoomScale
      const showMoonPhases: boolean = tickPixelSpacing >= 24

      this.svgDrawerData.drawnCals[calType] = {
        y1: currentAxisYStart,
        y2: currentAxisYStart + this.config.singleAxisHeight - 1
      }

      const individualAxisG = Util.createSVGElement('g')
      individualAxisG.setAttribute('transform', `translate(0, ${currentAxisYStart})`)

      /* Layer 1: Ticks, baseline, and dates (rendered underneath) */
      const ticksG = Util.createSVGElement('g')
      individualAxisG.appendChild(ticksG)

      let lastTextX = -999
      const calendarConfig: CalendarConfig | undefined = this.plugin.calendarConfigsCache.get(calType) ?? undefined
      const calBadgeTextContent = calendarConfig?.displayName ?? calendarConfig?.name ?? calType
      const axisColor = this.svgDrawerData.mappedCalConfigs[calType]?.color ?? 'currentColor'

      const calStart = calendarConfig?.startDay as number ?? -Infinity
      const calEnd = calendarConfig?.endDay as number ?? Infinity

      // Skip rendering, if current view is completely outside of calendar's lifetime
      if (endDaysValue < calStart || startDaysValue > calEnd) return

      // Clamp rendering bounds to calendar lifetime
      const effectiveStartDay = Math.max(startDaysValue, calStart)
      const effectiveEndDay = Math.min(endDaysValue, calEnd)

      // Draw axis baseline capped to calendar bounds
      const startX = this.getXPosition(effectiveStartDay, width)
      const endX = this.getXPosition(effectiveEndDay, width)

      const baseline = Util.createSVGElement('line', Css.axis.baseline, {
        x1: startX, y1: 0, x2: endX, y2: 0, 'stroke-width': '2.5', fill: axisColor
      })
      ticksG.appendChild(baseline)

      // Draw start cap marker (if in visible range)
      if (calendarConfig?.startDay && calendarConfig.startDay as number >= startDaysValue) {
        const startCap = Util.createSVGElement('line', 'calendar-cap-marker', {
          x1: startX, y1: -6, x2: startX, y2: 6, stroke: 'currentColor', 'stroke-width': '2'
        })
        ticksG.appendChild(startCap)
      }

      // Draw end cap marker (if in visible range)
      if (calendarConfig?.endDay !== undefined && calendarConfig.endDay as number <= endDaysValue) {
        const endCap = Util.createSVGElement('line', 'calendar-cap-marker', {
          x1: endX, y1: -6, x2: endX, y2: 6, stroke: 'currentColor', 'stroke-width': '2'
        })
        ticksG.appendChild(endCap)
      }

      // if (!calBadgeTextContent && calendarConfig?.name) {
      //   const labelX = (startX + endX) / 2
      //   const title = Util.createSVGElement('text', 'calendar-reign-title', {
      //     x: labelX, y: -10, 'text-anchor': 'middle', fill: 'currentColor'
      //   })
      //   title.textContent = calendarConfig.name
      //   ticksG.appendChild(title)
      // }

      for (let currDays = effectiveStartDay; currDays <= effectiveEndDay; currDays += this.stepDays) {
        const xPos = this.getXPosition(currDays, width)
        if (xPos < 0 || xPos > renderWidth) continue

        /* Draw vertical gridlines into dedicated grid container */
        if (index === 0) {
          const gridLine = Util.createSVGElement('line', Css.axis.gridline, {
            x1: xPos, y1: 0, x2: xPos, y2: itemsAreaHeight
          })
          this.gridG.appendChild(gridLine)
        }

        const tick = Util.createSVGElement('line', Css.axis.tick, {x1: xPos, y1: 0, x2: xPos, y2: 5})
        ticksG.appendChild(tick)

        if (xPos - lastTextX > 80) {
          const text = Util.createSVGElement('text', Css.axis.text, {x: xPos, y: 20})
          text.textContent = createAxisDateDescription(currDays, calendarConfig)

          ticksG.appendChild(text)
          lastTextX = xPos
        }

      }

      if (showMoonPhases) {

        const moons = calendarConfig?.moons ?? []
        const moonCount = moons?.length ?? 0

        if (moonCount) moons.forEach((moon: Moon, index: number) => {
          const L = moon.cycle
          if (!L || L <= 0) return
          const O = moon.offset ?? 0

          // Pixel distance for a 1/4 cycle step (quarter moon to quarter moon)
          const quarterCycleDays = L / 4
          const x0 = this.getXPosition(startDaysValue, width)
          const xQuarter = this.getXPosition(startDaysValue + quarterCycleDays, width)
          const quarterCyclePixels = Math.abs(xQuarter - x0)

          // Pixel distance for a 1/2 cycle step (New to Full)
          const halfCyclePixels = quarterCyclePixels * 2

          // Minimum distance threshold to render without icon overlap
          const MIN_ICON_SPACING_PX = 20

          // Guard: Skip entire moon if even Full/New phases are too crowded
          if (halfCyclePixels < MIN_ICON_SPACING_PX) return

          // Determine if zoom level allows quarter phases or major phases only
          const showQuarterPhases = quarterCyclePixels >= MIN_ICON_SPACING_PX

          // Determine cycle integer range covering visible bounds
          const minK = Math.floor((effectiveStartDay /* startDaysValue */ + O) / L) - 1
          const maxK = Math.ceil((effectiveEndDay /* endDaysValue */ + O) / L) + 1

          for (let k = minK; k <= maxK; k++) {
            // 1. New Moon (Progress 0.0) -> Phase Index 0
            const newMoonDay = k * L - O
            renderPhaseIfVisible(this.getXPosition(newMoonDay, width), newMoonDay, 0)

            // 2. First Quarter (Progress 0.25) -> Phase Index 1
            if (showQuarterPhases) {
              const firstQuarterDay = (k + 0.25) * L - O
              renderPhaseIfVisible(this.getXPosition(firstQuarterDay, width), firstQuarterDay, 1)
            }

            // 3. Full Moon (Progress 0.5) -> Phase Index 2
            const fullMoonDay = (k + 0.5) * L - O
            renderPhaseIfVisible(this.getXPosition(fullMoonDay, width), fullMoonDay, 2)

            // 4. Third Quarter (Progress 0.75) -> Phase Index 3
            if (showQuarterPhases) {
              const thirdQuarterDay = (k + 0.75) * L - O
              renderPhaseIfVisible(this.getXPosition(thirdQuarterDay, width), thirdQuarterDay, 3)
            }
          }

          // Helper closure to handle visibility bounds checking & drawing
          function renderPhaseIfVisible(x: number, exactDay: number, phaseIndex: number) {
            if (effectiveEndDay < exactDay || effectiveStartDay > exactDay) return
            if (exactDay >= startDaysValue && exactDay <= endDaysValue)
              if (x >= 0 && x <= renderWidth)
                Util.drawMoonPhase(x, 0, phaseIndex, index, moonCount, ticksG, moon.color ?? 'currentColor')
          }
        })
      }

      if (calBadgeTextContent) {
        /* Layer 2: Badge and label (rendered on top so ticks scroll beneath them) */
        const headerG = Util.createSVGElement('g')
        individualAxisG.appendChild(headerG)

        const badge = Util.createSVGElement('rect', Css.axis.labelBadge, {x: 8, y: 7})

        /* Calculate width accurately off-screen with explicit uppercase padding */
        const textWidth = this.measureTextWidth(calBadgeTextContent)
        const badgePadding = 12
        const exactWidth = textWidth + badgePadding

        badge.setAttribute('width', exactWidth.toFixed(1))
        headerG.appendChild(badge)

        const label = Util.createSVGElement('text', Css.axis.label, {x: 14, y: 19})
        label.textContent = calBadgeTextContent

        headerG.appendChild(label)
      }

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
    if (this.plugin.settings.autoRestrictZoom && this.zoomScale < 0.5) return

    const width = this.container.clientWidth || 800
    const renderWidth = width - this.config.margin.left - this.config.margin.right
    const centerX = renderWidth / 2

    const oldScale = this.zoomScale
    let newScale = oldScale / factor
    if (this.plugin.settings.autoRestrictZoom && newScale < 0.5) newScale = 0.5

    /* Focal point zoom: adjust translateX so center point stays pinned */
    this.zoomTranslateX = centerX - (centerX - this.zoomTranslateX) * (newScale / oldScale)
    this.zoomScale = newScale
    this.handleResize()
  }

  zoomIn(factor = 1.25) {
    if (this.eventManager?.isDragging) return
    if (this.plugin.settings.autoRestrictZoom && this.stepDays < 2) return

    const width = this.container.clientWidth || 800
    const renderWidth = width - this.config.margin.left - this.config.margin.right
    const centerX = renderWidth / 2

    const oldScale = this.zoomScale
    const newScale = oldScale * factor

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

    const lowerBound = Math.min(...startValues)
    const upperBound = Math.max(...endValues)
    const diff = upperBound - lowerBound

    const paddingDays = diff > 150 ? Math.floor(diff / 10) : 15

    this.minDays = lowerBound - paddingDays
    this.maxDays = upperBound + paddingDays
  }

  private transitionToPredefinedBounds(width: number): void {

    const lower = this.codeBlockContent.lowerBoundDateParsed?.days
    const upper = this.codeBlockContent.upperBoundDateParsed?.days
    const center = this.codeBlockContent.centerHereDateParsed?.days

    const totalRange = this.maxDays - this.minDays
    if (totalRange <= 0) {
      this.zoomScale = 1
      this.zoomTranslateX = 0
      return
    }

    const renderWidth = Math.max(1, width - this.config.margin.left - this.config.margin.right)

    // Case A: Predefined min and/or max bounds supplied
    if (lower !== undefined || upper !== undefined) {
      const targetMin = lower ?? this.minDays
      const targetMax = upper ?? this.maxDays
      const targetRange = targetMax - targetMin

      if (targetRange > 0) {
        this.zoomScale = totalRange / targetRange
        // Pixel position of targetMin at scale 1:
        const minXAtScale1 = ((targetMin - this.minDays) / totalRange) * renderWidth
        // Shift targetMin to pixel X = 0 under the new zoomScale:
        this.zoomTranslateX = -(minXAtScale1 * this.zoomScale)
        return
      }
    }

    // Case B: Single center point specified
    if (center !== undefined) {
      const currentScale = this.zoomScale > 0 ? this.zoomScale : 1
      this.zoomScale = currentScale

      const centerXAtScale1 = ((center - this.minDays) / totalRange) * renderWidth
      const centerXZoomed = centerXAtScale1 * currentScale

      // Center the target day in the middle of renderWidth:
      this.zoomTranslateX = (renderWidth / 2) - centerXZoomed
      return
    }

    // Default: Full view reset
    this.zoomScale = 1
    this.zoomTranslateX = 0
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
