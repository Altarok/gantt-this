import {Platform, setIcon, setTooltip} from 'obsidian'
import {Css, CustomIcons} from '../const/constants'
import {GanttChartModel} from '../model/gantt-chart-model'
import {GanttChartView} from './gantt-chart-view'
import {ChartContext} from '../model/chart-context'
import {SettingsContext} from '../model/settings-context'
import {Destroyable, GroupOrCalendarSettings} from '../types/settings-types'
import {RedrawOption} from '../model/redraw-options'
import {ChartDropdownMenu} from './toolbar-view-dropdown'

const isMobile = Platform.isMobile

export class ToolbarView implements Destroyable {
  private readonly container: HTMLDivElement
  /*
   * Toolbar buttons in order (LTR) - optional buttons may be null
   */
  reloadButton: HTMLButtonElement
  toggleBarsButton: HTMLButtonElement
  toggleTimestampButton: HTMLButtonElement
  toggleEventGroupingButton: HTMLButtonElement
  panLeftButton: HTMLButtonElement | null = null /* optional */
  zoomOutButton: HTMLButtonElement | null = null /* optional */
  resetZoomAndPanButton: HTMLButtonElement
  zoomInButton: HTMLButtonElement | null = null /* optional */
  panRightButton: HTMLButtonElement | null = null /* optional */
  settingsButton: HTMLButtonElement
  debugInfoButton: HTMLButtonElement
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
              private readonly refreshChartCallback: (r: RedrawOption) => Promise<void>) {
    const settings: SettingsContext = chartCtx.settings

    this.container = chartView.toolbarContainer

    this.reloadButton = createButton(this.container, 'refresh-cw', 'Reload data')

    addSeparator(this.container)
    const g1 = createGroup(this.container)

    this.toggleBarsButton = createButton(g1, 'chart-bar-big', 'Toggle bar visibility')
    this.toggleTimestampButton = createButton(g1, CustomIcons.scatterChart, 'Toggle timestamp event visibility')
    this.toggleEventGroupingButton = createButton(g1, 'group', 'Toggle event grouping')

    addSeparator(this.container)
    const g2 = createGroup(this.container)

    if (settings.showPanAndZoomButtonsInToolbar) {
      this.panLeftButton = createButton(g2, 'chevron-left', 'Pan left')
      this.zoomOutButton = createButton(g2, 'zoom-out', 'Zoom out')
    }
    this.resetZoomAndPanButton = createButton(g2, CustomIcons.resetZoom, 'Reset view')
    if (settings.showPanAndZoomButtonsInToolbar) {
      this.zoomInButton = createButton(g2, 'zoom-in', 'Zoom in')
      this.panRightButton = createButton(g2, 'chevron-right', 'Pan right')
    }

    addSeparator(this.container)
    const g3 = createGroup(this.container)

    this.settingsButton = createButton(g3, 'settings', 'Plugin settings')
    this.debugInfoButton = createButton(g3, 'info', 'Setup Problems & Chart Statistics')

    addSeparator(this.container)

    const localSettingsGroup: HTMLDivElement = createGroup(this.container)
    localSettingsGroup.createDiv({text: 'Local settings:'})

    const localSettingsButton = createButton(localSettingsGroup, 'sliders-horizontal', 'Change chart-only settings')
    this.createLocalChartSettingsDropdown(localSettingsButton, settings)

    const toggleGroupVisibilityButton = createButton(localSettingsGroup, 'eye', 'Toggle group visibility')
    this.createToggleGroupVisibilityDropdown(toggleGroupVisibilityButton)

    addSeparator(this.container)

    /* These 2 must be the last buttons! */
    this.foldButton = createButton(this.container, 'fold-horizontal', 'Hide Toolbar')

    this.unfoldButton = createButton(chartView.minimizedToolbarContainer, 'unfold-horizontal', 'Show Toolbar')
    this.unfoldButton.addClass(Css.toolbar.foldButton)
    this.unfoldToolbar()
  }

  private createLocalChartSettingsDropdown(button: HTMLButtonElement, settings: SettingsContext) {
    this.createDropdownMenu(button, 'Changes only affect local chart', (menu: ChartDropdownMenu) => {
      menu
      .addSettingRow('Moons', () => settings.showMoons, (b: boolean) => settings.showMoons = b)
      .addSettingRow('Calendars: Color-code axes', () => settings.colorCodeCalendarAxes, (b: boolean) => settings.colorCodeCalendarAxes = b)
      // .addSettingRow('Calendars: Sticky', () => settings.stickyCalAxes, (b: boolean) => settings.stickyCalAxes = b)
      .addSeparator()  /* separator for hover effects */
      .addSettingRow('Hover: Highlight event', () => settings.highlightHoveredEvent, (b: boolean) => settings.highlightHoveredEvent = b)
      .addSettingRow('Hover: Highlight related events', () => settings.highlightRelatedEvents, (b: boolean) => settings.highlightRelatedEvents = b)
      .addSettingRow('Hover: Draw vertical line', () => settings.drawVerticalLineOnHover, (b: boolean) => settings.drawVerticalLineOnHover = b)
      .addSettingRow('Hover: Draw arrows', () => settings.drawArrows, (b: boolean) => settings.drawArrows = b)
      .addSeparator()  /* separator for toolbar */
      .addSettingRow('Toolbar: Sticky', () => settings.stickyToolbar, (b: boolean) => settings.stickyToolbar = b, true)
      .addSettingRow('Toolbar: At bottom', () => settings.toolbarBelowChart, (b: boolean) => settings.toolbarBelowChart = b, true)
      .addSettingRow('Toolbar: Zoom/Pan buttons', () => settings.showPanAndZoomButtonsInToolbar, (b: boolean) => settings.showPanAndZoomButtonsInToolbar = b, true)
      .addSeparator()
      .addResetCallbackRow(() => this.chartCtx.settings.copyOverwritableGlobalSettings())
    })
  }

  private createToggleGroupVisibilityDropdown(button: HTMLButtonElement) {
    this.createDropdownMenu(button, 'Toggle group visibility', (menu: ChartDropdownMenu) => {

      let containsUnknownGroups = false
      const currentGroupConfigs = this.getCurrentGroupConfigs()
      for (const group of currentGroupConfigs) {
        let text: string

        if (group.unknown) {
          containsUnknownGroups = true
          text = `${group.id} *`
        } else text = group.id

        menu.addSettingRow(text, () => group.visible, (b: boolean) => group.visible = b)
      }

      if (containsUnknownGroups) menu.addFootnoteRow('* : unregistered group')
      menu.addSeparator().addResetCallbackRow(() => this.chartCtx.settings.updateGrpAndCalData())
    })
  }

  private get settings(): SettingsContext {
    return this.chartCtx.settings
  }

  private getCurrentGroupConfigs(): GroupOrCalendarSettings[] {
    const groupConfigs: GroupOrCalendarSettings[] = []

    this.viewModel.distinctGroupNames.forEach(groupName => groupConfigs.push(this.settings.getOrCreateGroupConfig(groupName)))
    groupConfigs.sort((a, b) => {
      if (a.id === 'general') return -1
      if (b.id === 'general') return 1
      return a.id.localeCompare(b.id)
    })
    return groupConfigs
  }

  handleToggleBarsButtonClick(): void {
    setIcon(this.toggleBarsButton, this.viewModel.toggleShowBars() ? 'chart-bar-big' : CustomIcons.barChartCrossed)
  }

  handleToggleTimestampsButtonClick(): void {
    setIcon(this.toggleTimestampButton, this.viewModel.toggleShowPoints() ? CustomIcons.scatterChart : CustomIcons.scatterChartCrossed)
  }

  handleToggleGroupingButtonClick(): void {
    setIcon(this.toggleEventGroupingButton, this.viewModel.toggleEnableGrouping() ? 'group' : CustomIcons.groupCrossed)
  }

  foldToolbar() {
    this.container.addClass('minimized')
    this.unfoldButton.addClass('visible')
    this.chartView.container.addClass('is-toolbar-minimized')
  }

  unfoldToolbar() {
    this.container.removeClass('minimized')
    this.unfoldButton.removeClass('visible')
    this.chartView.container.removeClass('is-toolbar-minimized')
  }

  setHasWarnings() {
    this.debugInfoButton.addClass(Css.toolbar.buttonWarn)
  }

  /** Call when no longer used. */
  destroy() {
    this.reset()
  }

  /** Call when reloading data. */
  reset() {
    this.debugInfoButton?.removeClass(Css.toolbar.buttonWarn)
  }

  private createDropdownMenu(button: HTMLButtonElement,
                             headerText: string,
                             draw: (menu: ChartDropdownMenu) => void) {
    button.addEventListener('click', (_e) => {
      const menu = new ChartDropdownMenu(this.refreshChartCallback, (m) => {
        m.addItem((item) => item.setTitle(headerText).setDisabled(true))
        m.addSeparator()
        draw(m)
      })

      const rect = button.getBoundingClientRect()
      menu.showAtPosition({x: rect.left, y: rect.bottom + 4})
    })
  }

  toggleShowZoomAndPanButtons(show: boolean): void {
    // debug.log(`toggleZoomAndPanButtons >> show : ${show}`)
    const buttons = [
      this.panLeftButton,
      this.zoomOutButton,
      this.zoomInButton,
      this.panRightButton
    ]

    for (const btn of buttons) if (btn) btn.style.display = show ? '' : 'none'
  }
}

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

