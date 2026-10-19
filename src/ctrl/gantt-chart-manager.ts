import {Notice} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {RawChartInput} from '../types/settings-types'
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
import {DiagnosticsContext} from '../model/diagnostics-context'
import {GanttError} from '../model/gantt-error'
import {ChartContext} from '../model/chart-context'
import {ResetPreset} from '../model/reset-options'

/**
 * Each chart should have one of these.
 */
export default class ChartManager {
  private readonly diagnosticsContext: DiagnosticsContext
  private readonly settingsContext: SettingsContext
  private readonly eventPropertyReader: EventPropertyReader
  private readonly chartContext: ChartContext
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
    this.diagnosticsContext = new DiagnosticsContext()
    this.settingsContext = new SettingsContext(plugin.settings, rawChartInput)
    this.eventPropertyReader = new EventPropertyReader(this.settingsContext, basesCtx)

    this.chartContext = new ChartContext(plugin, this.diagnosticsContext, this.settingsContext,
      this.eventPropertyReader, new TextWidthCache(), basesCtx)

    this.rerenderCooldownMs = 1000 * this.settingsContext.uxRerenderCooldownSeconds
    this.dataLoader = new ChartDataLoader(this.chartContext)
    this.uiManager = new ChartUiManager(this.chartContext, container)
  }

  /** Do not change order of calls in this!! */
  private async prepare() {

    try {
      await cacheKnownCalendars(this.chartContext, this.rawChartInput.calendar)
    } catch (err) {
      if (err instanceof GanttError) this.diagnosticsContext.addErr(err)
    }
    try {
      this.chartContext.parseRawChartInput()
    } catch (err) {
      if (err instanceof GanttError) this.diagnosticsContext.addErr(err)
    }
  }

  refreshChartCallback(reset: ResetPreset): void {
    if (!this.renderEngine) return
    if (this.updateTimeout) window.clearTimeout(this.updateTimeout)

    const now = Date.now()
    const elapsed = now - this.lastRenderTimestamp

    const remainingCooldown = this.rerenderCooldownMs - elapsed
    // if (reset.isManualRefresh) {
    //   console.log(`Manual refresh. Cooldown was at ${remainingCooldown} milliseconds.`)
    // } else
    if (remainingCooldown > 0) {
      // console.log(`Auto-refresh has to wait for another ${remainingCooldown} milliseconds.`)
      return
    }
    // else {
    //   console.log(`Auto-refresh after ${elapsed} milliseconds.`)
    // }

    /* debounce to let Obsidian's internal indexing finish completely */
    this.updateTimeout = window.setTimeout(() => {
      this.lastRenderTimestamp = now

      this.chartContext.resetCaches(reset)

      this.dataLoader.getGanttItems()
      .then(updatedData => this.renderEngine?.updateData(reset, updatedData))
      .catch(() => new Notice('Failed to reload Gantt.')) // TODO #errorCache


    }, remainingCooldown)
  }

  async renderGantt() {
    await this.prepare()

    const chartModel = new GanttChartModel(this.settingsContext)
    const chartView = this.uiManager.createChartView(chartModel)

    chartModel.setRawContainerWidth(chartView.chartContainer.clientWidth)

    const tv = this.uiManager.createToolbarView(chartModel, chartView, () => this.refreshChartCallback(ResetPreset.Data))

    const data = await this.dataLoader.getGanttItems()

    this.renderEngine = this.uiManager.createRenderEngine(data, chartView, chartModel)

    setToolbarReactions(this.chartContext, tv, this.renderEngine, () => this.refreshChartCallback(ResetPreset.ManualReload))

    if (this.diagnosticsContext.hasWarnings) tv.setHasWarnings()
  }
}

