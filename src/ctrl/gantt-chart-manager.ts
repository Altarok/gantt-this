import {EventRef, MarkdownPostProcessorContext, MarkdownRenderChild, Notice, TFile} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GanttItem, RawChartInput} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {parseFiles} from '../io/event-frontmatter-reader'
import {ToolbarView} from '../views/toolbar-view'
import {setToolbarReactions} from './toolbar-controller'
import TextWidthCache from '../view/text-space-cache'
import {SvgDrawerUtil} from '../view/svg-drawer-util'
import BasesContext from '../model/bases-context'
import {GanttChartModel} from '../model/gantt-chart-model'
import {EventPropertyReader} from '../io/event-property-reader'
import {SettingsContext} from '../model/settings-context'
import {getFilteredFiles} from '../io/file-collector'
import {getCalendarDefinitions} from '../io/calendar-reader'
import {GanttChartView} from '../views/gantt-chart-view'

export default class ChartManager {
  private readonly settingsContext: SettingsContext
  private readonly eventPropertyReader: EventPropertyReader
  private readonly textWidthCache: TextWidthCache


  private readonly rerenderCooldownMs: number
  private lastRenderTimestamp = 0
  private readonly svgDrawerUtil: SvgDrawerUtil

  constructor(readonly plugin: FantasyGanttPlugin,
              readonly container: HTMLElement,
              readonly rawChartInput: RawChartInput,
              readonly basesCtx: BasesContext | null,
              readonly codeBlockCtx: MarkdownPostProcessorContext | null) {
    // debugger
    this.settingsContext = new SettingsContext(plugin.settings, rawChartInput)
    this.eventPropertyReader = new EventPropertyReader(this.settingsContext, this.basesCtx ?? undefined)
    this.textWidthCache = new TextWidthCache()
    this.rerenderCooldownMs = 1000 * plugin.settings.uxRerenderCooldownSeconds
    this.svgDrawerUtil = new SvgDrawerUtil(this.plugin.settings, this.textWidthCache)
  }

  /** Do not change order of calls in this!! */
  private async prepare() {
    // debugger
    await this.prepareCalendars()
    this.settingsContext.parseRawChartInput(this.plugin)
  }

  private async prepareCalendars() {
    const calendarIDs: string[] = this.plugin.settings.calendars.map(c => c.id)
    if (this.rawChartInput.calendar) calendarIDs.push(this.rawChartInput.calendar)

    await getCalendarDefinitions(calendarIDs, this.plugin, this.eventPropertyReader, this.settingsContext)
  }

  private get settings() {
    return this.plugin.settings
  }

  private async getGanttItems(): Promise<GanttItem[]> {
    let files: TFile[]

    if (this.basesCtx) {
      files = this.basesCtx.filterQueryResults(this.eventPropertyReader)
    } else {
      files = getFilteredFiles(this.plugin, this.eventPropertyReader, this.settingsContext)
    }

    return parseFiles(files, this.plugin, this.eventPropertyReader, this.settingsContext)
  }

  async renderGantt() {
    await this.prepare()
    // debugger
    /* Define the callback synchronously */
    const refreshChartCallback = () => {
      if (!renderEngine) return
      if (updateTimeout) window.clearTimeout(updateTimeout)


      const now = Date.now()
      const elapsed = now - this.lastRenderTimestamp
      const remainingCooldown = Math.max(500, this.rerenderCooldownMs - elapsed)

      /* debounce to let Obsidian's internal indexing finish completely */
      updateTimeout = window.setTimeout(() => {
        this.lastRenderTimestamp = Date.now()
        // this.plugin.calendarConfigsCache.clear()
        // new Notice('Re-rendering Gantt...')

        this.getGanttItems().then(updatedData => {

          if (renderEngine) renderEngine.updateData(updatedData)
        }).catch(() =>
          // TODO #errorCache
          new Notice('Failed to reload Gantt.'))
      }, remainingCooldown)
    }

    const chartModel = new GanttChartModel(this.plugin)

    const chartView = new GanttChartView(this.plugin, this.container, chartModel, this.textWidthCache)

    chartModel.setRawContainerWidth(chartView.chartContainer.clientWidth)

    const tv = new ToolbarView(chartView.toolbarContainer, this.plugin, chartModel, refreshChartCallback)

    /* Declare the renderEngine variable so the callback can reference its reference scope */
    let updateTimeout: number | null = null

    /* Register the child lifecycle component synchronously before ANY 'await' */
    this.codeBlockCtx?.addChild(new GanttLifecycleComponent(this.container, this.plugin, refreshChartCallback))

    /* Perform data load in async way */
    this.plugin.calendarConfigsCache.clear()
    const data = await this.getGanttItems()

    /* Instantiate the engine */
    const renderEngine = new GanttRenderEngine(chartView,
      data,
      this.plugin,
      this.settingsContext,
      this.basesCtx ?? null,
      this.textWidthCache,
      chartModel,
      this.svgDrawerUtil
    )

    setToolbarReactions(tv, renderEngine, refreshChartCallback)
  }
}

class GanttLifecycleComponent extends MarkdownRenderChild {
  private events: EventRef[] = []

  constructor(containerEl: HTMLElement,
              private readonly plugin: FantasyGanttPlugin,
              private readonly refreshChartCallback: () => void) {
    super(containerEl)
  }

  onload() {
    /* Register listeners with reference tracking */
    this.events.push(this.plugin.app.metadataCache.on('changed', this.refreshChartCallback))
    this.events.push(this.plugin.app.metadataCache.on('resolved', this.refreshChartCallback))
  }

  onunload() {
    /* Cleanly unbind listeners from the global event loop when code block is closed */
    this.events.forEach(eventRef => this.plugin.app.metadataCache.offref(eventRef))
    this.events = []
  }
}
