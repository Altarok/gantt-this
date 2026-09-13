import {sanitizeHTMLToDom, setIcon} from 'obsidian'
import {Css} from '../const/constants'
import {PluginSettings} from '../const/types'
import {ManualSvg} from './manual-svg-icons'

/* See https://lucide.dev for icons */
export function createIconButton(parentEl: HTMLElement, icon: string, title: string): HTMLButtonElement {
  const btn = parentEl.createEl('button', {cls: Css.button.icon, title})
  setIcon(btn, icon)
  return btn
}

type ToggleStates = {
  bars: boolean
  timestamps: boolean
  grouping: boolean
}

export class Toolbar {
  private toggleStates: ToggleStates

  /*
   * Toolbar buttons in order (LTR)
   */
  reloadButton: HTMLButtonElement
  toggleBarsButton: HTMLButtonElement
  toggleTimestampButton: HTMLButtonElement
  toggleEventGroupingButton: HTMLButtonElement
  panLeftButton: HTMLButtonElement | null = null
  zoomOutButton: HTMLButtonElement | null = null
  resetZoomAndPanButton: HTMLButtonElement
  zoomInButton: HTMLButtonElement | null = null
  panRightButton: HTMLButtonElement | null = null
  settingsButton: HTMLButtonElement
  debugInfoButton: HTMLButtonElement | null = null

  /**
   * @param container HTML div destined to contains the Gantt chart's toolbar
   * @param pluginSettings
   */
  constructor(container: HTMLDivElement, pluginSettings: PluginSettings) {
    const {showPanAndZoomButtonsInToolbar} = pluginSettings

    this.toggleStates = {bars: true, timestamps: true, grouping: true}


    this.reloadButton = createIconButton(container, 'refresh-cw', 'Reload data')

    this.toggleBarsButton = createIconButton(container, 'chart-bar-big', 'Toggle bar visibility')
    this.toggleTimestampButton = createIconButton(container, 'customScatterChart', 'Toggle timestamp event visibility')
    this.toggleEventGroupingButton = createIconButton(container, 'group', 'Toggle event grouping')

    const zoomGroupEl = container.createDiv({cls: 'gt-toolbar-zoom-group'})

    if (showPanAndZoomButtonsInToolbar) {
      this.panLeftButton = createIconButton(zoomGroupEl, 'chevron-left', 'Pan left')
      this.zoomOutButton = createIconButton(zoomGroupEl, 'zoom-out', 'Zoom out')
    }

    this.resetZoomAndPanButton = zoomGroupEl.createEl('button', {cls: Css.button.icon, title: 'Reset view'})
    this.resetZoomAndPanButton.appendChild(sanitizeHTMLToDom(ManualSvg.resetZoom))

    if (showPanAndZoomButtonsInToolbar) {
      this.zoomInButton = createIconButton(zoomGroupEl, 'zoom-in', 'Zoom in')
      this.panRightButton = createIconButton(zoomGroupEl, 'chevron-right', 'Pan right')
    }

    this.settingsButton = createIconButton(zoomGroupEl, 'settings', 'Plugin settings')

    // if (pluginSettings.showButtonsToHideGroups) {
    //   /* Create buttons to hide groups */
    //   const hideGroupEl = container.createDiv({cls: 'gt-toolbar-hide-groups'})
    //   const groups = pluginSettings.groups
    //   for (const group of groups) {
    //     const subGroup = hideGroupEl.createDiv({cls: 'gt-toolbar-hide-group'})
    //     let isVisible: boolean = group?.visible ?? false
    //     const button = createIconButton(subGroup, isVisible ? 'eye' : 'eye-off', 'Click to toggle group visibility')
    //     subGroup.createDiv({text: group.id})
    //     button.addEventListener('click', () => {
    //       if (group) {
    //         isVisible = !isVisible
    //         group.visible = isVisible
    //         setIcon(button, isVisible ? 'eye' : 'eye-off')
    //         void this.plugin.saveSettings()
    //         refreshChartCallback()
    //       }
    //     })
    //   }
    // }

  }


}
