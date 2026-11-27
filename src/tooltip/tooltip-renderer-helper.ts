import {ChartContext} from '../model/chart-context'
import {GanttRenderEngine} from '../render/svg-drawer'
import {GanttChartView} from '../view/gantt-chart-view'
import {SettingsContext} from '../model/settings-context'
import {GanttItem} from '../types/event-types'

export abstract class TooltipRendererHelper {

  protected constructor(protected readonly chartCtx: ChartContext,
                        protected readonly engine: GanttRenderEngine) {
  }

  abstract destroy(): void

  abstract render(target: HTMLElement,
                  ganttItem: GanttItem,
                  eventSvg?: SVGSVGElement): void

  protected get chartView(): GanttChartView {
    return this.engine.view
  }

  protected get overlayColor(): string {
    return this.settings.uxVerticalOverlayColor
  }

  protected get settings(): SettingsContext {
    return this.chartCtx.settings
  }

}
