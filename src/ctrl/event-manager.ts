import {Platform} from 'obsidian'
import {GanttRenderEngine} from '../view/svg-drawer'
import {GanttMobileEventManager} from './event-manager-mobile'
import {GanttDesktopEventManager} from './event-manager-desktop'
import {PluginSettings} from '../const/types'
import {SvgDrawerUtil} from '../view/svg-drawer-util'

export type GanttEventManager = {
  /** Whether a drag or gesture interaction is currently in progress */
  isDragging: boolean
  /** Attaches or re-binds SVG event listeners */
  attachSvgListeners(): void
  /** Unbinds all window and SVG listeners and cleans up pending animation frames */
  destroy(): void
}

// export abstract class GanttEventManagerBase implements GanttEventManager {
//   isDragging: boolean
//
//   constructor() {
//   }
//
//   abstract attachSvgListeners() {
//   }
//
//   abstract destroy() {
//   }
// }

const isMobile = Platform.isMobile

export function createGanttEventManager(renderEngine: GanttRenderEngine,
                                        pluginSettings: PluginSettings,
                                        svgDrawerUtil: SvgDrawerUtil): GanttEventManager {

  console.log('Creating event manager. Is mobile?', isMobile)
  if (isMobile)
    return new GanttMobileEventManager(renderEngine)
  else
    return new GanttDesktopEventManager(renderEngine, pluginSettings, svgDrawerUtil)
}
