import {setIcon, setTooltip} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Css} from '../const/constants'

type ToggleStates = {
  bars: boolean
  timestamps: boolean
  grouping: boolean
}

/* See https://lucide.dev for icons */
function createButton(parentEl: HTMLElement, icon: string, title: string): HTMLButtonElement {
  const btn = parentEl.createEl('button', {cls: Css.toolbar.button})
  setIcon(btn, icon)
  setTooltip(btn, title, {placement: 'bottom', delay: -1})
  return btn
}

function addSeparator(container: HTMLDivElement) {
  container.createDiv({cls: Css.toolbar.separator})
}

function createGroup(container: HTMLDivElement) {
  return container.createDiv({cls: Css.toolbar.buttonGroup})
}

export class ToolbarView {
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
   * @param plugin
   * @param refreshChartCallback
   */
  constructor(container: HTMLDivElement,
              readonly plugin: FantasyGanttPlugin,
              refreshChartCallback: () => void) {
    const {showPanAndZoomButtonsInToolbar} = plugin.settings
    this.toggleStates = {bars: true, timestamps: true, grouping: true}

    this.reloadButton = createButton(container, 'refresh-cw', 'Reload data')

    addSeparator(container)
    const g1 = createGroup(container)

    this.toggleBarsButton = createButton(g1, 'chart-bar-big', 'Toggle bar visibility')
    this.toggleTimestampButton = createButton(g1, 'customScatterChart', 'Toggle timestamp event visibility')
    this.toggleEventGroupingButton = createButton(g1, 'group', 'Toggle event grouping')

    addSeparator(container)
    const g2 = createGroup(container)

    if (showPanAndZoomButtonsInToolbar) {
      this.panLeftButton = createButton(g2, 'chevron-left', 'Pan left')
      this.zoomOutButton = createButton(g2, 'zoom-out', 'Zoom out')
    }
    this.resetZoomAndPanButton = createButton(g2, 'gt-custom-resetPanAndZoom', 'Reset view')
    if (showPanAndZoomButtonsInToolbar) {
      this.zoomInButton = createButton(g2, 'zoom-in', 'Zoom in')
      this.panRightButton = createButton(g2, 'chevron-right', 'Pan right')
    }

    addSeparator(container)
    const g3 = createGroup(container)

    this.settingsButton = createButton(g3, 'settings', 'Plugin settings')
    this.debugInfoButton = createButton(g3, 'info', 'Debug info')

    if (plugin.settings.showButtonsToHideGroups) {
      // addSeparator(container)
      const g4 = createGroup(container)

      /* Create buttons to hide groups */
      // const hideGroupEl = container.createDiv({cls: 'gt-toolbar-hide-groups'})
      const groups = plugin.settings.groups
      for (const group of groups) {
        // const subGroup = g4.createDiv({cls: })
        let isVisible: boolean = group?.visible ?? false
        const button = createButton(g4, isVisible ? 'eye' : 'eye-off', 'Click to toggle group visibility')
        g4.createDiv({text: group.id})
        button.addEventListener('click', () => {
          if (group) {
            isVisible = !isVisible
            group.visible = isVisible
            setIcon(button, isVisible ? 'eye' : 'eye-off')
            void plugin.saveSettings()
            refreshChartCallback()
          }
        })
      }
    }
  }


  handleToggleBarsButtonClick(): boolean {
    this.toggleStates.bars = !this.toggleStates.bars
    setIcon(this.toggleBarsButton, this.toggleStates.bars ? 'chart-bar-big' : 'customBarChartCrossed')
    return this.toggleStates.bars
  }

  handleToggleTimestampsButtonClick(): boolean {
    this.toggleStates.timestamps = !this.toggleStates.timestamps
    setIcon(this.toggleTimestampButton, this.toggleStates.timestamps ? 'customScatterChart' : 'customScatterChartCrossed')
    return this.toggleStates.timestamps
  }

  handleToggleGroupingButtonClick(): boolean {
    this.toggleStates.grouping = !this.toggleStates.grouping
    setIcon(this.toggleEventGroupingButton, this.toggleStates.grouping ? 'group' : 'customGroupCrossed')
    return this.toggleStates.grouping
  }

  /**
   * Open plugin's settings in native Obsidian modal.
   */
  handleSettingsButtonClick() {
    const settingApi = (this.plugin.app as unknown as {
      setting: {
        open(): void
        openTabById(id: string): void
      }
    }).setting

    if (settingApi) {
      settingApi.open()
      settingApi.openTabById(this.plugin.manifest.id)
    }
  }
}
