import FantasyGanttPlugin from '../main'
import {GanttItem} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import TextWidthCache from '../view/text-space-cache'
import {SvgDrawerUtil} from '../view/svg-drawer-util'
import BasesContext from '../model/bases-context'
import {GanttChartModel} from '../model/gantt-chart-model'
import {SettingsContext} from '../model/settings-context'
import {GanttChartView} from '../views/gantt-chart-view'
import {ToolbarView} from '../views/toolbar-view'

export class ChartUiManager {
  private readonly svgDrawerUtil: SvgDrawerUtil

  constructor(private readonly plugin: FantasyGanttPlugin,
              private readonly container: HTMLElement,
              private readonly textWidthCache: TextWidthCache,
              private readonly settingsContext: SettingsContext,
              private readonly basesCtx?: BasesContext) {
    this.svgDrawerUtil = new SvgDrawerUtil(settingsContext, textWidthCache)
  }

  /**
   * Instantiates the main Gantt chart view container.
   */
  public createChartView(chartModel: GanttChartModel): GanttChartView {
    return new GanttChartView(this.plugin, this.settingsContext, this.container, chartModel, this.textWidthCache)
  }

  /**
   * Constructs the core rendering engine for the chart.
   */
  public createRenderEngine(data: GanttItem[],
                            chartView: GanttChartView,
                            chartModel: GanttChartModel): GanttRenderEngine {
    return new GanttRenderEngine(chartView, data, this.plugin, this.settingsContext, chartModel, this.svgDrawerUtil, this.basesCtx)
  }

  /**
   * Instantiates the toolbar view for the chart.
   */
  public createToolbarView(chartModel: GanttChartModel,
                           chartView: GanttChartView,
                           refreshCallback: () => void): ToolbarView {
    return new ToolbarView(chartView.toolbarContainer, this.plugin, chartModel, this.settingsContext, refreshCallback)
  }
}
