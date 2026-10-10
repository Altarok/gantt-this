import {Platform, setIcon, setTooltip} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Css} from '../const/constants'
import {GanttChartModel} from '../model/gantt-chart-model'
import {SettingsContext} from '../model/settings-context'
import {GanttChartView} from './gantt-chart-view'

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
  private readonly container: HTMLDivElement
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
   * @param chartView HTML div destined to contains the Gantt chart's toolbar
   * @param plugin
   * @param viewModel
   * @param settingsContext
   * @param refreshChartCallback
   */
  constructor(private readonly chartView: GanttChartView,
              private readonly plugin: FantasyGanttPlugin,
              private readonly viewModel: GanttChartModel,
              settingsContext: SettingsContext,
              refreshChartCallback: () => void) {

    this.container = chartView.toolbarContainer

    const {showPanAndZoomButtonsInToolbar} = settingsContext

    this.reloadButton = createButton(this.container, 'refresh-cw', 'Reload data')

    addSeparator(this.container)
    const g1 = createGroup(this.container)

    this.toggleBarsButton = createButton(g1, 'chart-bar-big', 'Toggle bar visibility')
    this.toggleTimestampButton = createButton(g1, 'customScatterChart', 'Toggle timestamp event visibility')
    this.toggleEventGroupingButton = createButton(g1, 'group', 'Toggle event grouping')

    addSeparator(this.container)
    const g2 = createGroup(this.container)

    if (showPanAndZoomButtonsInToolbar) {
      this.panLeftButton = createButton(g2, 'chevron-left', 'Pan left')
      this.zoomOutButton = createButton(g2, 'zoom-out', 'Zoom out')
    }
    this.resetZoomAndPanButton = createButton(g2, 'gt-custom-resetPanAndZoom', 'Reset view')
    if (showPanAndZoomButtonsInToolbar) {
      this.zoomInButton = createButton(g2, 'zoom-in', 'Zoom in')
      this.panRightButton = createButton(g2, 'chevron-right', 'Pan right')
    }

    addSeparator(this.container)
    const g3 = createGroup(this.container)

    this.settingsButton = createButton(g3, 'settings', 'Plugin settings')
    this.debugInfoButton = createButton(g3, 'info', 'Debug info')

    if (settingsContext.showButtonsToHideGroups) {
      const g4 = createGroup(this.container)

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
    this.foldButton = createButton(this.container, 'fold-horizontal', 'Hide Toolbar')
    // const con = this.container.parentElement
    // const con = chartView.chartContainer
    const con = chartView.minimizedToolbarContainer
    this.unfoldButton = createButton(con, 'unfold-horizontal', 'Show Toolbar')
    this.unfoldButton.addClass('gt-minimized-btn')
    this.unfold()
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
    this.container.addClass('minimized')
    this.unfoldButton.addClass('visible')
    this.chartView.container.addClass('is-toolbar-minimized')
  }

  unfold() {
    this.container.removeClass('minimized')
    this.unfoldButton.removeClass('visible')
    this.chartView.container.removeClass('is-toolbar-minimized')
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
