import {
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
import {Css, EventIDs} from '../const/constants'
import {CodeBlockContent, GanttItem, PluginSettings} from '../const/types'
import {GanttRenderEngine} from './svg-drawer'
import {getGanttDataFromFolder, parseFiles} from '../io/event-frontmatter-reader'
import {ManualSvg} from './manual-svg-icons'

const step = Platform.isMobile ? 0.4 : 0.25

export class GanttRender {
  constructor(readonly plugin: FantasyGanttPlugin,
              readonly filesFilteredByBase: TFile[] | null,
              readonly selectedFrontmatterProperties: string[] | null) {
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

    const createCheckbox = (label: string, id: string, checked = true) => {
      const lbl = toolbar.createEl('label', {cls: Css.inputLabel})
      const input = lbl.createEl('input', {attr: {type: 'checkbox', id}})
      input.checked = checked
      lbl.createSpan({text: ` ${label}`})
      return input
    }

    /* Define the callback synchronously */
    const refreshChartCallback = () => {
      if (!renderEngine) return

      if (updateTimeout) {
        window.clearTimeout(updateTimeout)
      }

      this.plugin.calendarConfigsCache.clear()

      if (this.filesFilteredByBase !== null) {
        parseFiles(this.plugin, pluginSettings, codeBlockContent, this.filesFilteredByBase)
        .then(updatedData => {
          if (renderEngine) renderEngine.updateData(updatedData)
        })
        .catch(err => new Notice('Failed: ' + err))
        return
      }


      /* Debounce by 500ms to let Obsidian's internal indexing finish completely */
      updateTimeout = window.setTimeout(() => {
        new Notice('Re-rendering Gantt...')
        getGanttDataFromFolder(this.plugin, pluginSettings, codeBlockContent)
        .then(updatedData => {
          if (renderEngine) renderEngine.updateData(updatedData)
        })
        .catch(err => new Notice('Failed: ' + err))
      }, 500)
    }

    const reloadBtn = createIconButton(toolbar, 'refresh-cw', 'Reload data')
    const toggleBars = createCheckbox('Show Bars', 'toggle-bars')
    const togglePoints = createCheckbox('Show Points', 'toggle-points')
    const toggleGrouping = createCheckbox('Enable Grouping', 'toggle-grouping')

    /* Create 6 pan, zoom, settings buttons */
    const zoomGroupEl = toolbar.createDiv({cls: 'gt-toolbar-zoom-group'})

    const panLeftBtn = createIconButton(zoomGroupEl, 'chevron-left', 'Pan left')
    const zoomOutBtn = createIconButton(zoomGroupEl, 'zoom-out', 'Zoom out')
    const zoomResetBtn = zoomGroupEl.createEl('button', {cls: Css.button.icon, title: 'Reset zoom'}) // manual svg icon
    zoomResetBtn.appendChild(sanitizeHTMLToDom(ManualSvg.resetZoom))
    const zoomInBtn = createIconButton(zoomGroupEl, 'zoom-in', 'Zoom in')
    const panRightBtn = createIconButton(zoomGroupEl, 'chevron-right', 'Pan right')
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
    const tooltip = window.document.body.createDiv({cls: Css.tooltip.tooltip, attr: {id: EventIDs.tooltip}})

    const hoverTitle = tooltip.createDiv({cls: Css.tooltip.title})
    const hoverDates = tooltip.createDiv({cls: Css.tooltip.dates})
    tooltip.createDiv({text: 'Click to open active note file', cls: Css.tooltip.link})

    /* Declare the renderEngine variable so the callback can reference its reference scope */
    let renderEngine: GanttRenderEngine | null = null
    let updateTimeout: number | null = null


    /* Register the child lifecycle component synchronously before ANY 'await' */
    ctx?.addChild(new GanttLifecycleComponent(el, tooltip, this.plugin))

    /* Perform data load in async way */
    this.plugin.calendarConfigsCache.clear()
    const data = await this.getGanttItems(pluginSettings, codeBlockContent)

    /* Instantiate the engine */
    renderEngine = new GanttRenderEngine(
      chartContainer,
      data,
      tooltip,
      hoverTitle,
      hoverDates,
      this.plugin,
      codeBlockContent,
      this.selectedFrontmatterProperties
    )

    reloadBtn.addEventListener('click', () => refreshChartCallback())

    toggleBars.addEventListener('change', () => renderEngine.toggleShowBars(toggleBars.checked))
    togglePoints.addEventListener('change', () => renderEngine.toggleShowPoints(togglePoints.checked))
    toggleGrouping.addEventListener('change', () => renderEngine.toggleGrouping(toggleGrouping.checked))

    panLeftBtn.addEventListener('click', () => renderEngine.panLeft(step))
    zoomOutBtn.addEventListener('click', () => renderEngine.zoomOut())
    zoomResetBtn.addEventListener('click', () => renderEngine.resetZoom())
    zoomInBtn.addEventListener('click', () => renderEngine.zoomIn())
    panRightBtn.addEventListener('click', () => renderEngine.panRight(step))

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
              private tooltipEl: HTMLElement,
              private plugin: FantasyGanttPlugin) {
    super(containerEl)
  }

  onload() {
    /* Register listeners with reference tracking */
    // this.events.push(this.plugin.app.metadataCache.on('changed', this.refreshChartCallback))
    // this.events.push(this.plugin.app.metadataCache.on('resolved', this.refreshChartCallback))
  }

  onunload() {
    /* Remove the DOM tooltip element */
    if (this.tooltipEl) {
      this.tooltipEl.remove()
    }
    /* Cleanly unbind listeners from the global event loop when code block is closed */
    this.events.forEach(eventRef => this.plugin.app.metadataCache.offref(eventRef))
    this.events = []
  }
}
