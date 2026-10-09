import {Notice} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {RawChartInput} from '../const/types'
import {setToolbarReactions} from './toolbar-controller'
import TextWidthCache from '../view/text-space-cache'
import BasesContext from '../model/bases-context'
import {GanttChartModel} from '../model/gantt-chart-model'
import {EventPropertyReader} from '../io/event-property-reader'
import {SettingsContext} from '../model/settings-context'
import {cacheKnownCalendars} from '../io/calendar-reader'
import {ChartDataLoader} from '../io/chart-data-loader'
import {ChartUiManager} from './chart-ui-manager'
import {GanttRenderEngine} from '../view/svg-drawer'

export default class ChartManager {
  private readonly settingsContext: SettingsContext
  private readonly eventPropertyReader: EventPropertyReader
  private readonly textWidthCache: TextWidthCache
  private readonly dataLoader: ChartDataLoader
  private readonly uiManager: ChartUiManager

  private readonly rerenderCooldownMs: number
  private lastRenderTimestamp = 0

  constructor(readonly plugin: FantasyGanttPlugin,
              readonly container: HTMLElement,
              readonly rawChartInput: RawChartInput,
              readonly basesCtx?: BasesContext) {
    this.settingsContext = new SettingsContext(plugin.settings, rawChartInput)
    this.eventPropertyReader = new EventPropertyReader(this.settingsContext, basesCtx)
    this.textWidthCache = new TextWidthCache()
    this.rerenderCooldownMs = 1000

    this.dataLoader = new ChartDataLoader(plugin, this.eventPropertyReader, this.settingsContext, basesCtx)
    this.uiManager = new ChartUiManager(plugin, container, this.textWidthCache, this.settingsContext, basesCtx)
  }

  private async prepare() {
    await cacheKnownCalendars(this.plugin, this.eventPropertyReader, this.settingsContext, this.rawChartInput.calendar)
    this.settingsContext.parseRawChartInput(this.plugin)
  }

  private createRefreshCallback(renderEngine: GanttRenderEngine, updateTimeoutHolder: { timeout: number | null }) {
    return () => {
      if (!renderEngine) return
      if (updateTimeoutHolder.timeout) {
        window.clearTimeout(updateTimeoutHolder.timeout)
      }

      const elapsed = Date.now() - this.lastRenderTimestamp
      const remainingCooldown = Math.max(500, this.rerenderCooldownMs - elapsed)

      updateTimeoutHolder.timeout = window.setTimeout(() => {
        this.lastRenderTimestamp = Date.now()

        this.dataLoader.getGanttItems().then(updatedData => {
          renderEngine.updateData(updatedData)
        }).catch(() =>
          new Notice('Failed to reload Gantt.')
        )
      }, remainingCooldown)
    }
  }

  async renderGantt() {
    await this.prepare()

    const chartModel = new GanttChartModel(this.settingsContext)
    const chartView = this.uiManager.createChartView(chartModel)

    chartModel.setRawContainerWidth(chartView.chartContainer.clientWidth)

    const timeoutHolder: { timeout: number | null } = {timeout: null}

    this.plugin.calendarConfigsCache.clear()
    const data = await this.dataLoader.getGanttItems()

    const renderEngine = this.uiManager.createRenderEngine(data, chartView, chartModel)
    const refreshChartCallback = this.createRefreshCallback(renderEngine, timeoutHolder)

    const tv = this.uiManager.createToolbarView(chartModel, chartView, refreshChartCallback)

    // this.codeBlockCtx?.addChild(new ChartLifecycleComponent(this.container, this.plugin, refreshChartCallback))

    setToolbarReactions(tv, renderEngine, refreshChartCallback)
  }
}
