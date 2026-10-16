import {Platform} from 'obsidian'
import {GanttRenderEngine} from '../view/svg-drawer'
import {GanttMobileEventManager} from './event-manager-mobile'
import {GanttDesktopEventManager} from './event-manager-desktop'
import TooltipManager from './tooltip-manager-desktop'
import {ChartContext} from '../model/chart-context'
import {GanttEventManager} from './event-manager'

const isMobile = Platform.isMobile

export function createGanttEventManager(chartCtx: ChartContext,
                                        renderEngine: GanttRenderEngine): GanttEventManager {

  if (isMobile) {
    return new GanttMobileEventManager(chartCtx, renderEngine)
  } else {
    const tooltipManager = new TooltipManager(chartCtx, renderEngine)
    return new GanttDesktopEventManager(chartCtx, renderEngine, tooltipManager)
  }
}
