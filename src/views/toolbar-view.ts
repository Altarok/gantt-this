import {Platform, setIcon, setTooltip} from 'obsidian'
import {Css} from '../const/constants'
import {GanttChartModel} from '../model/gantt-chart-model'
import {GanttChartView} from './gantt-chart-view'
import {ChartContext} from '../model/chart-context'
import {SettingsContext} from '../model/settings-context'
import {GroupOrCalendarSettings} from "../const/types";

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
  private isGroupsDrawn = false
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
   * Creates an instance of the ToolbarView, initializing buttons, groups,
   * and layout according to chart configuration settings.
   *
   * @param chartCtx - The shared chart context and settings.
   * @param chartView - HTML div destined to contain the Gantt chart's toolbar.
   * @param viewModel - The chart model holding state and visibility settings.
   * @param refreshChartCallback - Callback to trigger chart re-rendering.
   */
  constructor(private readonly chartCtx: ChartContext,
              private readonly chartView: GanttChartView,
              private readonly viewModel: GanttChartModel,
              refreshChartCallback: () => void) {
    const settings: SettingsContext = chartCtx.settings

    this.container = chartView.toolbarContainer

    const {showPanAndZoomButtonsInToolbar} = settings

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
    this.debugInfoButton = createButton(g3, 'info', 'Setup Problems & Chart Statistics')
    this.showGroupVisibilityToggle(refreshChartCallback)

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

  private showGroupVisibilityToggle(refreshChartCallback: () => void) {

    const g4 = createGroup(this.container)
    const groupButton = createButton(g4, 'eye', 'Toggle group visibility')

    const dropdown = this.chartView.container.createDiv({cls: 'gt-group-dropdown'})
    dropdown.style.display = 'none'
    dropdown.createDiv({text: 'Toggle group visibility', cls: 'gt-group-dropdown-row'})


    let isOpen = false
    const toggleDropdown = (open?: boolean) => {
      isOpen = open ?? !isOpen
      if (isOpen) {
        if (!this.isGroupsDrawn) {
          for (const group of this.getCurrentGroups()) {
            const row = dropdown.createDiv({cls: 'gt-group-dropdown-row'})
            const checkbox = row.createEl('input', {type: 'checkbox'})
            checkbox.checked = group.visible ?? false
            row.createSpan({text: group.id})

            row.addEventListener('click', () => {
              group.visible = !group.visible
              checkbox.checked = group.visible
              void this.chartCtx.plugin.saveSettings()
              refreshChartCallback()
            })
          }
          this.isGroupsDrawn = true
        }

        const btnRect = groupButton.getBoundingClientRect()
        const containerRect = this.chartView.container.getBoundingClientRect()
        dropdown.style.display = 'block'
        dropdown.style.top = `${btnRect.bottom - containerRect.top + 4}px`
        dropdown.style.right = `${containerRect.right - btnRect.right}px`
      } else {
        dropdown.style.display = 'none'
      }
    }

    groupButton.addEventListener('click', (e) => {
      e.stopPropagation()
      toggleDropdown()
    })

    const activeWindow = this.chartView.container.ownerDocument.defaultView ?? window
    activeWindow.addEventListener('click', (e) => {
      if (isOpen && !g4.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        toggleDropdown(false)
      }
    })
  }

  /**
   * Gets called only once per chart!
   */
  private getCurrentGroups(): GroupOrCalendarSettings[] {
    const groupNames = this.viewModel.allGroupNames.map(g => this.viewModel.mappedGrpConfigs[g])
    .filter((g): g is GroupOrCalendarSettings => g !== undefined)
    groupNames.sort((a, b) => (a.priority ?? -Infinity) - (b.priority ?? -Infinity))
    return groupNames
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
    const plugin = this.chartCtx.plugin
    const settingApi = (plugin.app as unknown as {
      setting: {
        open(): void
        openTabById(id: string): void
      }
    }).setting

    if (settingApi) {
      settingApi.open()
      settingApi.openTabById(plugin.manifest.id)
    }
  }
}
