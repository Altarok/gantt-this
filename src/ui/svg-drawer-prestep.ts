import {EventRef, MarkdownPostProcessorContext, MarkdownRenderChild, Notice} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Css} from '../const/strings'
import {PluginSettings} from '../const/types'
import {GanttRenderEngine} from './svg-drawer'
import {getGanttDataFromFolder} from '../io/event-frontmatter-reader'

class GanttLifecycleComponent extends MarkdownRenderChild {
  private events: EventRef[] = []

  constructor(
    containerEl: HTMLElement,
    private tooltipEl: HTMLElement,
    private plugin: FantasyGanttPlugin,
    // private updateCallback: () => void
  ) {
    super(containerEl)
  }

  onload() {
    // Register listeners with reference tracking
    // this.events.push(this.plugin.app.metadataCache.on('changed', this.updateCallback))
    // this.events.push(this.plugin.app.metadataCache.on('resolved', this.updateCallback))
  }

  onunload() {
    // Remove the DOM tooltip element
    if (this.tooltipEl) {
      this.tooltipEl.remove()
    }
    // Cleanly unbind listeners from the global event loop when code block is closed
    this.events.forEach(eventRef => this.plugin.app.metadataCache.offref(eventRef))
    this.events = []
  }
}

export class GanttRender {
  constructor(readonly plugin: FantasyGanttPlugin) {
  }

  async renderGantt(el: HTMLElement, codeBlockContent: PluginSettings, ctx?: MarkdownPostProcessorContext) {
    const mainWrapper = el.createDiv({cls: Css.wrapper})
    const toolbar = mainWrapper.createDiv({cls: Css.toolbar})

    const createCheckbox = (label: string, id: string, checked = true) => {
      const lbl = toolbar.createEl('label', {cls: Css.inputLabel})
      const input = lbl.createEl('input', {attr: {type: 'checkbox', id}})
      input.checked = checked
      lbl.createEl('span', {text: ` ${label}`})
      return input
    }

    const toggleBars = createCheckbox('Show Bars', 'toggle-bars')
    const togglePoints = createCheckbox('Show Points', 'toggle-points')
    const toggleGrouping = createCheckbox('Enable Grouping', 'toggle-grouping')
    const resetBtn = toolbar.createEl('button', {text: 'Zoom Reset', cls: Css.btn})

    const chartContainer = mainWrapper.createDiv({cls: Css.chartContainer})
    const tooltip = window.document.body.createDiv({cls: Css.tooltip.tooltip, attr: {id: 'gantt-tooltip-element'}})

    const hoverTitle = tooltip.createDiv({cls: Css.tooltip.title})
    const hoverDates = tooltip.createDiv({cls: Css.tooltip.dates})
    tooltip.createDiv({text: 'Click to open active note file', cls: Css.tooltip.link})

    // 1. Declare the renderEngine variable so the callback can reference its reference scope
    let renderEngine: GanttRenderEngine | null = null

    let updateTimeout: number | null = null;

    // 2. Define the callback synchronously
    const updateCallback = () => {
      if (updateTimeout) {
        window.clearTimeout(updateTimeout);
      }

      // Debounce by 500ms to let Obsidian's internal indexing finish completely
      updateTimeout = window.setTimeout(() => {
        new Notice('Cache change detected. Re-rendering Gantt...');
        this.plugin.calendarConfigsCache.clear();
        getGanttDataFromFolder(this.plugin, codeBlockContent)
          .then(updatedData => {
            if (renderEngine) {
              renderEngine.updateData(updatedData);
            }
          })
          .catch(err => new Notice('Failed: ' + err));
      }, 500);

      // console.info('!')
      // this.plugin.calendarConfigsCache.clear()
      // getGanttDataFromFolder(this.plugin, codeBlockContent)
      // .then(updatedData => {
      //   if (renderEngine) renderEngine.updateData(updatedData)
      // })
      // .catch(err => console.error(err))
    }

    // 3. Register the child lifecycle component synchronously before ANY 'await'
    if (ctx) {
      ctx.addChild(new GanttLifecycleComponent(el, tooltip, this.plugin, updateCallback))
    }

    // 4. Perform your async data load
    this.plugin.calendarConfigsCache.clear()
    const data = await getGanttDataFromFolder(this.plugin, codeBlockContent)

    // 5. Instantiate the engine
    renderEngine = new GanttRenderEngine(
      chartContainer,
      data,
      tooltip,
      hoverTitle,
      hoverDates,
      this.plugin
    )

    toggleBars.addEventListener('change', () => renderEngine.toggleShowBars(toggleBars.checked))
    togglePoints.addEventListener('change', () => renderEngine.toggleShowPoints(togglePoints.checked))
    toggleGrouping.addEventListener('change', () => renderEngine.toggleGrouping(toggleGrouping.checked))
    resetBtn.addEventListener('click', () => renderEngine.resetZoom())
  }

}
