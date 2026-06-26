import {MarkdownPostProcessorContext, MarkdownRenderChild, Plugin, parseYaml, TFile, Notice} from 'obsidian'
import {FantasyGanttSettingTab} from './settings-modal'
import {createSettings, DEFAULT_SETTINGS, FantasyGanttSettings,} from './settings'
import {CalendarConfig, GanttItem} from './types'
import {GanttRenderEngine} from './svg-drawer'


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
  settings: FantasyGanttSettings = createSettings()
  calendarConfigsCache: Map<string, CalendarConfig> = new Map()

  async onload() {
    await this.loadSettings()

    this.addSettingTab(new FantasyGanttSettingTab(this.app, this))

    this.registerMarkdownCodeBlockProcessor('fantasy-gantt', async (source, el, ctx) => {
      await this.registerCalendar(el, source, ctx)
    })
  }

  async loadSettings() {
    // this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
    this.settings = {...DEFAULT_SETTINGS, ...await this.loadData()}
  }

  async saveSettings() {
    await this.saveData(this.settings)
    this.app.metadataCache.trigger('resolved')
  }

  async getCalendarDefinition(calendarId: string): Promise<CalendarConfig | null> {
    const cached = this.calendarConfigsCache.get(calendarId)
    if (cached) return cached

    const files = this.app.vault.getMarkdownFiles()
    let targetFile: TFile | null = null

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file)
      if (cache?.frontmatter && cache.frontmatter['gantt-type-definition'] === calendarId) {
        targetFile = file
        break
      }
    }

    if (!targetFile) return null

    const content = await this.app.vault.read(targetFile)
    const yamlRegex = /```yaml\s([\s\S]*?)```/
    const match = content.match(yamlRegex)

    if (!match?.[1]) return null


    try {
      const parsed = parseYaml(match[1]) as CalendarConfig
      this.calendarConfigsCache.set(calendarId, parsed)
      return parsed
    } catch (_error) {
      new Notice(`Gantt Plugin: Failed to parse YAML for calendar '${calendarId}'`)
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
      const epochDate = new Date(config.epochGregorian)
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
      el.createEl('pre', {text: 'Error: Could not determine current directory path scope.'})
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

    const mainWrapper = el.createDiv({cls: 'fantasy-gantt-wrapper'})
    const toolbar = mainWrapper.createDiv({cls: 'gantt-toolbar'})

    const createCheckbox = (label: string, id: string, checked = true) => {
      const lbl = toolbar.createEl('label', {cls: 'gantt-input-label'})
      const input = lbl.createEl('input', {attr: {type: 'checkbox', id}})
      input.checked = checked
      lbl.createEl('span', {text: ` ${label}`})
      return input
    }

    const toggleBars = createCheckbox('Show Bars', 'toggle-bars')
    const togglePoints = createCheckbox('Show Points', 'toggle-points')
    const toggleGrouping = createCheckbox('Enable Grouping', 'toggle-grouping')
    const resetBtn = toolbar.createEl('button', {text: 'Zoom Reset', cls: 'gantt-btn'})

    const chartContainer = mainWrapper.createDiv({cls: 'gantt-chart-container'})
    const tooltip = document.body.createDiv({cls: 'gantt-tooltip', attr: {id: 'gantt-tooltip-element'}})

    ctx.addChild(new GanttTooltipComponent(el, tooltip))

    const hoverTitle = tooltip.createDiv({cls: 'tooltip-title'})
    const hoverDates = tooltip.createDiv({cls: 'tooltip-dates'})
    // const hoverLink =
      tooltip.createDiv({cls: 'tooltip-link', text: 'Click to open active note file'})

    this.calendarConfigsCache.clear() // Wipe cache to handle real-time modifications
    const data = await this.getGanttDataFromFolder(targetFolderPath)

    // data.forEach(d => {
    //   if (d.type === 'bar' || d.type === 'point') {
    //     console.log(`[Gantt Render] Type: ${d.type}, Name: "${d.name}", ID: ${d.id}`);
    //   }
    // });

    const renderEngine = new GanttRenderEngine(
      chartContainer,
      data,
      tooltip,
      hoverTitle,
      hoverDates,
      this
    )

    toggleBars.addEventListener('change', () => renderEngine.toggleShowBars(toggleBars.checked))
    togglePoints.addEventListener('change', () => renderEngine.toggleShowPoints(togglePoints.checked))
    toggleGrouping.addEventListener('change', () => renderEngine.toggleGrouping(toggleGrouping.checked))
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
      const frontMatter = cache?.frontmatter

      if (frontMatter && frontMatter['gantt-item'] === true) {
        const startInput = frontMatter['gantt-start']
        const endInput = frontMatter['gantt-end']

        if (startInput === undefined || startInput === null || startInput === '') continue

        const calendarType = (frontMatter['gantt-type'] || this.settings.defaultType).trim()
        if (!this.settings.visibleCalendars[calendarType]) continue

        const config = await this.getCalendarDefinition(calendarType)

        const startRes = this.parseToAbsoluteDays(startInput, config)
        if (!startRes) continue

        const endRes = endInput ? this.parseToAbsoluteDays(endInput, config) : startRes
        if (!endRes) continue

        const calculatedType = (!endInput || startRes.days === endRes.days) ? 'point' : 'bar'
        const itemGroup = frontMatter['gantt-group'] || 'General'

        const finalColor = frontMatter['gantt-color'] ||
          this.settings.groupColors[itemGroup] ||
          this.settings.typeColors[calendarType] ||
          this.settings.fallbackColor

        items.push({
          id: incrementalId++,
          name: frontMatter['gantt-name'] || file.basename,
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

