import {MarkdownPostProcessorContext, Notice, parseYaml, Plugin, TFile} from 'obsidian'
import {FantasyGanttSettingTab} from './settings-modal'
import {CalendarConfig, DEFAULT_SETTINGS, PluginSettings, PluginSettingsAlreadyUsedInCode} from './const/types'
import {readCodeBlock} from './code-block-reader'
import {CodeBlockCreatorModal} from './ui/gantt-codeblock-creator'
import {CodeBlock} from './const/strings'
import {GanttRender} from './ui/svg-drawer-prestep'


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

