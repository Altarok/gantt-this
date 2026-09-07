import {
  addIcon,
  EventRef,
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
  Notice,
  Platform,
  sanitizeHTMLToDom,
  setIcon,
  TFile
} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Css} from '../const/constants'
import {CodeBlockContent, GanttItem, PluginSettings} from '../const/types'
import {GanttRenderEngine} from './svg-drawer'
import {getGanttDataFromFolder, parseFiles} from '../io/event-frontmatter-reader'
import {ManualSvg} from './manual-svg-icons'

const step = Platform.isMobile ? 0.4 : 0.25

export class GanttRender {
  private readonly rerenderCooldownMs: number
  private lastRenderTimestamp = 0

  constructor(readonly plugin: FantasyGanttPlugin,
              readonly filesFilteredByBase: TFile[] | null,
              readonly selectedFrontmatterProperties: string[] | null) {
    this.rerenderCooldownMs = 1000 * plugin.settings.uxRerenderCooldownSeconds
  }

  private async getGanttItems(pluginSettings: PluginSettings,
                              codeBlockContent: CodeBlockContent): Promise<GanttItem[]> {
    if (this.filesFilteredByBase !== null) {
      return parseFiles(this.plugin, pluginSettings, codeBlockContent, this.filesFilteredByBase)
    }

    return getGanttDataFromFolder(this.plugin, pluginSettings, codeBlockContent)
  }

  async renderGantt(el: HTMLElement,
                    pluginSettings: PluginSettings,
                    codeBlockContent: CodeBlockContent,
                    ctx?: MarkdownPostProcessorContext) {
    const mainWrapper = el.createDiv({cls: Css.wrapper})
    const toolbar = mainWrapper.createDiv({cls: Css.toolbar})

/* 
 * TODO no longer used after PR #6
    const createCheckbox = (label: string, id: string, checked = true) => {
      const lbl = toolbar.createEl('label', {cls: Css.inputLabel})
      const input = lbl.createEl('input', {attr: {type: 'checkbox', id}})
      input.checked = checked
      lbl.createSpan({text: ` ${label}`})
      return input
    }
*/

    /* Define the callback synchronously */
    const refreshChartCallback = () => {
      if (!renderEngine) return

      if (updateTimeout) {
        window.clearTimeout(updateTimeout)
      }

      const now = Date.now()
      const elapsed = now - this.lastRenderTimestamp
      const remainingCooldown = Math.max(500, this.rerenderCooldownMs - elapsed)

      /* debounce to let Obsidian's internal indexing finish completely */
      updateTimeout = window.setTimeout(() => {
        this.lastRenderTimestamp = Date.now()
        this.plugin.calendarConfigsCache.clear()
        new Notice('Re-rendering Gantt...')

        this.getGanttItems(pluginSettings, codeBlockContent)
        .then(updatedData => {
          if (renderEngine) renderEngine.updateData(updatedData)
        })
        .catch(() => new Notice('Failed to reload Gantt.'))
      }, remainingCooldown)
    }

    const reloadBtn = createIconButton(toolbar, 'refresh-cw', 'Reload data')

    let renderOptionsToggleState ={
      toggleBars: true,
      togglePoints: true,
      toggleGrouping: true
    }

    const toggleBars = createIconButton(toolbar, renderOptionsToggleState.toggleBars ? 'chart-bar-big' : 'customBarChartCrossed', 'Toggle bars')
    const togglePoints = createIconButton(toolbar, renderOptionsToggleState.togglePoints ? 'customScatterChart' : 'customScatterChartCrossed', 'Toggle points')
    const toggleGrouping = createIconButton(toolbar, renderOptionsToggleState.togglePoints ? 'group' : 'customGroupCrossed', 'Toggle grouping')

    /* Create 6 pan, zoom, settings buttons */
    const zoomGroupEl = toolbar.createDiv({cls: 'gt-toolbar-zoom-group'})

    const {showPanAndZoomButtonsInToolbar} = pluginSettings

    let panLeftBtn: HTMLButtonElement | null = null
    let zoomOutBtn: HTMLButtonElement | null = null
    let zoomInBtn: HTMLButtonElement | null = null
    let panRightBtn: HTMLButtonElement | null = null

    if (showPanAndZoomButtonsInToolbar) {
      panLeftBtn = createIconButton(zoomGroupEl, 'chevron-left', 'Pan left')
      zoomOutBtn = createIconButton(zoomGroupEl, 'zoom-out', 'Zoom out')
    }
    const zoomResetBtn = zoomGroupEl.createEl('button', {cls: Css.button.icon, title: 'Reset view'})
    zoomResetBtn.appendChild(sanitizeHTMLToDom(ManualSvg.resetZoom))
    if (showPanAndZoomButtonsInToolbar) {
      zoomInBtn = createIconButton(zoomGroupEl, 'zoom-in', 'Zoom in')
      panRightBtn = createIconButton(zoomGroupEl, 'chevron-right', 'Pan right')
    }
    const settingsBtn = createIconButton(zoomGroupEl, 'settings', 'Plugin settings')

    if (this.plugin.settings.showButtonsToHideGroups) {
      /* Create buttons to hide groups */
      const hideGroupEl = toolbar.createDiv({cls: 'gt-toolbar-hide-groups'})
      const groups = this.plugin.settings.groups
      for (const group of groups) {
        const subGroup = hideGroupEl.createDiv({cls: 'gt-toolbar-hide-group'})
        let isVisible: boolean = group?.visible ?? false
        const button = createIconButton(subGroup, isVisible ? 'eye' : 'eye-off', 'Click to toggle group visibility')
        subGroup.createDiv({text: group.id})
        button.addEventListener('click', () => {
          if (group) {
            isVisible = !isVisible
            group.visible = isVisible
            setIcon(button, isVisible ? 'eye' : 'eye-off')
            void this.plugin.saveSettings()
            refreshChartCallback()
          }
        })
      }
    }

    const chartContainer = mainWrapper.createDiv({cls: Css.chartContainer, attr: {height: '100%'}})

    /* Declare the renderEngine variable so the callback can reference its reference scope */
    let renderEngine: GanttRenderEngine | null = null
    let updateTimeout: number | null = null

    /* Register the child lifecycle component synchronously before ANY 'await' */
    ctx?.addChild(new GanttLifecycleComponent(el, this.plugin, refreshChartCallback))

    /* Perform data load in async way */
    this.plugin.calendarConfigsCache.clear()
    const data = await this.getGanttItems(pluginSettings, codeBlockContent)

    /* Instantiate the engine */
    renderEngine = new GanttRenderEngine(
      chartContainer,
      data,
      this.plugin,
      codeBlockContent,
      this.selectedFrontmatterProperties
    )

    reloadBtn.addEventListener('click', () => refreshChartCallback())

    toggleBars.addEventListener('click', () => {
      renderOptionsToggleState.toggleBars = !renderOptionsToggleState.toggleBars
      setIcon(toggleBars, renderOptionsToggleState.toggleBars ? 'chart-bar-big'  : 'customBarChartCrossed')
      renderEngine.toggleShowBars(renderOptionsToggleState.toggleBars)
                    })
    togglePoints.addEventListener('click', () => {
      renderOptionsToggleState.togglePoints = !renderOptionsToggleState.togglePoints
      setIcon(togglePoints, renderOptionsToggleState.togglePoints ? 'customScatterChart'  : 'customScatterChartCrossed')
      renderEngine.toggleShowPoints(renderOptionsToggleState.togglePoints)
                    })
    toggleGrouping.addEventListener('click', () => {
      renderOptionsToggleState.toggleGrouping = !renderOptionsToggleState.toggleGrouping
      setIcon(toggleGrouping, renderOptionsToggleState.toggleGrouping ? 'group'  : 'customGroupCrossed')
      renderEngine.toggleGrouping(renderOptionsToggleState.toggleGrouping)
    })

    panLeftBtn?.addEventListener('click', () => renderEngine.panLeft(step))
    zoomOutBtn?.addEventListener('click', () => renderEngine.zoomOut())
    zoomResetBtn.addEventListener('click', () => renderEngine.resetZoom())
    zoomInBtn?.addEventListener('click', () => renderEngine.zoomIn())
    panRightBtn?.addEventListener('click', () => renderEngine.panRight(step))

    settingsBtn.addEventListener('click', () => {
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
    )
  }
}

/* See https://lucide.dev for icons, */
function createIconButton(parentEl: HTMLElement, icon: string, title: string,): HTMLButtonElement {
  const btn = parentEl.createEl('button', {cls: Css.button.icon, title})
  setIcon(btn, icon)
  return btn
}

class GanttLifecycleComponent extends MarkdownRenderChild {
  private events: EventRef[] = []

  constructor(containerEl: HTMLElement,
              private readonly plugin: FantasyGanttPlugin,
              private readonly refreshChartCallback: () => void) {
    super(containerEl)
  }

  onload() {
    /* Register listeners with reference tracking */
    this.events.push(this.plugin.app.metadataCache.on('changed', this.refreshChartCallback))
    this.events.push(this.plugin.app.metadataCache.on('resolved', this.refreshChartCallback))
    addIcon("customBarChartCrossed", ManualSvg.barChartCrossed);
    addIcon("customScatterChart", ManualSvg.scatterChart);
    addIcon("customScatterChartCrossed", ManualSvg.scatterChartCrossed);
    addIcon("customGroupCrossed", ManualSvg.groupCrossed);
  }

  onunload() {
    /* Cleanly unbind listeners from the global event loop when code block is closed */
    this.events.forEach(eventRef => this.plugin.app.metadataCache.offref(eventRef))
    this.events = []
  }
}
