import {MarkdownPostProcessorContext, Notice} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {RawChartInput} from '../const/types'
import {setToolbarReactions} from './toolbar-controller'
import TextWidthCache from '../view/text-space-cache'
import {SvgDrawerUtil} from '../view/svg-drawer-util'
import BasesContext from '../model/bases-context'
import {GanttChartModel} from '../model/gantt-chart-model'
import {EventPropertyReader} from '../io/event-property-reader'
import {SettingsContext} from '../model/settings-context'
import {getCalendarDefinitions} from '../io/calendar-reader'
import {ToolbarView} from '../views/toolbar-view'
import {ChartDataLoader} from '../io/chart-data-loader'
import {ChartUiManager} from './chart-ui-mngr'
import {ChartLifecycleComponent} from './codeblock-chart-updater'

export default class ChartManager {
  private readonly settingsContext: SettingsContext
  private readonly eventPropertyReader: EventPropertyReader
  private readonly textWidthCache: TextWidthCache
  private readonly svgDrawerUtil: SvgDrawerUtil
  private readonly dataLoader: ChartDataLoader
  private readonly uiManager: ChartUiManager

  private readonly rerenderCooldownMs: number
  private lastRenderTimestamp = 0

  constructor(readonly plugin: FantasyGanttPlugin,
              readonly container: HTMLElement,
              readonly rawChartInput: RawChartInput,
              readonly basesCtx: BasesContext | null,
              readonly codeBlockCtx: MarkdownPostProcessorContext | null) {
    this.settingsContext = new SettingsContext(plugin.settings, rawChartInput)
    this.eventPropertyReader = new EventPropertyReader(this.settingsContext, this.basesCtx ?? undefined)
    this.textWidthCache = new TextWidthCache()
    this.rerenderCooldownMs = 1000
    this.svgDrawerUtil = new SvgDrawerUtil(this.plugin.settings, this.textWidthCache)

    this.dataLoader = new ChartDataLoader(plugin, basesCtx, this.eventPropertyReader, this.settingsContext)
    this.uiManager = new ChartUiManager(plugin, container, this.textWidthCache, this.svgDrawerUtil, this.settingsContext, basesCtx)
  }

  private async prepare() {
    await this.prepareCalendars()
    this.settingsContext.parseRawChartInput(this.plugin)
  }

  private async prepareCalendars() {
    const calendarIDs: string[] = this.plugin.settings.calendars.map(c => c.id)
    if (this.rawChartInput.calendar) calendarIDs.push(this.rawChartInput.calendar)

    await getCalendarDefinitions(calendarIDs, this.plugin, this.eventPropertyReader, this.settingsContext)
  }

  async renderGantt() {
    await this.prepare()

    let updateTimeout: number | null = null

    const refreshChartCallback = () => {
      if (!renderEngine) return
      if (updateTimeout) window.clearTimeout(updateTimeout)

      const now = Date.now()
      const elapsed = now - this.lastRenderTimestamp
      const remainingCooldown = Math.max(500, this.rerenderCooldownMs - elapsed)

      updateTimeout = window.setTimeout(() => {
        this.lastRenderTimestamp = Date.now()

        this.dataLoader.getGanttItems().then(updatedData => {
          renderEngine?.updateData(updatedData)
        }).catch(() =>
          new Notice('Failed to reload Gantt.')
        )
      }, remainingCooldown)
    }

    const chartModel = new GanttChartModel(this.plugin)
    const chartView = this.uiManager.createChartView(chartModel)

    chartModel.setRawContainerWidth(chartView.chartContainer.clientWidth)

    const tv = new ToolbarView(chartView.toolbarContainer, this.plugin, chartModel, refreshChartCallback)

    this.codeBlockCtx?.addChild(new ChartLifecycleComponent(this.container, this.plugin, refreshChartCallback))

    this.plugin.calendarConfigsCache.clear()
    const data = await this.dataLoader.getGanttItems()

    const renderEngine = this.uiManager.createRenderEngine(data, chartView, chartModel)

    setToolbarReactions(tv, renderEngine, refreshChartCallback)
  }
}
