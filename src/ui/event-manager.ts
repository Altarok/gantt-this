import {Platform} from "obsidian"
import {GanttRenderEngine} from './svg-drawer'
import {GanttMobileEventManager} from "./event-manager-mobile"
import {GanttDesktopEventManager} from './event-manager-desktop'
import {PluginSettings} from '../const/types'

export type GanttEventManager = {
  /** Whether a drag or gesture interaction is currently in progress */
  isDragging: boolean
  /** Attaches or re-binds SVG event listeners */
  attachSvgListeners(): void
  /** Unbinds all window and SVG listeners and cleans up pending animation frames */
  destroy(): void
}

export function createGanttEventManager(renderEngine: GanttRenderEngine,
                                        pluginSettings: PluginSettings): GanttEventManager {

  if (Platform.isMobile)
    return new GanttMobileEventManager(renderEngine)
  else
    return new GanttDesktopEventManager(renderEngine,
      pluginSettings.autoRestrictZoom,
      pluginSettings.mouseOverEventShowBox,
      pluginSettings.mouseOverEventShowVerticalLine,
      pluginSettings.uxZoomButton,
      pluginSettings.uxPanButton)
}
