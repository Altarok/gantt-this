import {MarkdownPostProcessorContext, Plugin} from 'obsidian'
import {FantasyGanttSettingTab} from './settings/settings-view'
import {CalendarConfig, DEFAULT_SETTINGS, PluginSettings} from './const/types'
import {readCodeBlock} from './io/code-block-reader'
import {CodeBlockCreatorModal} from './ui/gantt-codeblock-creator'
import {Consts} from './const/constants'
import {GanttRender} from './ui/svg-drawer-prestep'
// import {Commands} from './commands/commands'

export default class FantasyGanttPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS
  calendarConfigsCache = new Map<string, CalendarConfig>()

  async onload() {
    await this.loadSettings()

    this.addSettingTab(new FantasyGanttSettingTab(this.app, this))

    this.registerMarkdownCodeBlockProcessor(Consts.CODEBLOCK_ID, this.registerCalendar.bind(this) /* (source, el, ctx) */)

    if (this.settings.uxAddRibbonIcon) this.addRibbonIcon('lucide-chart-bar-stacked', 'Gantt this: Open code block creator', () =>
      new CodeBlockCreatorModal(this.app, this).open()
    )

    if (this.settings.uxAddCommands) {
      /*
       * TODO re-add after all other eslint chores are done
       */
//      Commands.addAll(this)
    }
  }

  async loadSettings() {
    let loadedData = (await this.loadData()) as Partial<PluginSettings> | null

    /* Work around standard JavaScript object spread. (...) it's shallow */
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loadedData,
      calendars: Array.isArray(loadedData?.calendars) ? loadedData?.calendars : (Array.isArray(DEFAULT_SETTINGS.calendars) ? DEFAULT_SETTINGS.calendars : []),
      groups: Array.isArray(loadedData?.groups) ? loadedData?.groups : (Array.isArray(DEFAULT_SETTINGS.groups) ? DEFAULT_SETTINGS.groups : []),
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

    const codeBlockContent = readCodeBlock(currentFile.parent.path, source)

    const render = new GanttRender(this)

    await render.renderGantt(el, this.settings, codeBlockContent, ctx)
  }

}

