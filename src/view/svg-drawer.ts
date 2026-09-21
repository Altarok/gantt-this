import FantasyGanttPlugin from '../main'
import {
  CalendarConfig,
  CodeBlockContent,
  GanttGroup,
  GanttItem,
  GanttItemDisplayType,
  GanttItemDisplayTypes,
  NO_GROUP,
  SvgDrawerData
} from '../const/types'
import {Css} from '../const/constants'
import {createGanttEventManager, GanttEventManager} from '../ui/event-manager'
import {Priorities} from '../util/priority-util'
import {createAxisDateDescription, Dates} from '../util/dates'
import {Util} from './svg-drawer-util'
import {drawMoons} from './moon-drawer'
import TextWidthCache from './text-space-cache'
import {Recurring} from '../util/recurring-events'
import {GanttChartViewModel} from '../model/gantt-chart-model'
import {GanttChartView} from '../views/gantt-chart-view'

export class GanttRenderEngine {
  private eventManager?: GanttEventManager
  private groups: GanttGroup[] = []
  private resizeObserver: ResizeObserver

  svgDrawerData: SvgDrawerData
  private view: GanttChartView

  constructor(public readonly container: HTMLElement,
              public rawData: GanttItem[],
              public readonly plugin: FantasyGanttPlugin,
              public readonly codeBlockContent: CodeBlockContent,
              public readonly selectedFrontmatterProperties: string[] | null,
              readonly textCache: TextWidthCache,
              readonly viewConfig: GanttChartViewModel) {

    this.svgDrawerData = this.updateSvgDrawerData()
    this.calculateGlobalBounds()
    this.initLayout()
    this.view = this.initChartStructure()
    this.handleResize(true)

    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(this.container)
  }

  public updateData(newData: GanttItem[]) {
    this.svgDrawerData = this.updateSvgDrawerData()
    this.rawData = newData
    this.calculateGlobalBounds()
    this.initLayout()
    this.view = this.initChartStructure()
    this.handleResize(true)
  }

  private updateSvgDrawerData() {
    return {
      mappedGrpConfigs: Object.fromEntries(this.plugin.settings.groups.map(g => [g.id, g])),
      mappedCalConfigs: Object.fromEntries(this.plugin.settings.calendars.map(c => [c.id, c])),
      // drawnGroups: Object.fromEntries(this.plugin.settings.groups.map(g => [g.id, {y1: 0, y2: 0}])),
      drawnCals: Object.fromEntries(this.plugin.settings.calendars.map(c => [c.id, {y1: 0, y2: 0}]))
    }
  }

  private calculateGlobalBounds() {
    if (this.rawData.length === 0) {
      const todayDays = Dates.getTodayInDays()
      this.viewConfig.setDayRange(todayDays - 15, todayDays + 15)
      return
    }

    const startValues = this.rawData.map(d => d.startDays)
    const endValues = this.rawData.map(d => Math.max(d.startDays, d.endDays))

    const lowerBound = Math.min(...startValues)
    const upperBound = Math.max(...endValues)
    const diff = upperBound - lowerBound

    const paddingDays = diff > 150 ? Math.floor(diff / 10) : 15

    this.viewConfig.setDayRange(lowerBound - paddingDays, upperBound + paddingDays)
  }

  initLayout() {
    let activeItems: GanttItem[] = this.filterActiveEventData()

    // debugger

    let activeData: GanttItem[] = Recurring.expandRecurringEvents(this, activeItems)

    // debugger

    this.viewConfig.activeAxesList = Array.from(new Set(activeData.map(d => d.calendarType)))
    Priorities.sortCalendarAxisByPriority(this.viewConfig.activeAxesList, this.svgDrawerData.mappedCalConfigs)

    // TODO replace 'general' with configurable global fallback group
    const groupNames: string[] = Array.from(new Set(activeData.map(d => d.group || 'general')))
    Priorities.sortGroupAxisByPriority(groupNames, this.svgDrawerData.mappedGrpConfigs)

    this.groups = []
    let currentYOffset = this.viewConfig.margin.top

    if (this.viewConfig.enableGrouping) {
      const groupedMap = new Map<string, GanttItem[]>()
      for (const name of groupNames) { /* groupNames is sorted! */
        groupedMap.set(name, [])
      }
      activeData.forEach(item => {
        const gName = item.group || this.plugin.settings.defaultGroup
        if (!groupedMap.has(gName)) groupedMap.set(gName, [])
        groupedMap.get(gName)?.push(item)
      })

      groupedMap.forEach((items, groupName) => {
        const {processedData, totalLanes} = this.calculateStacking(items)
        const groupContentLanes = totalLanes > 0 ? totalLanes : 0
        const groupHeight = /* Math.max(1, totalLanes) */
          groupContentLanes * this.viewConfig.eventRowHeight + /* this.config.groupHeaderHeight */
          (this.viewConfig.enableGrouping ? this.viewConfig.groupHeaderHeight : 0)
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
      const groupContentLanes = totalLanes > 0 ? totalLanes : 0
      const groupHeight = /* Math.max(1, totalLanes) */
        groupContentLanes * this.viewConfig.eventRowHeight
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

    const combinedAxesHeight = this.viewConfig.activeAxesList.length * this.viewConfig.calendarAxisRowHeight
    this.viewConfig.totalHeight = currentYOffset + combinedAxesHeight + this.viewConfig.margin.bottom
  }

  initChartStructure(): GanttChartView {
    if (this.eventManager) this.eventManager.destroy()
    this.eventManager = createGanttEventManager(this, this.plugin.settings)

    return new GanttChartView(this.plugin, this.container, this.viewConfig, this.textCache)
  }

  handlePanOrZoom() {
    this.handleResize(false)
  }

  handleViewReset() {
    this.handleResize(true)
  }

  handleResize(includeViewReset = false) {
    const width = this.container.clientWidth
    if (!width || width <= 0) return

    if (includeViewReset && (this.codeBlockContent.lowerBoundDateParsed ||
      /* Re-evaluate predefined bounds now that we have the true container width */
      this.codeBlockContent.upperBoundDateParsed ||
      this.codeBlockContent.centerHereDateParsed)) {
      this.transitionToPredefinedBounds(width)
    }

    this.view.clipRect.setAttribute('width', this.getRenderWidth(width).toString())

    this.drawGroupBackgrounds(width)
    this.renderData(width)
    this.drawAxes(width)
  }

  private drawGroupBackgrounds(width: number) {
    this.view.clearGroupBackground()

    if (!this.viewConfig.enableGrouping) return

    this.groups.forEach((group, i) => {
      const isEvenGroup = i % 2 === 0

      this.view.addGroupBackground(group.name, group.yOffset, group.height, isEvenGroup)


      const groupG = Util.createSvg('g')
      groupG.setAttribute('transform', `translate(0, ${group.yOffset})`)

      const cssClass = isEvenGroup ? Css.group.rowEven : Css.group.rowOdd
      const rect = Util.createSvg('rect', cssClass, {width, height: group.height})
      groupG.appendChild(rect)

      this.view.backgroundGroup.appendChild(groupG)

      const badge = Util.createSvg('rect', Css.group.badge, {x: 10})
      const label = Util.createSvg('text', Css.group.text, {x: 20, y: 17})
      groupG.appendChild(badge)
      groupG.appendChild(label)

      label.textContent = group.name.toUpperCase()
      const badgeWidth = this.textCache.getSvgWidth(label, group.name)
      badge.setAttribute('width', String(badgeWidth))
    })

  }

  private mapLaneItems(group: GanttGroup, width: number): Map<number, GanttItem[]> {
    const laneItemsMap = new Map<number, GanttItem[]>()
    group.items.forEach(item => {
      const lane = item.lane ?? 0
      if (!laneItemsMap.has(lane)) laneItemsMap.set(lane, [])
      laneItemsMap.get(lane)?.push(item)
    })
    laneItemsMap.forEach(items => {
      items.sort((a, b) => this.getXPosition(a.startDays, width) - this.getXPosition(b.startDays, width))
    })
    return laneItemsMap
  }

  renderData(width: number) {
    this.view.dataG.empty()

    const eraLayer = Util.createSvg('g', 'gt-layer-eras')

    this.view.dataG.appendChild(eraLayer)

    const halfRowHeight = this.viewConfig.eventRowHeight / 2
    const firstYValue = this.viewConfig.margin.top
    const totalChartHeight = this.calculateTotalChartHeight()

    const headerHeight = this.viewConfig.enableGrouping ? this.viewConfig.groupHeaderHeight : 0

    this.groups.forEach(group => {
      const groupContentHeight = (group.lanes ?? 1) * this.viewConfig.eventRowHeight
      const totalGroupHeight = headerHeight + groupContentHeight
      const groupYStart = group.yOffset + headerHeight

      const laneItemsMap: Map<number, GanttItem[]> = this.mapLaneItems(group, width)

      group.items.forEach((d: GanttItem) => {
        const lane = d.lane
        const laneY = groupYStart + (lane ?? 0) * this.viewConfig.eventRowHeight
        const displayType: GanttItemDisplayType = d.displayType

        const x1 = this.getXPosition(d.startDays, width)
        const x2 = (d.endDays <= d.startDays) ? x1 : this.getXPosition(d.endDays, width)
        const renderWidth = this.getRenderWidth(width)

        // Calculate available width for timestamp text (Method 1)
        const currentLaneItems = laneItemsMap.get(d.lane ?? 0) ?? []
        const currentIndex = currentLaneItems.indexOf(d)
        const nextItem = currentIndex !== -1 ? currentLaneItems[currentIndex + 1] : undefined
        // currentLaneItems.find(item => this.getXPosition(item.startDays, width) > x1)

        const nextX = nextItem ? this.getXPosition(nextItem.startDays, width) : renderWidth
        const availableWidth = Math.max(0, nextX - x1 - 10) // 10px padding buffer

        // TODO add CSS for events duplicates
        // // Inside renderData() loop:
        // if (d.isRecurringInstance) {
        //   // Option A: Target via CSS selector in your stylesheet using class gt-recurring-instance
        //   // Option B: Render opacity dynamically if needed
        // }

        if (GanttItemDisplayTypes.isTimespan(displayType)) switch (displayType) {
          case 'bar':
            return Util.drawBar(d, x1, x2, laneY + halfRowHeight, this.view.dataG)
          case 'era': {
            const isNotInAGroup = d.group === NO_GROUP
            const y: number = isNotInAGroup ? firstYValue : group.yOffset
            const height: number = isNotInAGroup ? totalChartHeight : totalGroupHeight
            return Util.drawEra(d, x1, x2, y, height, eraLayer)
          }

        } else if (GanttItemDisplayTypes.isTimestamp(displayType)) switch (displayType) {
          case 'point':
            return Util.drawPoint(d, x1, laneY + halfRowHeight, this.view.dataG, availableWidth)
          case 'box':
            return Util.drawBox(d, x1, laneY + halfRowHeight, this.view.dataG, availableWidth)
          case 'vertical-line': {
            const isNotInAGroup = d.group === NO_GROUP
            const y: number = isNotInAGroup ? firstYValue : group.yOffset
            const height: number = isNotInAGroup ? totalChartHeight : totalGroupHeight
            return Util.drawVerticalLine(d, x1, y, y + height, this.plugin.settings.uxVerticalLineEventWidth, eraLayer)
          }
          case 'diamond':
            return Util.drawDiamond(d, x1, laneY + halfRowHeight, this.view.dataG, availableWidth)
          case 'triangle':
            return Util.drawTriangle(d, x1, laneY + halfRowHeight, this.view.dataG, availableWidth)
          case 'pentagon':
            return Util.drawPentagon(d, x1, laneY + halfRowHeight, this.view.dataG, availableWidth)
          case 'star':
            return Util.drawStar(d, x1, laneY + halfRowHeight, this.view.dataG, availableWidth)
          case 'hexagon':
            return Util.drawHexagon(d, x1, laneY + halfRowHeight, this.view.dataG, availableWidth)
          case 'octagon':
            return Util.drawOctagon(d, x1, laneY + halfRowHeight, this.view.dataG, availableWidth)
        }

      }) // end loop group.items.forEach(GanttItem)
    })
  }

  calculateTotalChartHeight() {
    return this.groups.reduce((acc, g) => {
      const header = this.viewConfig.enableGrouping ? this.viewConfig.groupHeaderHeight : 0
      const content = (g.lanes ?? 1) * this.viewConfig.eventRowHeight
      return acc + header + content
    }, 0)
  }

  drawAxes(width: number) {
    this.view.axisG.innerHTML = ''
    this.view.gridG.innerHTML = ''
    const renderWidth = this.getRenderWidth(width)

    const itemsAreaHeight = this.viewConfig.totalHeight - (this.viewConfig.activeAxesList.length * this.viewConfig.calendarAxisRowHeight) - this.viewConfig.margin.bottom
    const totalDaysSpan = (this.viewConfig.maxDays - this.viewConfig.minDays) / this.viewConfig.zoomFactor

    this.viewConfig.stepDays = Math.max(1, Math.floor(totalDaysSpan / (renderWidth / 120)))

    const startDaysValue = Math.floor(this.viewConfig.minDays / this.viewConfig.stepDays) * this.viewConfig.stepDays - this.viewConfig.stepDays
    const endDaysValue = Math.ceil(this.viewConfig.maxDays / this.viewConfig.stepDays) * this.viewConfig.stepDays + this.viewConfig.stepDays

    this.viewConfig.activeAxesList.forEach((calType, index) => {
      const currentAxisYStart = itemsAreaHeight + (index * this.viewConfig.calendarAxisRowHeight)
      const tickPixelSpacing = (this.viewConfig.stepDays / (this.viewConfig.maxDays - this.viewConfig.minDays)) * renderWidth * this.viewConfig.zoomFactor
      const showMoonPhases: boolean = this.plugin.settings.uxShowMoons && tickPixelSpacing >= 24

      this.svgDrawerData.drawnCals[calType] = {
        y1: currentAxisYStart,
        y2: currentAxisYStart + this.viewConfig.calendarAxisRowHeight - 1
      }

      const individualAxisG = Util.createSvg('g')
      individualAxisG.setAttribute('transform', `translate(0, ${currentAxisYStart})`)

      /* Layer 1: Ticks, baseline, and dates (rendered underneath) */
      const ticksG = Util.createSvg('g')
      individualAxisG.appendChild(ticksG)

      let lastTextX = -999
      const calendarConfig: CalendarConfig | undefined = this.plugin.calendarConfigsCache.get(calType) ?? undefined
      const calBadgeTextContent = calendarConfig?.displayName ?? calendarConfig?.name ?? calType
      const axisColor = (this.plugin.settings.uxUseCalColorForCalAxis ? this.svgDrawerData.mappedCalConfigs[calType]?.color : null) ?? 'currentColor'

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

      const baseline = Util.createSvg('line', Css.axis.baseline, {
        x1: startX, y1: 0, x2: endX, y2: 0, 'stroke-width': 2.5, stroke: axisColor
      })
      ticksG.appendChild(baseline)

      // Draw start cap marker (if in visible range)
      if (calendarConfig?.startDay && calendarConfig.startDay as number >= startDaysValue) {
        const startCap = Util.createSvg('line', 'calendar-cap-marker', {
          x1: startX, y1: -6, x2: startX, y2: 6, 'stroke-width': 2, stroke: axisColor
        })
        ticksG.appendChild(startCap)
      }

      // Draw end cap marker (if in visible range)
      if (calendarConfig?.endDay !== undefined && calendarConfig.endDay as number <= endDaysValue) {
        const endCap = Util.createSvg('line', 'calendar-cap-marker', {
          x1: endX, y1: -6, x2: endX, y2: 6, 'stroke-width': 2, stroke: axisColor
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

      for (let currDays = effectiveStartDay; currDays <= effectiveEndDay; currDays += this.viewConfig.stepDays) {
        const xPos = this.getXPosition(currDays, width)
        if (xPos < 0 || xPos > renderWidth) continue

        /* Draw vertical gridlines into dedicated grid container */
        if (index === 0) {
          const gridLine = Util.createSvg('line', Css.axis.gridline, {
            x1: xPos, y1: 0, x2: xPos, y2: itemsAreaHeight
          })
          this.view.gridG.appendChild(gridLine)
        }

        const tick = Util.createSvg('line', Css.axis.tick, {x1: xPos, y1: 0, x2: xPos, y2: 5})
        ticksG.appendChild(tick)

        if (xPos - lastTextX > 80) {
          const text = Util.createSvg('text', Css.axis.text, {x: xPos, y: 20})
          text.textContent = createAxisDateDescription(currDays, calendarConfig)

          ticksG.appendChild(text)
          lastTextX = xPos
        }

      }

      if (showMoonPhases) {
        drawMoons(this, ticksG, width, calendarConfig, startDaysValue, endDaysValue,
          effectiveStartDay, effectiveEndDay, renderWidth)
      }

      if (calBadgeTextContent) {
        /* Layer 2: Badge and label (rendered on top so ticks scroll beneath them) */
        const headerG = Util.createSvg('g')
        individualAxisG.appendChild(headerG)

        const badge = Util.createSvg('rect', Css.axis.labelBadge, {x: 8, y: 7})
        const label = Util.createSvg('text', Css.axis.label, {x: 14, y: 19})
        headerG.appendChild(badge)
        headerG.appendChild(label)

        /* Calculate width accurately off-screen with explicit uppercase padding */
        label.textContent = calBadgeTextContent.toUpperCase()
        const badgeWidth = this.textCache.getWidth(calBadgeTextContent)
        // TODO choose algorithm
        // const badgeWidth = this.textCache.getSvgWidth(label, calBadgeTextContent)
        badge.setAttribute('width', badgeWidth.toFixed(1))
      }

      this.view.axisG.appendChild(individualAxisG)
    })
  }

  resetZoom() {
    if (this.eventManager?.isDragging) return
    this.viewConfig.resetPanAndZoom()
    this.handleViewReset()
  }

  zoomOut(factor = 1.25) {
    if (this.eventManager?.isDragging) return
    if (this.plugin.settings.autoRestrictZoom && this.viewConfig.zoomFactor < 0.5) return

    const width = this.container.clientWidth
    if (!width || width <= 0) return
    const renderWidth = this.getRenderWidth(width)
    const centerX = renderWidth / 2

    const oldScale = this.viewConfig.zoomFactor
    let newScale = oldScale / factor
    if (this.plugin.settings.autoRestrictZoom && newScale < 0.5) newScale = 0.5

    /* Focal point zoom: adjust translateX so center point stays pinned */
    this.viewConfig.setPanAndZoom(centerX - (centerX - this.viewConfig.panTranslateX) * (newScale / oldScale), newScale)
    this.handlePanOrZoom()
  }

  zoomIn(factor = 1.25) {
    if (this.eventManager?.isDragging) return

    const width = this.container.clientWidth
    if (!width || width <= 0) return
    const renderWidth = this.getRenderWidth(width)

    /* Restrict zoom-in if 1 day takes up more than 25% of screen width or stepDays is already at minimum */
    const daysSpan = (this.viewConfig.maxDays - this.viewConfig.minDays) / this.viewConfig.zoomFactor
    if (this.plugin.settings.autoRestrictZoom && daysSpan <= 4) return

    const centerX = renderWidth / 2
    const oldScale = this.viewConfig.zoomFactor
    const newScale = oldScale * factor

    /* Focal point zoom: adjust translateX so center point stays pinned */
    this.viewConfig.setPanAndZoom(centerX - (centerX - this.viewConfig.panTranslateX) * (newScale / oldScale), newScale)
    this.handlePanOrZoom()
  }

  /** Shift view left by moving translateX positive */
  panLeft(percentage = 0.25) {
    if (this.eventManager?.isDragging) return

    const renderWidth = this.getRenderWidth()

    this.viewConfig.panTranslateX += renderWidth * percentage
    this.handlePanOrZoom()
  }

  /** Shift view right by moving translateX negative */
  panRight(percentage = 0.25) {
    if (this.eventManager?.isDragging) return

    const renderWidth = this.getRenderWidth()

    this.viewConfig.panTranslateX -= renderWidth * percentage
    this.handlePanOrZoom()
  }

  updateViewAfterToggle() {
    this.initLayout()
    this.initChartStructure()
    this.handleResize(false)
  }

  public destroy() {
    this.resizeObserver.disconnect()
    this.eventManager?.destroy()
  }

  private transitionToPredefinedBounds(width: number): void {

    const lower = this.codeBlockContent.lowerBoundDateParsed?.days
    const upper = this.codeBlockContent.upperBoundDateParsed?.days
    const center = this.codeBlockContent.centerHereDateParsed?.days

    const totalRange = this.viewConfig.maxDays - this.viewConfig.minDays
    if (totalRange <= 0) {
      this.viewConfig.resetPanAndZoom()
      return
    }

    const renderWidth = this.getRenderWidth(width)

    // Case A: Predefined min and/or max bounds supplied
    if (lower !== undefined || upper !== undefined) {
      const targetMin = lower ?? this.viewConfig.minDays
      const targetMax = upper ?? this.viewConfig.maxDays
      const targetRange = targetMax - targetMin

      if (targetRange > 0) {
        this.viewConfig.zoomFactor = totalRange / targetRange
        // Pixel position of targetMin at scale 1:
        const minXAtScale1 = ((targetMin - this.viewConfig.minDays) / totalRange) * renderWidth
        // Shift targetMin to pixel X = 0 under the new zoomScale:
        this.viewConfig.panTranslateX = -(minXAtScale1 * this.viewConfig.zoomFactor)
        return
      }
    }

    // Case B: Single center point specified
    if (center !== undefined) {
      const currentScale = this.viewConfig.zoomFactor > 0 ? this.viewConfig.zoomFactor : 1
      this.viewConfig.zoomFactor = currentScale

      const centerXAtScale1 = ((center - this.viewConfig.minDays) / totalRange) * renderWidth
      const centerXZoomed = centerXAtScale1 * currentScale

      // Center the target day in the middle of renderWidth:
      this.viewConfig.panTranslateX = (renderWidth / 2) - centerXZoomed
      return
    }

    // Default: Full view reset
    this.viewConfig.resetPanAndZoom()
  }

  private calculateStacking(items: GanttItem[]) {

    const eras = items.filter(i => i.displayType === 'era')
    const nonEras = items.filter(i => i.displayType !== 'era').sort((a, b) => a.startDays - b.startDays)

    // const sorted = [...items].sort((a, b) => a.startDays - b.startDays)

    const lanes: GanttItem[][] = []
    nonEras.forEach(item => {
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
    const processedData = [...eras, ...nonEras]

    return {processedData, totalLanes: lanes.length}
  }

  getXPosition(days: number, width?: number): number {
    if (this.viewConfig.maxDays <= this.viewConfig.minDays) return this.viewConfig.panTranslateX // fail-safe

    const renderWidth = this.getRenderWidth(width)
    const percentage = (days - this.viewConfig.minDays) / (this.viewConfig.maxDays - this.viewConfig.minDays)
    return (percentage * renderWidth * this.viewConfig.zoomFactor) + this.viewConfig.panTranslateX
  }

  // findSvgElementsById<T extends SVGElement = SVGElement>(id: number): T[] {
  //   const selector = `[data-id="${id}"]`
  //   return Array.from(this.dataG.querySelectorAll<T>(selector))
  // }

  findSvgElementById<T extends SVGElement = SVGElement>(id: number): T | null {
    const selector = `[data-id="${id}"]`
    return this.view.dataG.querySelector<T>(selector)
  }

  getRenderWidth(width?: number) {
    const containerWidth = width ?? this.container.clientWidth
    return Math.max(1, containerWidth - this.viewConfig.margin.left - this.viewConfig.margin.right)
  }

  filterActiveEventData(): GanttItem[] {
    const {mappedGrpConfigs, mappedCalConfigs} = this.svgDrawerData

    return this.rawData.filter(d => {
      const grp = mappedGrpConfigs[d.group]
      const cal = mappedCalConfigs[d.calendarType]

      /* Undefined groups or calendars are accepted! */
      if (grp?.visible === false || cal?.visible === false) return false

      if (GanttItemDisplayTypes.isTimespan(d.displayType)) switch (d.displayType) {
        case "bar":
          return this.viewConfig.showBars
        case "era":
          return this.viewConfig.showEras
      } else if (GanttItemDisplayTypes.isTimestamp(d.displayType)) {
        return this.viewConfig.showPoints
      } else {
        return false
      }
    })
  }

}
