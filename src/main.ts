import {MarkdownPostProcessorContext, MarkdownRenderChild, Plugin, parseYaml, TFile, Notice} from 'obsidian'
import { FantasyGanttSettings, DEFAULT_SETTINGS, FantasyGanttSettingTab } from './settings'

// Interface for resolved custom definitions
interface CalendarUnit {
  name: string
  days: number
}

interface CalendarConfig {
  id: string
  name: string
  epoch_gregorian: string
  type: 'positional' | 'gregorian'
  delimiter: string
  units: CalendarUnit[]
}

interface GanttItem {
  id: number
  name: string
  startDateDisplay: string // Storing human-readable string for display
  endDateDisplay: string
  startDays: number        // Quantized timeline tracking unit: Days from a standard zero point
  endDays: number
  group: string
  type: 'bar' | 'point'
  calendarType: string
  color?: string
  link?: string
  lane?: number
}

interface GanttGroup {
  name: string
  items: GanttItem[]
  yOffset: number
  height: number
  lanes: number
}

class GanttTooltipComponent extends MarkdownRenderChild {
  constructor(containerEl: HTMLElement, private tooltipEl: HTMLElement) {
    super(containerEl)
  }

  onunload() {
    if (this.tooltipEl) {
      this.tooltipEl.remove()
    }
  }
}

export default class FantasyGanttPlugin extends Plugin {
  settings: FantasyGanttSettings = DEFAULT_SETTINGS
  private calendarConfigsCache: Map<string, CalendarConfig> = new Map()

  async onload() {
    await this.loadSettings()
    this.addSettingTab(new FantasyGanttSettingTab(this.app, this))

    this.registerMarkdownCodeBlockProcessor('fantasy-gantt', async (source, el, ctx) => {
      await this.registerCalendar(el, source, ctx)
    })
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
    this.app.metadataCache.trigger('resolved')
  }

  async getCalendarDefinition(calendarId: string): Promise<CalendarConfig | null> {
    if (this.calendarConfigsCache.has(calendarId)) {
      return this.calendarConfigsCache.get(calendarId) || null
    }

    const files = this.app.vault.getMarkdownFiles()
    let targetFile: TFile | null = null

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file)
      if (cache?.frontmatter && cache.frontmatter['gantt-type-definition'] === calendarId) {
        targetFile = file
        break
      }
    }

    if (!targetFile) {
      return null
    }

    const content = await this.app.vault.read(targetFile)
    const yamlRegex = /```yaml\s([\s\S]*?)```/
    const match = content.match(yamlRegex)

    if (!match || !match[1]) {
      return null
    }

    try {
      const parsed = parseYaml(match[1]) as CalendarConfig
      this.calendarConfigsCache.set(calendarId, parsed)
      return parsed
    } catch (_e) {
      new Notice(`Gantt Plugin: Failed to parse YAML for calendar "${calendarId}"`)
      // console.error(`Gantt Plugin: Failed to parse YAML for calendar "${calendarId}":`, e)
      return null
    }
  }

  // 1. UPDATE THE PARSER INSIDE THE PLUGIN CLASS
  private parseToAbsoluteDays(input: string, config: CalendarConfig | null): { days: number; display: string } | null {
    if (!input) return null
    const cleanInput = input.toString().trim()

    // STRATEGY A: Handle True Gregorian / ISO-8601 Calendar Logic
    if (config && config.type === 'gregorian') {
      const segments = cleanInput.split(config.delimiter).map(Number)
      if (segments.length < 3 || segments.some(isNaN)) return null

      const [year, month, day] = segments

      // Calculate leap years elapsed up to this point dynamically
      let totalDays = (year - 1) * 365
      totalDays += Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)

      // Dynamic month day allocations matching reality
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
      const monthDays = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

      for (let m = 0; m < month - 1; m++) {
        totalDays += monthDays[m]
      }
      totalDays += (day - 1)

      return {
        days: totalDays,
        display: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      }
    }

    // STRATEGY B: Handle Custom Positional Tier Multipliers (Mayan, etc.)
    if (config && config.type === 'positional' && cleanInput.includes(config.delimiter)) {
      const segments = cleanInput.split(config.delimiter).map(Number)
      let totalDays = 0
      let valid = true

      config.units.forEach((unit, idx) => {
        if (segments[idx] !== undefined && !isNaN(segments[idx])) {
          totalDays += segments[idx] * unit.days
        } else if (idx < segments.length) {
          valid = false
        }
      })

      if (!valid) return null

      // Relative offset logic to safely tie positional calendars to the master track
      const epochDate = new Date(config.epoch_gregorian)
      const epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))
      return {
        days: epochDaysOffset + totalDays,
        display: cleanInput
      }
    }

    // Fallback default: standard browser JS date parsing
    const date = new Date(cleanInput)
    if (isNaN(date.getTime())) return null
    return {
      days: Math.floor(date.getTime() / (24 * 60 * 60 * 1000)),
      display: date.toISOString().split('T')[0]
    }
  }

  private async registerCalendar(el: HTMLElement, source: string, ctx: MarkdownPostProcessorContext) {
    const currentFile = this.app.workspace.getActiveFile()
    if (!currentFile || !currentFile.parent) {
      el.createEl('pre', { text: 'Error: Could not determine current directory path scope.' })
      return
    }

    let targetFolderPath = currentFile.parent.path
    const lines = source.split('\n')
    for (const line of lines) {
      const match = line.match(/^path:\s*(.+)$/i)
      if (match) {
        const pathValue = match[1].trim().toLowerCase()
        if (pathValue === 'root') {
          targetFolderPath = '/'
        } else if (pathValue === 'local') {
          targetFolderPath = currentFile.parent.path
        } else {
          targetFolderPath = match[1].trim()
        }
        break
      }
    }

    const mainWrapper = el.createDiv({ cls: 'fantasy-gantt-wrapper' })
    const toolbar = mainWrapper.createDiv({ cls: 'gantt-toolbar' })

    const createCheckbox = (label: string, id: string, checked = true) => {
      const lbl = toolbar.createEl('label', { cls: 'gantt-input-label' })
      const input = lbl.createEl('input', { attr: { type: 'checkbox', id } })
      input.checked = checked
      lbl.createEl('span', { text: ` ${label}` })
      return input
    }

    const toggleBars = createCheckbox('Show Bars', 'toggle-bars')
    const togglePoints = createCheckbox('Show Points', 'toggle-points')
    const toggleGrouping = createCheckbox('Enable Grouping', 'toggle-grouping')
    const resetBtn = toolbar.createEl('button', { text: 'Zoom Reset', cls: 'gantt-btn' })

    const chartContainer = mainWrapper.createDiv({ cls: 'gantt-chart-container' })
    const tooltip = document.body.createDiv({ cls: 'gantt-tooltip', attr: { id: 'gantt-tooltip-element' } })

    ctx.addChild(new GanttTooltipComponent(el, tooltip))

    const hoverTitle = tooltip.createDiv({ cls: 'tooltip-title' })
    const hoverDates = tooltip.createDiv({ cls: 'tooltip-dates' })
    const hoverLink = tooltip.createDiv({ cls: 'tooltip-link', text: 'Click to open active note file' })

    this.calendarConfigsCache.clear() // Wipe cache to handle real-time modifications
    let data = await this.getGanttDataFromFolder(targetFolderPath)

    const renderEngine = new GanttRenderEngine(
      chartContainer,
      data,
      tooltip,
      hoverTitle,
      hoverDates,
      hoverLink,
      this
    )

    toggleBars.addEventListener('change', (e) => renderEngine.updateSettings({ showBars: (e.target as HTMLInputElement).checked }))
    togglePoints.addEventListener('change', (e) => renderEngine.updateSettings({ showPoints: (e.target as HTMLInputElement).checked }))
    toggleGrouping.addEventListener('change', (e) => renderEngine.updateSettings({ enableGrouping: (e.target as HTMLInputElement).checked }))
    resetBtn.addEventListener('click', () => renderEngine.resetZoom())

    const updateCallback = async () => {
      this.calendarConfigsCache.clear()
      const updatedData = await this.getGanttDataFromFolder(targetFolderPath)
      renderEngine.updateData(updatedData)
    }

    this.registerEvent(this.app.metadataCache.on('changed', updateCallback))
    this.registerEvent(this.app.metadataCache.on('resolved', updateCallback))
  }

  private async getGanttDataFromFolder(folderPath: string): Promise<GanttItem[]> {
    const items: GanttItem[] = []
    let incrementalId = 1
    const files = this.app.vault.getMarkdownFiles()

    const targetFiles = files.filter(f => {
      if (!f.parent) return false
      if (folderPath === '/') return true
      return f.parent.path === folderPath
    })

    for (const file of targetFiles) {
      const cache = this.app.metadataCache.getFileCache(file)
      const frontmatter = cache?.frontmatter

      if (frontmatter && frontmatter['gantt-item'] === true) {
        const startInput = frontmatter['gantt-start']
        const endInput = frontmatter['gantt-end']

        if (startInput === undefined || startInput === null || startInput === '') continue

        const calendarType = (frontmatter['gantt-type'] || this.settings.defaultType).trim()
        if (this.settings.visibleCalendars[calendarType] === false) continue

        const config = await this.getCalendarDefinition(calendarType)

        const startRes = this.parseToAbsoluteDays(startInput, config)
        if (!startRes) continue

        const endRes = endInput ? this.parseToAbsoluteDays(endInput, config) : startRes
        if (!endRes) continue

        const calculatedType = (!endInput || startRes.days === endRes.days) ? 'point' : 'bar'
        const itemGroup = frontmatter['gantt-group'] || 'General'

        const finalColor = frontmatter['gantt-color'] ||
          this.settings.groupColors[itemGroup] ||
          this.settings.typeColors[calendarType] ||
          this.settings.fallbackColor

        items.push({
          id: incrementalId++,
          name: frontmatter['gantt-name'] || file.basename,
          startDateDisplay: startRes.display,
          endDateDisplay: endRes.display,
          startDays: startRes.days,
          endDays: endRes.days,
          group: itemGroup,
          type: calculatedType,
          calendarType,
          color: finalColor,
          link: file.path
        })
      }
    }

    return items
  }
}

class GanttRenderEngine {
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

  private settings = { showBars: true, showPoints: true, enableGrouping: true }
  private config = {
    rowHeight: 24,
    groupHeaderHeight: 25,
    singleAxisHeight: 35,
    margin: { top: 20, right: 0, bottom: 10, left: 0 }
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
    public readonly hoverLink: HTMLElement,
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

  public updateData(newData: GanttItem[]) {
    this.rawData = newData
    this.calculateGlobalBounds()
    this.initLayout()
    this.initChartStructure()
    this.handleResize()
  }

  private calculateStacking(items: GanttItem[]) {
    const sorted = [...items].sort((a, b) => a.startDays - b.startDays)
    const lanes: GanttItem[][] = []
    sorted.forEach(item => {
      let placed = false
      for (let i = 0; i < lanes.length; i++) {
        const lastItem = lanes[i][lanes[i].length - 1]
        if (lastItem.endDays < item.startDays - 1) {
          lanes[i].push(item)
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
    return { processedData: sorted, totalLanes: lanes.length }
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
        const { processedData, totalLanes } = this.calculateStacking(items)
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
      const { processedData, totalLanes } = this.calculateStacking(activeData)
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

  private getXPosition(days: number, width: number): number {
    const renderWidth = width - this.config.margin.left - this.config.margin.right
    const percentage = (days - this.minDays) / (this.maxDays - this.minDays)
    return (percentage * renderWidth * this.zoomScale) + this.zoomTranslateX
  }

  private createSVGElement(tag: string): SVGElement {
    return document.createElementNS('http://www.w3.org/2000/svg', tag)
  }

  initChartStructure() {
    this.container.innerHTML = ''

    this.svg = this.createSVGElement('svg')
    this.svg.setAttribute('width', '100%')
    this.svg.setAttribute('height', this.totalHeight.toString())
    this.svg.setAttribute('class', 'gantt-svg-canvas')
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

  drawGroupBackgrounds(width: number) {
    this.backgroundG.innerHTML = ''

    this.groups.forEach((d, i) => {
      if (this.settings.enableGrouping) {
        const groupG = this.createSVGElement('g')
        groupG.setAttribute('transform', `translate(0, ${d.yOffset})`)

        const rect = this.createSVGElement('rect')
        rect.setAttribute('width', width.toString())
        rect.setAttribute('height', d.height.toString())
        rect.setAttribute('class', i % 2 === 0 ? 'gantt-group-row-even' : 'gantt-group-row-odd')
        groupG.appendChild(rect)

        const text: SVGTextContentElement = this.createSVGElement('text')
        text.setAttribute('x', '20')
        text.setAttribute('y', '17')
        text.setAttribute('class', 'gantt-group-text')
        text.textContent = d.name.toUpperCase()
        groupG.appendChild(text)

        const computedLength = (text as any).getComputedTextLength ? (text as any).getComputedTextLength() : 0
        const textWidthEstimate = computedLength > 0 ? computedLength : d.name.length * 6.5
        const badgeWidth = textWidthEstimate + 20
        const badgeHeight = 18

        const shadowRect = this.createSVGElement('rect')
        shadowRect.setAttribute('x', '10')
        shadowRect.setAttribute('y', (5 + badgeHeight).toString())
        shadowRect.setAttribute('width', badgeWidth.toString())
        shadowRect.setAttribute('height', '4')
        shadowRect.setAttribute('class', 'gantt-group-shadow')

        const badge = this.createSVGElement('rect')
        badge.setAttribute('x', '10')
        badge.setAttribute('y', '5')
        badge.setAttribute('width', badgeWidth.toString())
        badge.setAttribute('height', badgeHeight.toString())
        badge.setAttribute('rx', (badgeHeight / 2).toString())
        badge.setAttribute('ry', (badgeHeight / 2).toString())
        badge.setAttribute('class', 'gantt-group-badge')

        groupG.insertBefore(shadowRect, text)
        groupG.insertBefore(badge, text)
        this.backgroundG.appendChild(groupG)
      }
    })
  }

  renderData(width: number) {
    this.dataG.innerHTML = ''

    this.groups.forEach(group => {
      const groupYStart = group.yOffset + (this.settings.enableGrouping ? this.config.groupHeaderHeight : 0)

      group.items.forEach((d: GanttItem) => {
        if (d.type === 'bar') {
          const x1 = this.getXPosition(d.startDays, width)
          const x2 = this.getXPosition(d.endDays, width)
          const barWidth = Math.max(2, x2 - x1)

          const rect = this.createSVGElement('rect')
          rect.setAttribute('class', 'gantt-item bar-rect')
          rect.setAttribute('x', x1.toString())
          rect.setAttribute('y', (groupYStart + d.lane! * this.config.rowHeight + 4).toString())
          rect.setAttribute('width', barWidth.toString())
          rect.setAttribute('height', (this.config.rowHeight - 8).toString())
          if (d.color) rect.setAttribute('fill', d.color)
          rect.setAttribute('data-id', d.id.toString())
          this.dataG.appendChild(rect)
        } else if (d.type === 'point') {
          const cx = this.getXPosition(d.startDays, width)

          const circle = this.createSVGElement('circle')
          circle.setAttribute('class', 'gantt-item point-circle')
          circle.setAttribute('cx', cx.toString())
          circle.setAttribute('cy', (groupYStart + d.lane! * this.config.rowHeight + this.config.rowHeight / 2).toString())
          circle.setAttribute('r', '6')
          if (d.color) circle.setAttribute('fill', d.color)
          circle.setAttribute('data-id', d.id.toString())
          this.dataG.appendChild(circle)
        }
      })
    })
  }

// 2. UPDATE THE AXIS LABEL FORMATTER INSIDE THE GANTT RENDER ENGINE CLASS
  private formatDaysToCalendarString(days: number, config: CalendarConfig | null): string {
    if (!config) {
      const dateObj = new Date(days * 24 * 60 * 60 * 1000)
      return dateObj.toISOString().split('T')[0]
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
        if (remainingDays >= monthDays[m]) {
          remainingDays -= monthDays[m]
          month++
        } else {
          break
        }
      }
      const day = remainingDays + 1

      return `${year}${config.delimiter}${month.toString().padStart(2, '0')}${config.delimiter}${day.toString().padStart(2, '0')}`
    }

    // STRATEGY B: Reverse Engine Positional Multipliers (Mayan, etc.)
    const epochDate = new Date(config.epoch_gregorian)
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

  drawAxes(width: number) {
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
      baseline.setAttribute('class', 'gantt-axis-baseline')
      individualAxisG.appendChild(baseline)

      const label = this.createSVGElement('text')
      label.setAttribute('x', '10')
      label.setAttribute('y', '20')
      label.setAttribute('style', 'font-size: 0.75em; font-weight: bold; fill: var(--text-muted); text-transform: uppercase;')
      label.textContent = calType
      individualAxisG.appendChild(label)

      let lastTextX = -999

      // Access configuration directly via plugin async cache
      const config = (this.plugin as any).calendarConfigsCache.get(calType) || null

      for (let currDays = startDaysValue; currDays <= endDaysValue; currDays += stepDays) {
        const xPos = this.getXPosition(currDays, width)
        if (xPos < 0 || xPos > renderWidth) continue

        if (index === 0) {
          const gridLine = this.createSVGElement('line')
          gridLine.setAttribute('x1', xPos.toString())
          gridLine.setAttribute('x2', xPos.toString())
          gridLine.setAttribute('y1', `-${itemsAreaHeight}`)
          gridLine.setAttribute('y2', '0')
          gridLine.setAttribute('class', 'gantt-axis-gridline')
          this.axisG.appendChild(gridLine)
        }

        const tick = this.createSVGElement('line')
        tick.setAttribute('x1', xPos.toString())
        tick.setAttribute('x2', xPos.toString())
        tick.setAttribute('y1', '0')
        tick.setAttribute('y2', '5')
        tick.setAttribute('class', 'gantt-axis-tick')
        individualAxisG.appendChild(tick)

        if (xPos - lastTextX > 80) { // Slight padding bump for wider text layouts
          const text = this.createSVGElement('text')
          text.setAttribute('x', xPos.toString())
          text.setAttribute('y', '20')
          text.setAttribute('text-anchor', 'middle')
          text.setAttribute('class', 'gantt-axis-text')

          text.textContent = this.formatDaysToCalendarString(currDays, config)

          individualAxisG.appendChild(text)
          lastTextX = xPos
        }
      }

      this.axisG.appendChild(individualAxisG)
    })
  }

  setupNativeZoomAndPan() {
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
    }, { passive: false })
  }

  resetZoom() {
    this.zoomScale = 1
    this.zoomTranslateX = 0
    this.handleResize()
  }

  updateSettings(newSettings: any) {
    this.settings = { ...this.settings, ...newSettings }
    this.initLayout()
    this.initChartStructure()
    this.handleResize()
  }

  setupInteractions() {
    const showTooltip = (event: MouseEvent, d: GanttItem) => {
      this.tooltip.style.opacity = '1'
      this.tooltip.style.left = `${event.clientX + 15}px`
      this.tooltip.style.top = `${event.clientY + 15}px`

      this.hoverTitle.textContent = d.name
      this.hoverDates.textContent = d.type === 'bar' ? `${d.startDateDisplay} to ${d.endDateDisplay}` : d.startDateDisplay
      this.hoverLink.style.display = d.link ? 'block' : 'none'
    }

    this.svg.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement
      if (target && target.classList.contains('gantt-item')) {
        const id = parseInt(target.getAttribute('data-id') || '')
        const dataObj = this.rawData.find(d => d.id === id)
        if (dataObj) showTooltip(event, dataObj)
      }
    })

    this.svg.addEventListener('mousemove', (event) => {
      const target = event.target as HTMLElement
      if (target && target.classList.contains('gantt-item')) {
        if (this.tooltip.style.opacity !== '1') {
          const id = parseInt(target.getAttribute('data-id') || '')
          const dataObj = this.rawData.find(d => d.id === id)
          if (dataObj) showTooltip(event, dataObj)
        }
        this.tooltip.style.left = `${event.clientX + 15}px`
        this.tooltip.style.top = `${event.clientY + 15}px`
      } else {
        this.tooltip.style.opacity = '0'
      }
    })

    this.svg.addEventListener('mouseleave', () => {
      this.tooltip.style.opacity = '0'
    })

    this.svg.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (target && target.classList.contains('gantt-item')) {
        const id = parseInt(target.getAttribute('data-id') || '')
        const dataObj = this.rawData.find(d => d.id === id)
        if (dataObj && dataObj.link) {
          this.plugin.app.workspace.openLinkText(dataObj.link, '', true)
        }
      }
    })
  }
}
