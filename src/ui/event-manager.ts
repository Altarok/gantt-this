import {Platform} from "obsidian"
import {GanttRenderEngine} from './svg-drawer'
import {GanttMobileEventManager} from "./event-manager-mobile"
import {GanttDesktopEventManager} from './event-manager-desktop'

export type GanttEventManager = {

  isDragging: boolean

  attachSvgListeners(): void

  destroy(): void
}

export function createGanttEventManager(renderEngine: GanttRenderEngine,
                                        mouseOverEventShowBox: boolean,
                                        mouseOverEventShowVerticalLine: boolean): GanttEventManager {

  if (Platform.isMobile)
    return new GanttMobileEventManager(renderEngine, mouseOverEventShowBox, mouseOverEventShowVerticalLine)
  else
    return new GanttDesktopEventManager(renderEngine, mouseOverEventShowBox, mouseOverEventShowVerticalLine)

}
