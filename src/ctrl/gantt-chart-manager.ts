import {Notice} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Destroyable, GanttItem, RawChartInput} from '../types/settings-types'
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
import {RedrawOption} from '../model/redraw-options'
import {debug} from '../util/debug'

/**
 * Each chart should have one of these.
 */
export class ChartManager {
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
  private lastRawData: GanttItem[] = []

  private destroyableObjects: Destroyable[] = []

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

  reset(): void {
    this.destroyableObjects.forEach(d => d.destroy())
  }

  async reloadSettings(): Promise<void> {
    await this.plugin.loadSettings()
  }

  async updateAfterReload(): Promise<void> {
    await this.prepareCalendarCache(false)

    debug.info('>> updateAfterReload')
    const updatedGanttItems = await this.dataLoader.getGanttItems()
    const haveGanttItemsChanged = compareQueryResults(this.lastRawData, updatedGanttItems)
    debug.info(`-- updateAfterReload, haveGanttItemsChanged = ${haveGanttItemsChanged}`)
    if (haveGanttItemsChanged) {
      debug.info('<< updateAfterReload - update!!')
      this.renderEngine?.updateData(RedrawOption.DataReload, updatedGanttItems)
    } else {
      debug.info('<< updateAfterReload - no update')
    }
  }

  /** Do not change order of calls in this!! */
  private async prepareCalendarCache(includeReset: boolean) {
    if (includeReset) {
      /* 1. load plugin settings */
      await this.reloadSettings()
      /* 2. load plugin settings */
      this.plugin.calendarConfigsCache.clear()
    }

    try {
      await cacheKnownCalendars(this.chartContext, this.rawChartInput.calendar)
    } catch (err) {
      if (err instanceof GanttError) this.chartContext.addErr(err)
    }
    try {
      this.chartContext.parseRawChartInput()
    } catch (err) {
      if (err instanceof GanttError) this.chartContext.addErr(err)
    }
  }

  refreshChartCallback = async (reset: RedrawOption): Promise<void> => {
    if (reset.resetCaches) {
      this.reset()
      this.diagnosticsContext.resetCache()
      await this.prepareCalendarCache(true)
      // TODO reset orange color of diag button
    }

    if (!this.renderEngine) return
    if (this.updateTimeout) window.clearTimeout(this.updateTimeout)

    const now = Date.now()
    const elapsed = now - this.lastRenderTimestamp

    const remainingCooldown = this.rerenderCooldownMs - elapsed
    if (reset === RedrawOption.ManualReload) {
      debug.log(`Manual refresh. Cooldown was at ${remainingCooldown} milliseconds.`)
    } else if (remainingCooldown > 0) {
      debug.log(`Auto-refresh has to wait for another ${remainingCooldown} milliseconds.`)
      return
    } else {
      debug.log(`Auto-refresh after ${elapsed} milliseconds.`)
    }

    /* debounce to let Obsidian's internal indexing finish completely */
    this.updateTimeout = window.setTimeout(() => {
      this.lastRenderTimestamp = now

      this.dataLoader.getGanttItems()
      .then(updatedData => {
        this.lastRawData = updatedData
        this.renderEngine?.updateData(reset, updatedData)
      })
      .catch(() => new Notice('Failed to reload Gantt.'))
    }, remainingCooldown)
  }

  async renderGantt() {
    await this.prepareCalendarCache(true)

    const chartModel = new GanttChartModel(this.settingsContext)
    const chartView = this.uiManager.createChartView(chartModel)

    chartModel.setRawContainerWidth(chartView.chartContainer.clientWidth)

    const tv = this.uiManager.createToolbarView(chartModel, chartView, this.refreshChartCallback)
    this.chartContext.addToolBarView(tv)
    this.destroyableObjects.push(tv)

    const data = await this.dataLoader.getGanttItems()

    this.renderEngine = this.uiManager.createRenderEngine(data, chartView, chartModel)

    setToolbarReactions(this.chartContext, tv, this.renderEngine, this.refreshChartCallback)

    if (this.diagnosticsContext.hasWarnings) tv.setHasWarnings()
  }
}

function compareQueryResults(prev: GanttItem[], next: GanttItem[]): boolean {
  if (prev.length !== next.length) return true

  const prevMap = new Map(prev.map(item => [item.file.path, item]))

  for (const nextItem of next) {
    const prevItem = prevMap.get(nextItem.file.path)
    if (!prevItem) return true

    if (prevItem.startDays !== nextItem.startDays
      || prevItem.endDays !== nextItem.endDays
      || prevItem.name !== nextItem.name
      || prevItem.displayType !== nextItem.displayType
      || JSON.stringify(prevItem.predecessors) !== JSON.stringify(nextItem.predecessors)
      || JSON.stringify(prevItem.successors) !== JSON.stringify(nextItem.successors)
    ) {
      return true
    }
  }

  return false
}
