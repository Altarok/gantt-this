import FantasyGanttPlugin from '../main'
import {
  CalendarConfig,
  GanttGroup,
  GanttItem,
  GanttItemDisplayType,
  isTimespan,
  isTimestamp,
  NO_GROUP
} from '../const/types'
import {createGanttEventManager, GanttEventManager} from '../ctrl/event-manager'
import {Priorities} from '../util/priority-util'
import {createAxisDateDescription} from '../date-calculations/dates'
import {SvgDrawerUtil} from './svg-drawer-util'
import {drawMoons} from './moon-drawer'
import TextWidthCache from './text-space-cache'
import {expandRecurringEvents} from '../util/recurring-events'
import {GanttChartModel} from '../model/gantt-chart-model'
import {GanttChartView} from '../views/gantt-chart-view'
import BasesContext from '../model/bases-context'
import {SettingsContext} from '../model/settings-context'

export class GanttRenderEngine {
  private eventManager?: GanttEventManager
  private groups: GanttGroup[] = []
  private resizeObserver: ResizeObserver

  view: GanttChartView
  drawnData: GanttItem[] = []

  constructor(view: GanttChartView,
              public rawData: GanttItem[],
              public readonly plugin: FantasyGanttPlugin,
              private readonly settingsContext: SettingsContext,
              private readonly basesCtx: BasesContext | null,
              private readonly textCache: TextWidthCache,
              readonly viewModel: GanttChartModel,
              private readonly svgDrawerUtil: SvgDrawerUtil) {
    this.view = view

    this.updateSvgDrawerData()
    this.calculateGlobalBounds()
    this.initLayout()
    this.view = this.redraw()
    this.initEventListener()
    this.handleResize(true)

    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(this.view.chartContainer)
  }

  public updateData(newData: GanttItem[]) {
    this.viewModel.setRawContainerWidth(this.view.clientWidth)
    this.updateSvgDrawerData()
    this.rawData = newData
    this.calculateGlobalBounds()
    this.initLayout()
    this.view = this.redraw()
    this.initEventListener()
    this.handleResize(true)
  }

  redraw() {
    // if (this.view) this.view.destroy()
    const container = this.view.container
    // this.view.destroy()
    return new GanttChartView(this.plugin, container, this.viewModel, this.textCache)
  }

  private updateSvgDrawerData() {
    this.viewModel.updateSvgDrawerData(this.plugin.settings)
  }

  private calculateGlobalBounds() {
    if (this.rawData.length === 0) {
      const defaultCalendarConfig = this.plugin.calendarConfigsCache.get(this.plugin.settings.defaultCalendar)
      const todayDays = defaultCalendarConfig?.today ?? 0
      this.viewModel.setDayRange(todayDays - 15, todayDays + 15)
      return
    }

    const startValues = this.rawData.map(d => d.startDays)
    const endValues = this.rawData.map(d => Math.max(d.startDays, d.endDays))

    const lowerBound = Math.min(...startValues)
    const upperBound = Math.max(...endValues)
    const diff = upperBound - lowerBound

    const paddingDays = diff > 150 ? Math.floor(diff / 10) : 15

    this.viewModel.setDayRange(lowerBound - paddingDays, upperBound + paddingDays)
  }

  initLayout() {
    let activeItems: GanttItem[] = this.filterActiveEventData()

    this.viewModel.activeCalendars = Array.from(new Set(activeItems.map(d => d.calendarType)))

    Priorities.sortCalendarAxisByPriority(this.viewModel.activeCalendars, this.viewModel.mappedCalConfigs)

    const groupNames: string[] = Array.from(new Set(activeItems.map(d => d.group || this.plugin.settings.defaultGroup)))
    Priorities.sortGroupAxisByPriority(groupNames, this.viewModel.mappedGrpConfigs)

    this.drawnData = expandRecurringEvents(this, activeItems, this.currRenderWidth)

    this.groups = []
    let currentYOffset = this.viewModel.margin.top

    if (this.viewModel.enableGrouping) {
      const groupedMap = new Map<string, GanttItem[]>()
      for (const name of groupNames) { /* groupNames is sorted! */
        groupedMap.set(name, [])
      }
      this.drawnData.forEach(item => {
        const gName = item.group || this.plugin.settings.defaultGroup
        if (!groupedMap.has(gName)) groupedMap.set(gName, [])
        groupedMap.get(gName)?.push(item)
      })

      groupedMap.forEach((items, groupName) => {
        const {processedData, totalLanes} = this.calculateStacking(items)
        const groupContentLanes = totalLanes > 0 ? totalLanes : 0
        const groupHeight = groupContentLanes * this.viewModel.eventRowHeight + this.viewModel.getGroupHeaderHeight
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
      const {processedData, totalLanes} = this.calculateStacking(this.drawnData)
      const groupContentLanes = totalLanes > 0 ? totalLanes : 0
      const groupHeight = groupContentLanes * this.viewModel.eventRowHeight
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
    Priorities.fixGanttGroupPrioritySetupIfBroken(this.groups, this.viewModel.mappedGrpConfigs)

    this.viewModel.calculateTotalHeight(currentYOffset)
  }

  initEventListener(): void {
    // debugger
    if (this.eventManager) this.eventManager.destroy()
    this.eventManager = createGanttEventManager(this, this.plugin.settings, this.svgDrawerUtil, this.basesCtx)
    this.svgDrawerUtil.setEventManager(this.eventManager)
  }

  handlePanOrZoom() {
    this.initLayout() /* -> Re-calculate repeating events */
    this.handleResize(false)
  }

  handleViewReset() {
    this.handleResize(true)
  }

  handleResize(fullReset = false) {

    this.viewModel.setRawContainerWidth(this.view.clientWidth)

    const currRenderWidth = this.viewModel.getCurrRenderWidth()
    const lastRenderWidth = this.viewModel.getLastRenderWidth()

    if (currRenderWidth <= 0) return

    if (!fullReset && lastRenderWidth > 0 && lastRenderWidth !== currRenderWidth) {
      // 1. Berechne, welches absolute 'days' aktuell in der Mitte des Sichtfeldes liegt
      const totalDaysSpan = this.viewModel.totalDaysSpan
      const oldCenterPixel = lastRenderWidth / 2

      // Invertierte Formel von getXPosition, um 'centerDay' zu bestimmen:
      // centerPixel = percentage * oldRenderWidth * zoomFactor + panTranslateX
      const centerPercentage = (oldCenterPixel - this.viewModel.panTranslateX) / (lastRenderWidth * this.viewModel.zoomFactor)
      const centerDays = this.viewModel.minDays + (centerPercentage * totalDaysSpan)

      // 2. Setze lastWidth neu
      this.viewModel.cacheCurrentRenderWidth()

      // 3. Berechne das neue panTranslateX so, dass centerDays exakt in newRenderWidth / 2 liegt
      const newCenterPercentage = (centerDays - this.viewModel.minDays) / totalDaysSpan
      this.viewModel.panTranslateX = (currRenderWidth / 2) - (newCenterPercentage * currRenderWidth * this.viewModel.zoomFactor)
    } else {
      this.viewModel.cacheCurrentRenderWidth()
    }

    if (fullReset && this.settingsContext.hasDateBounds) {
      /* Re-evaluate predefined bounds now that we have the true container width */
      this.transitionToPredefinedBounds()
    }

    this.view.setWidth(currRenderWidth)

    this.drawGroupBackgrounds()
    // try {// Code that might crash
    this.renderData()
    this.drawAxes(fullReset)
    // } catch (error) {
    // TODO #errorCache keep code
    // if (error instanceof Error) {
    //   console.error("Error drawing axes:", error.message)
    //   console.error(error.stack)
    // } else {
    //   console.error("An unexpected error occurred:", error)
    // }
    // }
  }


  private drawGroupBackgrounds() {
    this.view.clearGroupBackground()

    if (!this.viewModel.enableGrouping) return

    this.groups.forEach((g, i) => {
      const isEvenGroup = i % 2 === 0
      this.view.drawGroupBackground(g.name, g.yOffset, g.height, isEvenGroup)
    })
  }

  private mapLaneItems(group: GanttGroup): Map<number, GanttItem[]> {
    const laneItemsMap = new Map<number, GanttItem[]>()
    group.items.forEach(item => {
      const lane = item.lane ?? 0
      if (!laneItemsMap.has(lane)) laneItemsMap.set(lane, [])
      laneItemsMap.get(lane)?.push(item)
    })
    laneItemsMap.forEach(items => {
      items.sort((a, b) => this.getXPosition(a.startDays) - this.getXPosition(b.startDays))
    })
    return laneItemsMap
  }

  renderData() {
    this.view.clearEventLayer()

    const halfRowHeight = this.viewModel.eventRowHeightHalf
    const firstYValue = this.viewModel.margin.top
    const totalChartHeight = this.calculateTotalChartHeight()

    const headerHeight = this.viewModel.getGroupHeaderHeight

    // console.log('renderData > width', width)

    this.groups.forEach(group => {
      const groupContentHeight = (group.lanes ?? 1) * this.viewModel.eventRowHeight
      const totalGroupHeight = headerHeight + groupContentHeight
      const groupYStart = group.yOffset + headerHeight

      const laneItemsMap: Map<number, GanttItem[]> = this.mapLaneItems(group)

      group.items.forEach((d: GanttItem) => {
        const lane = d.lane
        const laneY = groupYStart + (lane ?? 0) * this.viewModel.eventRowHeight
        const displayType: GanttItemDisplayType = d.displayType

        const x1 = this.getXPosition(d.startDays)
        const x2 = (d.endDays <= d.startDays) ? x1 : this.getXPosition(d.endDays)
        // const renderWidth = this.getRenderWidth(width)

        // Calculate available width for timestamp text (Method 1)
        const currentLaneItems = laneItemsMap.get(d.lane ?? 0) ?? []
        const currentIndex = currentLaneItems.indexOf(d)
        const nextItem = currentIndex !== -1 ? currentLaneItems[currentIndex + 1] : undefined

        const nextX = nextItem ? this.getXPosition(nextItem.startDays) : this.currRenderWidth
        const availableWidth = Math.max(0, nextX - x1 - 10) // 10px padding buffer
        const svgLayer = d.isRecurringInstance ? this.view.repeaterEventLayer : this.view.eventLayer

        if (isTimespan(displayType)) switch (displayType) {
          case 'bar':
            return this.svgDrawerUtil.drawBar(d, x1, x2, laneY + halfRowHeight, svgLayer)
          case 'era': {
            const isNotInAGroup = d.group === NO_GROUP
            const y: number = isNotInAGroup ? firstYValue : group.yOffset
            const height: number = isNotInAGroup ? totalChartHeight : totalGroupHeight
            return this.svgDrawerUtil.drawEra(d, x1, x2, y, height, this.view.eraLayer)
          }

        } else if (isTimestamp(displayType)) switch (displayType) {
          case 'point':
            return this.svgDrawerUtil.drawPoint(d, x1, laneY + halfRowHeight, svgLayer, availableWidth)
          case 'box':
            return this.svgDrawerUtil.drawBox(d, x1, laneY + halfRowHeight, svgLayer, availableWidth)
          case 'vertical-line': {
            const isNotInAGroup = d.group === NO_GROUP
            const y: number = isNotInAGroup ? firstYValue : group.yOffset
            const height: number = isNotInAGroup ? totalChartHeight : totalGroupHeight
            return this.svgDrawerUtil.drawVerticalLine(d, x1, y, y + height, this.plugin.settings.uxVerticalLineEventWidth, this.view.eraLayer)
          }
          case 'diamond':
            return this.svgDrawerUtil.drawDiamond(d, x1, laneY + halfRowHeight, svgLayer, availableWidth)
          case 'triangle':
            return this.svgDrawerUtil.drawTriangle(d, x1, laneY + halfRowHeight, svgLayer, availableWidth)
          case 'pentagon':
            return this.svgDrawerUtil.drawPentagon(d, x1, laneY + halfRowHeight, svgLayer, availableWidth)
          case 'star':
            return this.svgDrawerUtil.drawStar(d, x1, laneY + halfRowHeight, svgLayer, availableWidth)
          case 'hexagon':
            return this.svgDrawerUtil.drawHexagon(d, x1, laneY + halfRowHeight, svgLayer, availableWidth)
          case 'octagon':
            return this.svgDrawerUtil.drawOctagon(d, x1, laneY + halfRowHeight, svgLayer, availableWidth)
        }

      }) // end loop group.items.forEach(GanttItem)
    })
  }

  calculateTotalChartHeight() {
    return this.groups.reduce((acc, g) => {
      const content = (g.lanes ?? 1) * this.viewModel.eventRowHeight
      return acc + this.viewModel.getGroupHeaderHeight + content
    }, 0)
  }

  private drawAxes(completeReset = false) {
    this.view.clearCalendarLayer(completeReset)
    // const renderWidth = this.getRenderWidth()

    const itemsAreaHeight = this.viewModel.eventsAreaHeight

    this.viewModel.stepDays = this.tickStepInDays

    const startDaysValue = Math.floor(this.viewModel.minDays / this.viewModel.stepDays) * this.viewModel.stepDays - this.viewModel.stepDays
    const endDaysValue = Math.ceil(this.viewModel.maxDays / this.viewModel.stepDays) * this.viewModel.stepDays + this.viewModel.stepDays

    this.viewModel.activeCalendars.forEach((calType, index) => {

      const currentAxisYStart = itemsAreaHeight + (index * this.viewModel.calendarAxisRowHeight)
      const tickPixelSpacing = (this.viewModel.stepDays / (this.viewModel.totalDaysSpan)) * this.currRenderWidth * this.viewModel.zoomFactor
      const showMoonPhases: boolean = this.plugin.settings.uxShowMoons && tickPixelSpacing >= 24

      this.viewModel.drawnCals[calType] = {
        y1: currentAxisYStart,
        y2: currentAxisYStart + this.viewModel.calendarAxisRowHeight - 1
      }

      /* Layer 1: Ticks, baseline, and dates (rendered underneath) */
      const ticksG = this.view.createCalAxisGroup(currentAxisYStart)

      let lastTextX = -999
      const calendarConfig: CalendarConfig | undefined = this.plugin.calendarConfigsCache.get(calType)
      if (!calendarConfig) return // continue to next axis

      const calBadgeTextContent = calendarConfig.displayName ?? calendarConfig.name ?? calType
      const axisColor = (this.plugin.settings.uxUseCalColorForCalAxis ? this.viewModel.mappedCalConfigs[calType]?.color : null) ?? 'currentColor'

      const calStart = calendarConfig.startDay as number ?? -Infinity
      const calEnd = calendarConfig.endDay as number ?? Infinity

      // Skip rendering, if current view is completely outside of calendar's lifetime
      if (endDaysValue < calStart || startDaysValue > calEnd) return

      // Clamp rendering bounds to calendar lifetime
      const absoluteStartDay = Math.max(startDaysValue, calStart)
      const absoluteEndDay = Math.min(endDaysValue, calEnd)

      const pixelsPerDay = (this.currRenderWidth / (this.viewModel.totalDaysSpan)) * this.viewModel.zoomFactor
      const visibleMinDays = this.viewModel.minDays + (-this.viewModel.panTranslateX / pixelsPerDay)
      const visibleMaxDays = visibleMinDays + (this.currRenderWidth / pixelsPerDay)

      const effectiveStartDay = Math.max(startDaysValue, calStart, visibleMinDays - 1)
      const effectiveEndDay = Math.min(endDaysValue, calEnd, visibleMaxDays + 1)

      const startX = effectiveStartDay <= visibleMinDays ? 0 : this.getXPosition(effectiveStartDay)
      const endX = effectiveEndDay >= visibleMaxDays ? this.currRenderWidth : this.getXPosition(effectiveEndDay)

      this.view.drawCalAxisBaseline(ticksG, startX, endX, axisColor)

      /* Draw start cap marker (if in visible range) */
      if (calendarConfig.startDay && calendarConfig.startDay as number >= startDaysValue) {
        this.view.drawCalAxisCap(ticksG, startX, axisColor)
      }

      /* Draw end cap marker (if in visible range) */
      if (calendarConfig.endDay !== undefined && calendarConfig.endDay as number <= endDaysValue) {
        this.view.drawCalAxisCap(ticksG, endX, axisColor)
      }

      // if (!calBadgeTextContent && calendarConfig?.name) {
      //   const labelX = (startX + endX) / 2
      //   const title = Util.createSVGElement('text', 'calendar-reign-title', {
      //     x: labelX, y: -10, 'text-anchor': 'middle', fill: 'currentColor'
      //   })
      //   title.textContent = calendarConfig.name
      //   ticksG.appendChild(title)
      // }

      for (let currDays = absoluteStartDay; currDays <= absoluteEndDay; currDays += this.viewModel.stepDays) {
        if (currDays < effectiveStartDay - 1) continue
        if (currDays > effectiveEndDay + 1) break
        const xPos = this.getXPosition(currDays)
        if (xPos < 0 || xPos > this.currRenderWidth) continue

        if (index === 0 /* -> first calendar */) {
          this.view.drawVerticalGridlineBehindEvents(xPos, itemsAreaHeight)
        }

        this.view.drawCalAxisTick(ticksG, xPos)

        if (xPos - lastTextX > 80) {
          this.view.drawCalAxisDate(ticksG, xPos, createAxisDateDescription(currDays, calendarConfig, false, this.viewModel.hideDays, this.viewModel.hideMonths))
          lastTextX = xPos
        }
      }

      if (showMoonPhases && calendarConfig.moons) {
        // TODO remove double param!!
        drawMoons(this, ticksG, calendarConfig, startDaysValue, endDaysValue,
          effectiveStartDay, effectiveEndDay, this.currRenderWidth)
      }

      if (completeReset && calBadgeTextContent) {
        this.view.drawCalendarBadge(calBadgeTextContent.toUpperCase(), calendarConfig.link, currentAxisYStart)
      }
    })
  }

  resetZoom() {
    if (this.eventManager?.isDragging) return
    this.viewModel.resetPanAndZoom()
    this.handleViewReset()
  }

  /**
   * @param factor value >1 zooms in, value <1 zooms out
   * @param focusX optional x value to zoom on
   */
  zoom(factor: number, focusX?: number) {
    // console.log('zoom >', factor, focusX)
    if (Math.abs(1 - factor) < 0.01) return // ignore micro-pinch zooms

    const renderWidth = this.currRenderWidth
    if (this.eventManager?.isDragging || renderWidth <= 1) return
    if (this.plugin.settings.autoRestrictZoom) {
      if (factor < 1 && this.viewModel.zoomFactor < 0.5) /* No zoom-out when already min */
        return
      else if (factor > 1) { /* No zoom-in when already max */
        const daysSpan = (this.viewModel.totalDaysSpan) / this.viewModel.zoomFactor
        if (daysSpan <= 4) return
      }
    }

    const centerX = focusX ?? renderWidth / 2

    const oldScale = this.viewModel.zoomFactor
    let newScale = oldScale * factor
    if (this.plugin.settings.autoRestrictZoom) {
      if (newScale < 0.5) newScale = 0.5  /* Prevent further zoom-out when already min */
    }

    this.updateWhichDateElementsToHide()

    /* Focal point zoom: adjust translateX so center point stays pinned */
    this.viewModel.setPanAndZoom(centerX - (centerX - this.viewModel.panTranslateX) * (newScale / oldScale), newScale)
    this.handlePanOrZoom()
  }

  private updateWhichDateElementsToHide() {
    const updatedTickStepInDays = this.tickStepInDays
    this.viewModel.updateWhichDateElementsToHide(updatedTickStepInDays)
  }

  /**
   * Shift view left or right.
   * @param percentage - positive number shifts view right, negative number shifts view left
   */
  panRelative(percentage: number) {
    // console.log('panRelative > percentage', percentage)
    if (this.eventManager?.isDragging) return /* Triggered by buttons */
    this.viewModel.panTranslateX += this.currRenderWidth * percentage
    this.handlePanOrZoom()
  }

  panDiff(shift: number) {
    // console.log('panDiff > shift', shift)
    this.viewModel.panTranslateX += shift
    this.handlePanOrZoom()
  }

  panAbsolute(value: number) {
    // console.log('panAbsolute > value', value)
    this.viewModel.panTranslateX = value
    this.handlePanOrZoom()
  }

  updateViewAfterToggle() {
    this.initLayout()
    this.view = this.redraw()
    this.initEventListener()
    this.handleResize(false)
  }

  public destroy() {
    this.resizeObserver.disconnect()
    this.eventManager?.destroy()
  }

  private transitionToPredefinedBounds(): void {

    const lower = this.settingsContext.lowerBoundDateParsed?.days
    const upper = this.settingsContext.upperBoundDateParsed?.days
    const center = this.settingsContext.centerHereDateParsed?.days

    const totalRange = this.viewModel.totalDaysSpan
    if (totalRange <= 0) {
      // console.log('transitionToPredefinedBounds > resetPanAndZoom')
      this.viewModel.resetPanAndZoom()
      return
    }

    const renderWidth = this.currRenderWidth

    // Case A: Predefined min and/or max bounds supplied
    if (lower !== undefined || upper !== undefined) {
      const targetMin = lower ?? this.viewModel.minDays
      const targetMax = upper ?? this.viewModel.maxDays
      const targetRange = targetMax - targetMin

      if (targetRange > 0) {
        this.viewModel.zoomFactor = totalRange / targetRange
        // Pixel position of targetMin at scale 1:
        const minXAtScale1 = ((targetMin - this.viewModel.minDays) / totalRange) * renderWidth
        // Shift targetMin to pixel X = 0 under the new zoomScale:
        this.viewModel.panTranslateX = -(minXAtScale1 * this.viewModel.zoomFactor)
        // console.log('transitionToPredefinedBounds > panTranslateX', this.viewModel.panTranslateX)
        return
      }
    }

    // Case B: Single center point specified
    if (center !== undefined) {
      const currentScale = this.viewModel.zoomFactor > 0 ? this.viewModel.zoomFactor : 1
      this.viewModel.zoomFactor = currentScale

      const centerXAtScale1 = ((center - this.viewModel.minDays) / totalRange) * renderWidth
      const centerXZoomed = centerXAtScale1 * currentScale

      // Center the target day in the middle of renderWidth:
      this.viewModel.panTranslateX = (renderWidth / 2) - centerXZoomed
      return
    }

    // Default: Full view reset
    this.viewModel.resetPanAndZoom()
  }

  private calculateStacking(items: GanttItem[]): { processedData: GanttItem[], totalLanes: number } {

    const eras = items.filter(i => i.displayType === 'era')
    const nonEras = items.filter(i => i.displayType !== 'era' && !i.isRecurringInstance).sort((a, b) => a.startDays - b.startDays)

    const itemLaneMap = new Map<string, number>()
    const lanes: GanttItem[][] = []

    nonEras.forEach(item => {
      let placed = false
      for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i]
        if (!lane) continue

        const lastItem = lane[lane.length - 1]

        if (lastItem && lastItem.endDays < item.startDays - 1) {
          lane.push(item)
          item.lane = i
          itemLaneMap.set(item.id, i)
          placed = true
          break
        }
      }
      if (!placed) {
        lanes.push([item])
        const newLaneIndex = lanes.length - 1
        item.lane = newLaneIndex
        itemLaneMap.set(item.id, newLaneIndex)
      }
    })

    const repeaters = items.filter(i => i.displayType !== 'era' && i.isRecurringInstance === true)

    repeaters.forEach(item => {
      item.lane = item.parentEventId !== undefined ? itemLaneMap.get(item.parentEventId) : 0
    })

    const processedData = [...eras, ...nonEras, ...repeaters]
    return {processedData, totalLanes: lanes.length}
  }

  getXPosition(days: number): number {
    // console.log('getXPosition', {
    //   containerClientWidth: this.container.clientWidth,
    //   renderWidth: this.getRenderWidth(width),
    //   panTranslateX: this.viewModel.panTranslateX
    //   // sampleX: this.getXPosition(this.viewModel.minDays, width)
    // })

    if (this.viewModel.maxDays <= this.viewModel.minDays) {
      // console.log('WTF')
      // debugger
      return this.viewModel.panTranslateX
    } // fail-safe

    const renderWidth = this.currRenderWidth
    const percentage = (days - this.viewModel.minDays) / (this.viewModel.totalDaysSpan)
    return (percentage * renderWidth * this.viewModel.zoomFactor) + this.viewModel.panTranslateX
  }

  // findSvgElementsById<T extends SVGElement = SVGElement>(id: number): T[] {
  // const selector = `[data-id="${id}"]`
  // return Array.from(this.eventLayer.querySelectorAll<T>(selector))
  // }

  findSvgElementById<T extends SVGElement = SVGElement>(id: string): T | null {
    const selector = `[data-id="${id}"]`
    return this.view.eventLayer.querySelector<T>(selector)
  }

  filterActiveEventData(): GanttItem[] {
    const {mappedGrpConfigs, mappedCalConfigs} = this.viewModel

    return this.rawData.filter(d => {
      const grp = mappedGrpConfigs[d.group]
      const cal = mappedCalConfigs[d.calendarType]

      /* Undefined groups or calendars are accepted! */
      if (grp?.visible === false || cal?.visible === false) return false

      if (isTimespan(d.displayType)) switch (d.displayType) {
        case "bar":
          return this.viewModel.showBars
        case "era":
          return this.viewModel.showEras
      } else if (isTimestamp(d.displayType)) return this.viewModel.showPoints
      else return false
    })
  }

  private get tickStepInDays(): number {
    return Math.max(1, Math.floor(this.viewModel.totalDaysSpanRelativeToZoom / (this.currRenderWidth / 120)))
  }

  private get currRenderWidth() {
    return this.viewModel.getCurrRenderWidth()
  }

}
