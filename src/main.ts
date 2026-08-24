import {MarkdownPostProcessorContext, Plugin} from 'obsidian'
import {FantasyGanttSettingTab} from './settings/settings-view'
import {BaseKeys, CalendarConfig, DEFAULT_SETTINGS, PluginSettings} from './const/types'
import {readCodeBlock} from './io/code-block-reader'
import {CodeBlockCreatorModal} from './ui/gantt-codeblock-creator'
import {Consts} from './const/constants'
import {GanttRender} from './view/svg-drawer-prestep'
import {GanttBaseViewExampleName, GanttThisBasesView} from './base'
import {ManualSvg} from "./view/manual-svg-icons";

export default class FantasyGanttPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS
  calendarConfigsCache = new Map<string, CalendarConfig>()

  async onload() {
    await this.loadSettings()

    ManualSvg.saveAllToApi()

    this.addSettingTab(new FantasyGanttSettingTab(this))

    this.registerMarkdownCodeBlockProcessor(Consts.CODEBLOCK_ID, this.registerCalendar.bind(this))

    if (this.settings.uxAddRibbonIcon) this.addRibbonIcon('lucide-chart-bar-stacked', 'Gantt this: Open code block creator', () =>
      new CodeBlockCreatorModal(this.app, this).open()
    )

    if (this.settings.uxAddCommands) {
      /*
       * TODO re-add after all other eslint chores are done
       */
//      Commands.addAll(this)
    }

    this.registerBasesView(GanttBaseViewExampleName, {
      name: 'Gantt chart',
      icon: 'lucide-chart-bar-stacked',
      factory: (controller, containerEl) => {
        return new GanttThisBasesView(this, controller, containerEl)
      },
      options: () => (
        [
          {
            type: 'folder', displayName: 'Use calendars in', key: BaseKeys.calPath,
            placeholder: 'Pre-set by plugin settings',
            default: this.settings.calendarPath
          },
          {
            type: 'toggle', displayName: 'Search sub-folders', key: BaseKeys.calPathRec,
            default: this.settings.calendarPathSearchRecursive
          },
          {type: 'text', displayName: 'Lower bound date', key: BaseKeys.lbd},
          {type: 'text', displayName: 'Upper bound date', key: BaseKeys.ubd}
        ]
      ) /* end options */

    }) /* end registerBasesView() */
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

    const render = new GanttRender(this, null, null)

    await render.renderGantt(el, this.settings, codeBlockContent, ctx)
  }

}

