import { Css } from 'const/strings'
import {GanttItem, PluginSettingsAlreadyUsedInCode} from '../types'
import {MarkdownPostProcessorContext, MarkdownRenderChild} from 'obsidian'
import {GanttRenderEngine} from '../svg-drawer'
import FantasyGanttPlugin from '../main'

class GanttTooltipComponent extends MarkdownRenderChild {
  constructor(containerEl: HTMLElement, private tooltipEl: HTMLElement) {
    super(containerEl)
  }

  onunload() {
    if (this.tooltipEl) this.tooltipEl.remove()
  }
}

export class GanttRender {
  constructor(readonly plugin: FantasyGanttPlugin) {  }

  async renderGantt(el: HTMLElement, codeBlockContent: PluginSettingsAlreadyUsedInCode, ctx?: MarkdownPostProcessorContext) {
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

    ctx?.addChild(new GanttTooltipComponent(el, tooltip))

    const hoverTitle = tooltip.createDiv({cls: Css.tooltip.title})
    const hoverDates = tooltip.createDiv({cls: Css.tooltip.dates})
    tooltip.createDiv({text: 'Click to open active note file', cls: Css.tooltip.link})

    this.plugin.calendarConfigsCache.clear() // Wipe cache to handle real-time modifications
    const data = await this.getGanttDataFromFolder(codeBlockContent)

    const renderEngine = new GanttRenderEngine(
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

    const updateCallback = async () => {
      this.plugin.calendarConfigsCache.clear()
      const updatedData = await this.getGanttDataFromFolder(codeBlockContent)
      renderEngine.updateData(updatedData)
    }

    this.plugin.registerEvent(this.plugin.app.metadataCache.on('changed', updateCallback))
    this.plugin.registerEvent(this.plugin.app.metadataCache.on('resolved', updateCallback))
  }


  private async   getGanttDataFromFolder(codeBlockContent: PluginSettingsAlreadyUsedInCode): Promise<GanttItem[]> {
    const items: GanttItem[] = []
    let incrementalId = 1
    const files = this.plugin.app.vault.getMarkdownFiles()

    const targetFiles = files.filter(f => {
      if (!f.parent) return false
      if (codeBlockContent.eventPath === '/') return true
      return f.parent.path === codeBlockContent.eventPath
    })

    for (const file of targetFiles) {
      const cache = this.plugin.app.metadataCache.getFileCache(file)
      const frontMatter = cache?.frontmatter

      if (frontMatter?.['gantt-item'] === true) {
        const startInput = frontMatter['gantt-start'] as string
        const endInput = frontMatter['gantt-end'] as string

        if (startInput === undefined || startInput === null || startInput === '') continue

        const calendarType = (frontMatter['gantt-type'] as string || this.plugin.settings.defaultType).trim()
        if (!this.plugin.settings.visibleCalendars[calendarType]) continue

        const config = await this.plugin.getCalendarDefinition(calendarType, codeBlockContent.calendarPath)

        const startRes = this.plugin.parseToAbsoluteDays(startInput, config)
        if (!startRes) continue

        const endRes = endInput ? this.plugin.parseToAbsoluteDays(endInput, config) : startRes
        if (!endRes) continue

        const calculatedType = (!endInput || startRes.days === endRes.days) ? 'point' : 'bar'
        const itemGroup = frontMatter['gantt-group'] as string || 'General'

        const finalColor = frontMatter['gantt-color'] as string ??
          this.plugin.settings.groupColors[itemGroup] ??
          this.plugin.settings.typeColors[calendarType] ??
          this.plugin.settings.fallbackColor

        items.push({
          id: incrementalId++,
          name: frontMatter['gantt-name'] as string || file.basename,
          startDateDisplay: startRes.display,
          endDateDisplay: endRes.display,
          startDays: startRes.days,
          endDays: endRes.days,
          group: itemGroup,
          type: calculatedType,
          calendarType,
          color: finalColor,
          link: file.path
        })
      }
    }

    return items
  }


}
