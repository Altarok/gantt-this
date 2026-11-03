import {GanttItem} from '../types/settings-types'
import {GanttRenderEngine} from '../render/svg-drawer'
import {GanttChartModel} from '../model/gantt-chart-model'
import {GanttChartView} from '../view/gantt-chart-view'
import {ToolbarView} from '../view/toolbar-view'
import {ChartContext} from '../model/chart-context'
import {debug} from "../util/debug";
import {RedrawOption} from '../model/redraw-options'

export class ChartUiManager {
  constructor(private readonly chartCtx: ChartContext,
              private readonly container: HTMLElement) {
  }

  /**  Instantiates the main Gantt chart render container. */
  public createChartView(chartModel: GanttChartModel): GanttChartView {
    debug.log('<> Create new GanttChartView')
    return new GanttChartView(this.chartCtx, this.container, chartModel)
  }

  /** Constructs the core rendering engine for the chart. */
  public createRenderEngine(data: GanttItem[], chartView: GanttChartView, chartModel: GanttChartModel): GanttRenderEngine {
    debug.log('<> Create new GanttRenderEngine')
    return new GanttRenderEngine(this.chartCtx, chartView, data, chartModel)
  }

  /** Instantiates the toolbar render for the chart. */
  public createToolbarView(chartModel: GanttChartModel, chartView: GanttChartView, refreshCallback: (r: RedrawOption) => Promise<void>): ToolbarView {
    debug.log('<> Create new ToolbarView')
    return new ToolbarView(this.chartCtx, chartView, chartModel, refreshCallback)
  }
}
