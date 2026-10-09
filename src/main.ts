import {MarkdownPostProcessorContext, Platform, Plugin} from 'obsidian'
import {FantasyGanttSettingTab} from './settings/settings-view'
import {BaseKeys, CalendarConfig, PluginSettings, RawChartInput} from './const/types'
import {DEFAULT_SETTINGS} from './const/default-values'
import {readCodeBlock} from './io/codeblock-reader'
import {CodeBlockCreatorModal} from './util/gantt-codeblock-creator'
import {Consts} from './const/constants'
import ChartManager from './ctrl/gantt-chart-manager'
import {GanttBaseViewExampleName, GanttThisBasesView} from './base'
import {Commands} from './commands/commands'
import {ManualSvg} from './view/manual-svg-icons'
import {ChartLifecycleComponent} from "./ctrl/codeblock-chart-updater";

export default class FantasyGanttPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS
  calendarConfigsCache = new Map<string, CalendarConfig>()

  private addPluginRibbonIcon() {
    this.addRibbonIcon('lucide-chart-bar-stacked', 'Gantt this: Open code block creator', () => new CodeBlockCreatorModal(this.app, this).open())
  }

  async onload() {
    await this.loadSettings()

    ManualSvg.addManualSvgsToObsidianCache()

    this.addSettingTab(new FantasyGanttSettingTab(this))

    this.registerMarkdownCodeBlockProcessor(Consts.CODEBLOCK_ID, this.registerCalendar.bind(this))

    if (Platform.isDesktop && this.settings.uxAddRibbonIcon)
      this.addPluginRibbonIcon()
    else if (Platform.isMobile && this.settings.uxAddRibbonIconMobile)
      this.addPluginRibbonIcon()

    if (this.settings.uxAddCommands)
      Commands.addAll(this)

    this.registerBasesView(GanttBaseViewExampleName, {
      name: 'Gantt this',
      icon: 'lucide-chart-bar-stacked',
      factory: (controller, containerEl) => {
        return new GanttThisBasesView(this, controller, containerEl)
      },
      options: () => ([
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
        {type: 'text', displayName: 'Upper bound date', key: BaseKeys.ubd},
        {
          type: 'text', displayName: 'Calendar used for bounds', key: BaseKeys.cal,
          /* Do not use DEFAULT_SETTINGS.defaultCalendar here, user may have changed it */
          default: this.settings.defaultCalendar, placeholder: this.settings.defaultCalendar
        }
      ]) /* end options */

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

    this.settings.useFilenameAsFallbackStartDate = false
  }

  async saveSettings() {
    await this.saveData(this.settings)
    this.app.metadataCache.trigger('resolved')
  }

  /**
   * Register Markdown codeblock postprocessor.
   *
   * @param source
   * @param el
   * @param ctx
   * @private
   */
  private async registerCalendar(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    const currentFile = this.app.workspace.getActiveFile()
    if (!currentFile?.parent) {
      el.createEl('pre', {text: 'Error: Could not determine current directory path scope.'})
      return
    }

    const rawChartInput: RawChartInput = readCodeBlock(currentFile.parent.path, source)

    const render = new ChartManager(this, el, rawChartInput)

    await render.renderGantt()

    /* Register the child lifecycle component synchronously before any further 'await' */
    ctx.addChild(new ChartLifecycleComponent(el, this, () => render.refreshChartCallback()))
  }

}

