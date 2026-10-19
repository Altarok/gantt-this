import {GanttItem} from '../types/settings-types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {GanttChartModel} from '../model/gantt-chart-model'
import {GanttChartView} from '../views/gantt-chart-view'
import {ToolbarView} from '../views/toolbar-view'
import {ChartContext} from '../model/chart-context'

export class ChartUiManager {
  constructor(private readonly chartCtx: ChartContext,
              private readonly container: HTMLElement) {
  }

  /**
   * Instantiates the main Gantt chart view container.
   */
  public createChartView(chartModel: GanttChartModel): GanttChartView {
    return new GanttChartView(this.chartCtx, this.container, chartModel)
  }

  /**
   * Constructs the core rendering engine for the chart.
   */
  public createRenderEngine(data: GanttItem[],
                            chartView: GanttChartView,
                            chartModel: GanttChartModel): GanttRenderEngine {
    return new GanttRenderEngine(this.chartCtx, chartView, data, chartModel)
  }

  /**
   * Instantiates the toolbar view for the chart.
   */
  public createToolbarView(chartModel: GanttChartModel,
                           chartView: GanttChartView,
                           refreshCallback: () => void): ToolbarView {
    return new ToolbarView(this.chartCtx, chartView, chartModel, refreshCallback)
  }
}
