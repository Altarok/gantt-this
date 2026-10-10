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

export default class ChartManager {
  private readonly settingsContext: SettingsContext
  private readonly eventPropertyReader: EventPropertyReader
  private readonly textWidthCache: TextWidthCache
  // private readonly svgDrawerUtil: SvgDrawerUtil
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
    // debugger
    this.settingsContext = new SettingsContext(plugin.settings, rawChartInput)
    this.eventPropertyReader = new EventPropertyReader(this.settingsContext, basesCtx)
    this.textWidthCache = new TextWidthCache()
    // this.svgDrawerUtil = new SvgDrawerUtil(this.settingsContext, this.textWidthCache)
    this.dataLoader = new ChartDataLoader(plugin, this.eventPropertyReader, this.settingsContext, basesCtx)
    this.uiManager = new ChartUiManager(plugin, container, this.textWidthCache, this.settingsContext, basesCtx)
    this.rerenderCooldownMs = 1000 * this.settingsContext.uxRerenderCooldownSeconds
  }

  /** Do not change order of calls in this!! */
  private async prepare() {
    await cacheKnownCalendars(this.plugin, this.eventPropertyReader, this.settingsContext, this.rawChartInput.calendar)
    this.settingsContext.parseRawChartInput(this.plugin)
  }


  /* Define the callback synchronously */
  refreshChartCallback(): void {
    if (!this.renderEngine) return
    if (this.updateTimeout) window.clearTimeout(this.updateTimeout)


    const now = Date.now()
    const elapsed = now - this.lastRenderTimestamp
    const remainingCooldown = Math.max(500, this.rerenderCooldownMs - elapsed)

    /* debounce to let Obsidian's internal indexing finish completely */
    this.updateTimeout = window.setTimeout(() => {
      this.lastRenderTimestamp = Date.now()
      // this.plugin.calendarConfigsCache.clear()
      // new Notice('Re-rendering Gantt...')

      this.dataLoader.getGanttItems().then(updatedData => {
        this.renderEngine?.updateData(updatedData)
      }).catch(() =>
        // TODO #errorCache
        new Notice('Failed to reload Gantt.'))
    }, remainingCooldown)
  }

  async renderGantt() {
    await this.prepare()
    // debugger

    const chartModel = new GanttChartModel(this.settingsContext)

    const chartView = this.uiManager.createChartView(chartModel)

    chartModel.setRawContainerWidth(chartView.chartContainer.clientWidth)

    const tv = this.uiManager.createToolbarView(chartModel, chartView, () => this.refreshChartCallback())

    // this.codeBlockCtx?.addChild(new ChartLifecycleComponent(this.container, this.plugin, () => this.refreshChartCallback()))

    /* Perform data load in async way */
    // this.plugin.calendarConfigsCache.clear()
    const data = await this.dataLoader.getGanttItems()

    /* Instantiate the engine */
    this.renderEngine = this.uiManager.createRenderEngine(data, chartView, chartModel)

    setToolbarReactions(tv, this.renderEngine, () => this.refreshChartCallback())
  }
}
