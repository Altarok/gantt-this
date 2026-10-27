import {Platform, setIcon, setTooltip} from 'obsidian'
import {Css} from '../const/constants'
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

  private activeCloser: (() => void) | null = null
  private boundOutsideClick: ((e: MouseEvent) => void) | null = null

  // private readonly update: (b?: boolean) => void


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
    // this.update = (full = false): void => void refreshChartCallback(full ? RedrawOption.ManualReload : RedrawOption.None)
    const settings: SettingsContext = chartCtx.settings

    this.container = chartView.toolbarContainer

    this.reloadButton = createButton(this.container, 'refresh-cw', 'Reload data')

    addSeparator(this.container)
    const g1 = createGroup(this.container)

    this.toggleBarsButton = createButton(g1, 'chart-bar-big', 'Toggle bar visibility')
    this.toggleTimestampButton = createButton(g1, 'customScatterChart', 'Toggle timestamp event visibility')
    this.toggleEventGroupingButton = createButton(g1, 'group', 'Toggle event grouping')

    addSeparator(this.container)
    const g2 = createGroup(this.container)

    if (settings.showPanAndZoomButtonsInToolbar) {
      this.panLeftButton = createButton(g2, 'chevron-left', 'Pan left')
      this.zoomOutButton = createButton(g2, 'zoom-out', 'Zoom out')
    }
    this.resetZoomAndPanButton = createButton(g2, 'gt-custom-resetPanAndZoom', 'Reset view')
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

    const textDropDown = createButton(localSettingsGroup, 'sliders-horizontal', 'Change chart-only settings',)
    this.createDropdownMenu(textDropDown, 'Test', (menu: ChartDropdownMenu) => {

      menu
      .addSettingRow('Color-code axes', () => settings.colorCodeCalendarAxes, (b: boolean) => settings.colorCodeCalendarAxes = b)
      .addSettingRow('Moons', () => settings.showMoons, (b: boolean) => settings.showMoons = b)
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
      .addResetCallback(() => this.chartCtx.settings.copyOverwritableGlobalSettings())
    })

    this.createDropdownButton(localSettingsGroup, 'eye', 'Toggle group visibility', 'Toggle group visibility', (dropdown) => {
      this.drawGroupToggleDropdown(dropdown, refreshChartCallback)
    })

    addSeparator(this.container)

    /* These 2 must be the last buttons! */
    this.foldButton = createButton(this.container, 'fold-horizontal', 'Hide Toolbar')

    this.unfoldButton = createButton(chartView.minimizedToolbarContainer, 'unfold-horizontal', 'Show Toolbar')
    this.unfoldButton.addClass('gt-minimized-btn')
    this.unfoldToolbar()

    this.setupGlobalOutsideClickListener()
  }

  private setupGlobalOutsideClickListener() {
    const activeWindow = this.chartView.container.ownerDocument.defaultView ?? window
    this.boundOutsideClick = (e: MouseEvent) => { // ('click', (e) => {
      const target = e.target as Node
      if (this.activeCloser && !this.container.contains(target) && !(target as HTMLElement)?.closest?.('.gt-group-dropdown')) {
        this.activeCloser()
        this.activeCloser = null
      }
    }
    activeWindow.addEventListener('click', this.boundOutsideClick)
  }

  private drawGroupToggleDropdown(dropdown: HTMLDivElement, refreshChartCallback: (r: RedrawOption) => Promise<void>) {
    let containsUnknownGroups = false
    for (const group of this.getCurrentGroupConfigs()) {
      const row = dropdown.createDiv({cls: 'gt-group-dropdown-row'})
      const checkbox = row.createEl('input', {type: 'checkbox'})
      checkbox.checked = group.visible ?? false
      let text: string

      if (group.unknown) {
        containsUnknownGroups = true
        text = `${group.id} *`
      } else text = group.id
      row.createSpan({text})
      row.addEventListener('click', () => {
        group.visible = !group.visible
        checkbox.checked = group.visible
        void refreshChartCallback(RedrawOption.None)
      })
    }
    if (containsUnknownGroups) {
      dropdown.createDiv({text: '*: unregistered group', cls: 'gt-group-dropdown-footnote'})
    }
  }

  private get settings(): SettingsContext {
    return this.chartCtx.settings
  }

  /**
   * Gets called only once per chart!
   */
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
    setIcon(this.toggleBarsButton, this.viewModel.toggleShowBars() ? 'chart-bar-big' : 'customBarChartCrossed')
  }

  handleToggleTimestampsButtonClick(): void {
    setIcon(this.toggleTimestampButton, this.viewModel.toggleShowPoints() ? 'customScatterChart' : 'customScatterChartCrossed')
  }

  handleToggleGroupingButtonClick(): void {
    setIcon(this.toggleEventGroupingButton, this.viewModel.toggleEnableGrouping() ? 'group' : 'customGroupCrossed')
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

  private createDropdownButton(parent: HTMLDivElement,
                               icon: string,
                               tooltip: string,
                               headerText: string,
                               onDrawContent: (dropdown: HTMLDivElement) => void) {
    const button = createButton(parent, icon, tooltip)
    // const dropdown = this.chartView.container.createDiv({cls: 'gt-group-dropdown'})
    const dropdown = (this.chartView.container.ownerDocument.defaultView ?? window).document.body.createDiv({cls: 'gt-group-dropdown'})
    dropdown.createDiv({text: headerText, cls: 'gt-group-dropdown-header'})

    let isOpen = false
    let isDrawn = false

    const toggle = (open?: boolean) => {
      isOpen = open ?? !isOpen
      if (isOpen) {
        if (this.activeCloser && this.activeCloser !== close) {
          this.activeCloser()
        }
        if (!isDrawn) {
          onDrawContent(dropdown)
          isDrawn = true
        }
        const btnRect = button.getBoundingClientRect()
        // const containerRect = this.chartView.container.getBoundingClientRect()
        dropdown.addClass('visible')
        // dropdown.style.top = `${btnRect.bottom - containerRect.top + 4}px`
        // dropdown.style.left = `${btnRect.left - containerRect.left}px`
        dropdown.style.top = `${btnRect.bottom + 4}px`
        dropdown.style.left = `${btnRect.left}px`
        this.activeCloser = close
      } else {
        dropdown.removeClass('visible')
        if (this.activeCloser === close) this.activeCloser = null
      }
    }
    const close = () => toggle(false)

    button.addEventListener('click', (e) => {
      e.stopPropagation()
      toggle()
    })
  }

  /** Call when no longer used. */
  destroy() {
    this.reset()
    if (this.boundOutsideClick) {
      const activeWindow = this.chartView.container.ownerDocument.defaultView ?? window
      activeWindow.removeEventListener('click', this.boundOutsideClick)
      this.boundOutsideClick = null
    }
    this.activeCloser = null
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

