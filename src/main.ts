import {MarkdownPostProcessorContext, Plugin} from 'obsidian'
import {FantasyGanttSettingTab} from './settings-view'
import {CalendarConfig, DEFAULT_SETTINGS, PluginSettings} from './const/types'
import {readCodeBlock} from './util/code-block-reader'
import {CodeBlockCreatorModal} from './ui/gantt-codeblock-creator'
import {CodeBlock} from './const/strings'
import {GanttRender} from './ui/svg-drawer-prestep'


export default class FantasyGanttPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS
  calendarConfigsCache = new Map<string, CalendarConfig>()

  async onload() {
    await this.loadSettings()

    this.addSettingTab(new FantasyGanttSettingTab(this.app, this))

    this.registerMarkdownCodeBlockProcessor(CodeBlock.id, this.registerCalendar.bind(this) /* (source, el, ctx) */)

    this.addRibbonIcon('lucide-chart-bar-stacked', 'Fantasy Gantt: Open code block creator', () =>
      new CodeBlockCreatorModal(this.app, this).open()
    )
  }

  async loadSettings() {
    let loadedData = (await this.loadData()) as Partial<PluginSettings> | null

    // Deep clone the object properties to avoid mutating DEFAULT_SETTINGS references
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loadedData,
      // typeColors: {...DEFAULT_SETTINGS.typeColors, ...loadedData?.typeColors},
      groupColors: {...DEFAULT_SETTINGS.groupColors, ...loadedData?.groupColors},
      calendars: {...DEFAULT_SETTINGS.calendars, ...loadedData?.calendars}
    }
  }

  async saveSettings() {
    await this.saveData(this.settings)
    this.app.metadataCache.trigger('resolved')
  }


  private async registerCalendar(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const currentFile = this.app.workspace.getActiveFile()
    if (!currentFile?.parent) {
      el.createEl('pre', {text: 'Error: Could not determine current directory path scope.'})
      return
    }

    const partialPluginSettings: PluginSettings = readCodeBlock(this.settings, currentFile.parent.path, source)

    const render = new GanttRender(this)

    await render.renderGantt(el, partialPluginSettings, ctx)
  }

}

