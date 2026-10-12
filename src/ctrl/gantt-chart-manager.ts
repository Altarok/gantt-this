import {Notice} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {RawChartInput} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {setToolbarReactions} from './toolbar-controller'
import TextWidthCache from '../view/text-space-cache'
import BasesContext from '../model/bases-context'
import {GanttChartModel} from '../model/gantt-chart-model'
import {EventPropertyReader} from '../io/event-property-reader'
import {SettingsContext} from '../model/settings-context'
import {cacheKnownCalendars} from '../io/calendar-reader'
import {ChartDataLoader} from '../io/chart-data-loader'
import {ChartUiManager} from './chart-ui-manager'
import {StatisticsContext} from '../model/statistics-context'
import {GanttError} from '../model/gantt-error'

/**
 * Each chart should have one of these.
 */
export default class ChartManager {
  readonly statisticsContext: StatisticsContext
  private readonly settingsContext: SettingsContext
  private readonly eventPropertyReader: EventPropertyReader
  private readonly textWidthCache: TextWidthCache
  private readonly dataLoader: ChartDataLoader
  private readonly uiManager: ChartUiManager
  private readonly rerenderCooldownMs: number
  private lastRenderTimestamp = 0
  private updateTimeout: number | null = null

  private renderEngine?: GanttRenderEngine

  constructor(readonly plugin: FantasyGanttPlugin,
              readonly container: HTMLElement,
              readonly rawChartInput: RawChartInput,
              readonly basesCtx?: BasesContext) {
    this.statisticsContext = new StatisticsContext()
    this.settingsContext = new SettingsContext(this, plugin.settings, rawChartInput)
    this.eventPropertyReader = new EventPropertyReader(this.settingsContext, basesCtx)
    this.textWidthCache = new TextWidthCache()
    this.rerenderCooldownMs = 1000 * this.settingsContext.uxRerenderCooldownSeconds
    this.dataLoader = new ChartDataLoader(plugin, this.eventPropertyReader, this.settingsContext, basesCtx)
    this.uiManager = new ChartUiManager(plugin, container, this.textWidthCache, this.settingsContext, basesCtx)
  }

  /** Do not change order of calls in this!! */
  private async prepare() {

    try {
      await cacheKnownCalendars(this.plugin, this.eventPropertyReader, this.settingsContext, this.rawChartInput.calendar)
    } catch (err) {
      if (err instanceof GanttError) this.statisticsContext.addErr(err)
    }
    try {
      this.settingsContext.parseRawChartInput(this.plugin)
    } catch (err) {
      if (err instanceof GanttError) this.statisticsContext.addErr(err)
    }
  }

  refreshChartCallback(): void {
    if (!this.renderEngine) return
    if (this.updateTimeout) window.clearTimeout(this.updateTimeout)

    const now = Date.now()
    const elapsed = now - this.lastRenderTimestamp
    const remainingCooldown = Math.max(500, this.rerenderCooldownMs - elapsed)

    /* debounce to let Obsidian's internal indexing finish completely */
    this.updateTimeout = window.setTimeout(() => {
      this.lastRenderTimestamp = now

      this.dataLoader.getGanttItems().then(updatedData => {
        this.renderEngine?.updateData(updatedData)
      }).catch(() =>
        // TODO #errorCache
        new Notice('Failed to reload Gantt.'))
    }, remainingCooldown)
  }

  async renderGantt() {
    await this.prepare()

    const chartModel = new GanttChartModel(this.settingsContext)
    const chartView = this.uiManager.createChartView(chartModel)

    chartModel.setRawContainerWidth(chartView.chartContainer.clientWidth)

    const tv = this.uiManager.createToolbarView(chartModel, chartView, () => this.refreshChartCallback())

    const data = await this.dataLoader.getGanttItems()

    this.renderEngine = this.uiManager.createRenderEngine(data, chartView, chartModel)

    setToolbarReactions(this.plugin, this, tv, this.renderEngine, () => this.refreshChartCallback())
  }
}
