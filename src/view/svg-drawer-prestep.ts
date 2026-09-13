import {EventRef, MarkdownPostProcessorContext, MarkdownRenderChild, Notice, Platform, TFile} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Css} from '../const/constants'
import {CodeBlockContent, GanttItem, PluginSettings} from '../const/types'
import {GanttRenderEngine} from './svg-drawer'
import {getGanttDataFromFolder, parseFiles} from '../io/event-frontmatter-reader'
import {ToolbarView} from './toolbar-view'
import {setToolbarReactions} from './toolbar-controller'

export default class GanttRender {
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

    /* Define the callback synchronously TODO move to toolbar view*/
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

    const mainWrapper = el.createDiv({cls: Css.wrapper})
    const toolbar = mainWrapper.createDiv({cls: Css.toolbar})
    const chartContainer = mainWrapper.createDiv({cls: Css.chartContainer, attr: {height: '100%'}})

    const tv = new ToolbarView(toolbar, this.plugin, refreshChartCallback)

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

    setToolbarReactions(tv,renderEngine,refreshChartCallback )

  }
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
  }

  onunload() {
    /* Cleanly unbind listeners from the global event loop when code block is closed */
    this.events.forEach(eventRef => this.plugin.app.metadataCache.offref(eventRef))
    this.events = []
  }
}
