import {MarkdownPostProcessorContext, Notice, parseYaml, Plugin, TFile} from 'obsidian'
import {FantasyGanttSettingTab} from './settings-modal'
import {CalendarConfig, DEFAULT_SETTINGS, PluginSettings, PluginSettingsAlreadyUsedInCode} from './types'
import {readCodeBlock} from './code-block-reader'
import {CodeBlockCreatorModal} from "./ui/gantt-codeblock-creator";
import {CodeBlock} from "./const/strings";
import {GanttRender} from "./ui/svg-drawer-prestep";


export default class FantasyGanttPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS
  calendarConfigsCache = new Map<string, CalendarConfig>()

  async onload() {
    await this.loadSettings()

    this.addSettingTab(new FantasyGanttSettingTab(this.app, this))

    this.registerMarkdownCodeBlockProcessor(CodeBlock.id, async (source, el, ctx) =>
      await this.registerCalendar(el, source, ctx)
    )

    this.addRibbonIcon('lucide-chart-bar-stacked', 'Fantasy Ganntt: Open code block creator', () => {
      this.showCodeBlockCreator()
    })
  }

  async loadSettings() {
    let loadedData: Partial<PluginSettings> = (await this.loadData()) as Partial<PluginSettings> || {}
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData || {})
  }

  async saveSettings() {
    await this.saveData(this.settings)
    this.app.metadataCache.trigger('resolved')
  }

  async getCalendarDefinition(calendarId: string, calendarDefinitionPath: string): Promise<CalendarConfig | null> {
    const cached = this.calendarConfigsCache.get(calendarId)
    if (cached) return cached

    const files = this.app.vault.getMarkdownFiles()
    let targetFile: TFile | null = null

    for (const file of files) {
      if (file.parent?.path !== calendarDefinitionPath) continue
      const cache = this.app.metadataCache.getFileCache(file)
      if (cache?.frontmatter?.['gantt-type-definition'] === calendarId) {
        targetFile = file
        break
      }
    }

    if (!targetFile) return null

    const content = await this.app.vault.read(targetFile)
    const yamlRegex = /```yaml\s([\s\S]*?)```/
    const match = yamlRegex.exec(content)

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

  private showCodeBlockCreator() {
    new CodeBlockCreatorModal(this.app, this).open()
  }

  // 1. UPDATE THE PARSER INSIDE THE PLUGIN CLASS
  parseToAbsoluteDays(input: string, config: CalendarConfig | null): { days: number; display: string } | null {
    if (!input) return null
    const cleanInput = input.toString().trim()

    // STRATEGY A: Handle True Gregorian / ISO-8601 Calendar Logic
    if (config?.type === 'gregorian') {
      const segments = cleanInput.split(config.delimiter).map(Number)
      if (segments.length < 3 || segments.some(isNaN)) return null

      const [year, month, day] = segments

      if (!year || !month || !day) return null

      // Calculate leap years elapsed up to this point dynamically
      let totalDays = (year - 1) * 365
      totalDays += Math.floor((year - 1) / 4) - Math.floor((year - 1) / 100) + Math.floor((year - 1) / 400)

      // Dynamic month day allocations matching reality
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0)
      const monthDays = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

      for (let m = 0; m < month - 1; m++) {
        totalDays += monthDays[m]!
      }
      totalDays += (day - 1)

      return {
        days: totalDays,
        display: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      }
    }

    // STRATEGY B: Handle Custom Positional Tier Multipliers (Mayan, etc.)
    if (config?.type === 'positional' && cleanInput.includes(config.delimiter)) {
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
      display: date.toISOString().split('T')[0]! // TODO remove '!'?
    }
  }

  private async registerCalendar(el: HTMLElement, source: string, ctx: MarkdownPostProcessorContext) {
    const currentFile = this.app.workspace.getActiveFile()
    if (!currentFile?.parent) {
      el.createEl('pre', {text: 'Error: Could not determine current directory path scope.'})
      return
    }

    const codeBlockContent: PluginSettingsAlreadyUsedInCode = readCodeBlock(this.settings, currentFile.parent.path, source)

    const render = new GanttRender(this)

    await render.renderGantt(el, codeBlockContent, ctx)
  }

}

