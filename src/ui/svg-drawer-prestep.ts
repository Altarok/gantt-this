import {
  EventRef,
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
  Notice,
  sanitizeHTMLToDom,
  setIcon,
  Platform
} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {Css} from '../const/strings'
import {PluginSettings} from '../const/types'
import {GanttRenderEngine} from './svg-drawer'
import {getGanttDataFromFolder} from '../io/event-frontmatter-reader'
import {ManualSvg} from './manual-svg-util'

// Inside your toolbar event handler:
const step = Platform.isMobile ? 0.4 : 0.25;

class GanttLifecycleComponent extends MarkdownRenderChild {
  private events: EventRef[] = []

  constructor(
    containerEl: HTMLElement,
    private tooltipEl: HTMLElement,
    private plugin: FantasyGanttPlugin,
    /*
     * TODO unused
     */
    private updateCallback: () => void
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

/* See lucide.dev for icons, */
function createIconButton(parentEl: HTMLElement, icon: string, title: string,): HTMLButtonElement {
  const btn = parentEl.createEl("button", {cls: Css.button.icon, title})
  setIcon(btn, icon)
  return btn
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

    const reloadBtn = createIconButton(toolbar, 'refresh-cw', 'Reload data')
    const toggleBars = createCheckbox('Show Bars', 'toggle-bars')
    const togglePoints = createCheckbox('Show Points', 'toggle-points')
    const toggleGrouping = createCheckbox('Enable Grouping', 'toggle-grouping')


    const zoomGroupEl = toolbar.createEl("div", {cls: 'gt-toolbar-zoom-group'});

    const panLeftBtn = createIconButton(zoomGroupEl, 'chevron-left', 'Pan left')
    const zoomOutBtn = createIconButton(zoomGroupEl, 'zoom-out', 'Zoom out')
    const zoomResetBtn = zoomGroupEl.createEl('button', {cls: Css.button.icon, title: 'Reset zoom'})
    zoomResetBtn.appendChild(sanitizeHTMLToDom(ManualSvg.resetZoom))
    const zoomInBtn = createIconButton(zoomGroupEl, 'zoom-in', 'Zoom in')
    const panRightBtn = createIconButton(zoomGroupEl, 'chevron-right', 'Pan right')

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
        window.clearTimeout(updateTimeout)
      }

      // Debounce by 500ms to let Obsidian's internal indexing finish completely
      updateTimeout = window.setTimeout(() => {
        new Notice('Cache change detected. Re-rendering Gantt...')
        this.plugin.calendarConfigsCache.clear();
        getGanttDataFromFolder(this.plugin, codeBlockContent)
        .then(updatedData => {
          if (renderEngine) {
            renderEngine.updateData(updatedData)
          }
        })
        .catch(err => new Notice('Failed: ' + err))
      }, 500)
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

    reloadBtn.addEventListener("click",  () => updateCallback())

    toggleBars.addEventListener('change', () => renderEngine.toggleShowBars(toggleBars.checked))
    togglePoints.addEventListener('change', () => renderEngine.toggleShowPoints(togglePoints.checked))
    toggleGrouping.addEventListener('change', () => renderEngine.toggleGrouping(toggleGrouping.checked))

    panLeftBtn.addEventListener('click', () => renderEngine.panLeft(step))
    zoomOutBtn.addEventListener('click', () => renderEngine.zoomOut())
    zoomResetBtn.addEventListener('click', () => renderEngine.resetZoom())
    zoomInBtn.addEventListener('click', () => renderEngine.zoomIn())
    panRightBtn.addEventListener('click', () => renderEngine.panRight(step))
  }


  // async handleReload(updateCallback) {
  //   // 1. Show optional visual feedback (Obsidian Notice)
  //   new Notice("Reloading Gantt chart...")
  //
  //   try {
  //     // 2. Re-fetch or re-parse your data source
  //     const freshData = await this.plugin.loadGanttDataFromSource()
  //
  //     // 3. Push the fresh data into your existing engine instance
  //     renderEngine.updateData(freshData)
  //
  //     new Notice("Gantt chart reloaded successfully.")
  //   } catch (error) {
  //     console.error("Failed to reload Gantt chart data:", error)
  //     new Notice("Failed to reload Gantt chart. Check console.")
  //   }
  // }

}
