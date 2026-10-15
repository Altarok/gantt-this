import {Platform} from 'obsidian'
import {GanttRenderEngine} from '../view/svg-drawer'
import {GanttMobileEventManager} from './event-manager-mobile'
import {GanttDesktopEventManager} from './event-manager-desktop'
import {SvgDrawerUtil} from '../view/svg-drawer-util'
import TooltipManager from './tooltip-manager-desktop'
import {ChartContext} from '../model/chart-context'

export type GanttEventManager = {
  /** Whether a drag or gesture interaction is currently in progress */
  isDragging: boolean
  /** Attaches or re-binds SVG event listeners */
  attachSvgListeners(): void
  /** Unbinds all window and SVG listeners and cleans up pending animation frames */
  destroy(): void
}

const isMobile = Platform.isMobile

export function createGanttEventManager(chartCtx: ChartContext,
                                        renderEngine: GanttRenderEngine): GanttEventManager {

  // console.log('Creating event manager. Is mobile?', isMobile)
  if (isMobile) {
    return new GanttMobileEventManager(chartCtx, renderEngine)
  } else {
    const tooltipManager = new TooltipManager(chartCtx, renderEngine)
    return new GanttDesktopEventManager(chartCtx, renderEngine, tooltipManager)
  }
}
