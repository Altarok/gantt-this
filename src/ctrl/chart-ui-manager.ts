import FantasyGanttPlugin from '../main'
import {GanttItem} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import TextWidthCache from '../view/text-space-cache'
import {SvgDrawerUtil} from '../view/svg-drawer-util'
import BasesContext from '../model/bases-context'
import {GanttChartModel} from '../model/gantt-chart-model'
import {SettingsContext} from '../model/settings-context'
import {GanttChartView} from '../views/gantt-chart-view'

export class ChartUiManager {
  svgDrawerUtil: SvgDrawerUtil

  constructor(private readonly plugin: FantasyGanttPlugin,
              private readonly container: HTMLElement,
              private readonly textWidthCache: TextWidthCache,
              // private readonly svgDrawerUtil: SvgDrawerUtil,
              private readonly settingsContext: SettingsContext,
              private readonly basesCtx: BasesContext | null) {
    this.svgDrawerUtil = new SvgDrawerUtil(plugin.settings, textWidthCache)
  }

  public createChartView(chartModel: GanttChartModel): GanttChartView {
    return new GanttChartView(this.plugin, this.container, chartModel, this.textWidthCache)
  }

  public createRenderEngine(data: GanttItem[],
                            chartView: GanttChartView,
                            chartModel: GanttChartModel): GanttRenderEngine {
    return new GanttRenderEngine(
      chartView,
      data,
      this.plugin,
      this.settingsContext,
      this.basesCtx ?? null,
      this.textWidthCache,
      chartModel,
      this.svgDrawerUtil
    )
  }
}
