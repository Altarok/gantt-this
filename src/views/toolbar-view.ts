import {Platform, setIcon, setTooltip} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Css} from '../const/constants'
import {GanttChartModel} from '../model/gantt-chart-model'
import {SettingsContext} from "../model/settings-context";

const isMobile = Platform.isMobile

/* See https://lucide.dev for free icon examples */
function createButton(parentEl: HTMLElement, icon: string, title: string): HTMLButtonElement {
  const btn = parentEl.createEl('button', {cls: Css.toolbar.button})
  setIcon(btn, icon)
  setTooltip(btn, title, {placement: 'bottom', delay: -1})
  return btn
}

function addSeparator(container: HTMLDivElement) {
  if (!isMobile) container.createDiv({cls: Css.toolbar.separator})
}

function createGroup(container: HTMLDivElement) {
  return container.createDiv({cls: Css.toolbar.buttonGroup})
}

export class ToolbarView {
  private foldableToolbarEl: HTMLDivElement

  /*
   * Toolbar buttons in order (LTR) - optional buttons may be null
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
  foldButton: HTMLButtonElement
  unfoldButton: HTMLButtonElement

  /**
   * @param container HTML div destined to contains the Gantt chart's toolbar
   * @param plugin
   * @param viewModel
   * @param settingsContext
   * @param refreshChartCallback
   */
  constructor(container: HTMLDivElement,
              readonly plugin: FantasyGanttPlugin,
              readonly viewModel: GanttChartModel,
              settingsContext: SettingsContext,
              readonly refreshChartCallback: () => void) {
    const {showPanAndZoomButtonsInToolbar} = settingsContext

    this.foldableToolbarEl = container.createDiv({cls: Css.toolbar.container})

    this.reloadButton = createButton(this.foldableToolbarEl, 'refresh-cw', 'Reload data')

    addSeparator(this.foldableToolbarEl)
    const g1 = createGroup(this.foldableToolbarEl)

    this.toggleBarsButton = createButton(g1, 'chart-bar-big', 'Toggle bar visibility')
    this.toggleTimestampButton = createButton(g1, 'customScatterChart', 'Toggle timestamp event visibility')
    this.toggleEventGroupingButton = createButton(g1, 'group', 'Toggle event grouping')

    addSeparator(this.foldableToolbarEl)
    const g2 = createGroup(this.foldableToolbarEl)

    if (showPanAndZoomButtonsInToolbar) {
      this.panLeftButton = createButton(g2, 'chevron-left', 'Pan left')
      this.zoomOutButton = createButton(g2, 'zoom-out', 'Zoom out')
    }
    this.resetZoomAndPanButton = createButton(g2, 'gt-custom-resetPanAndZoom', 'Reset view')
    if (showPanAndZoomButtonsInToolbar) {
      this.zoomInButton = createButton(g2, 'zoom-in', 'Zoom in')
      this.panRightButton = createButton(g2, 'chevron-right', 'Pan right')
    }

    addSeparator(this.foldableToolbarEl)
    const g3 = createGroup(this.foldableToolbarEl)

    this.settingsButton = createButton(g3, 'settings', 'Plugin settings')
    this.debugInfoButton = createButton(g3, 'info', 'Debug info')

    if (settingsContext.showButtonsToHideGroups) {
      const g4 = createGroup(this.foldableToolbarEl)

      /* Create buttons to hide groups */
      const groups = settingsContext.groups
      for (const group of groups) {
        let isVisible: boolean = group?.visible ?? false
        const button = createButton(g4, isVisible ? 'eye' : 'eye-off', 'Click to toggle group visibility')
        g4.createDiv({text: group.id})
        button.addEventListener('click', () => {
          if (group) {
            isVisible = !isVisible
            group.visible = isVisible
            setIcon(button, isVisible ? 'eye' : 'eye-off')
            void plugin.saveSettings() /* TODO is this necessary? */
            refreshChartCallback()
          }
        })
      }
    }

    /*
     * These 2 must be the last buttons!
     */
    this.foldButton = createButton(this.foldableToolbarEl, 'fold-horizontal', 'Hide Toolbar')

    this.unfoldButton = createButton(container, 'unfold-horizontal', 'Show Toolbar')
    this.unfoldButton.toggleVisibility(false)
    this.unfoldButton.addClass('gt-minimized-btn')

  }

  handleToggleBarsButtonClick(): void {
    setIcon(this.toggleBarsButton, this.viewModel.toggleShowBars() ? 'chart-bar-big' : 'customBarChartCrossed')
  }

  handleToggleTimestampsButtonClick(): void {
    setIcon(this.toggleTimestampButton, this.viewModel.toggleShowPoints() ? 'customScatterChart' : 'customScatterChartCrossed')
  }

  handleToggleGroupingButtonClick(): void {
    setIcon(this.toggleEventGroupingButton, this.viewModel.toggleEnableGrouping() ? 'group' : 'customGroupCrossed')
  }

  fold() {
    this.foldableToolbarEl.addClass('minimized')
    this.unfoldButton.addClass('visible')
  }

  unfold() {
    this.foldableToolbarEl.removeClass('minimized')
    this.unfoldButton.removeClass('visible')
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
