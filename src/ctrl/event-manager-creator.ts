import {Platform} from 'obsidian'
import {GanttRenderEngine} from '../render/svg-drawer'
import {GanttMobileEventManager} from './event-manager-mobile'
import {GanttDesktopEventManager} from './event-manager-desktop'
import TooltipManager from './tooltip-manager-desktop'
import {ChartContext} from '../model/chart-context'
import {GanttEventManager} from './event-manager'
import {SvgDrawerUtil} from '../render/svg-drawer-util'

const isMobile = Platform.isMobile

export function createGanttEventManager(chartCtx: ChartContext,
                                        renderEngine: GanttRenderEngine,
                                        svgDrawerUtil: SvgDrawerUtil): GanttEventManager {

  if (isMobile) {
    return new GanttMobileEventManager(chartCtx, renderEngine)
  } else {
    const tooltipManager = new TooltipManager(chartCtx, renderEngine, svgDrawerUtil)
    return new GanttDesktopEventManager(chartCtx, renderEngine, tooltipManager)
  }
}
