import {EventRef, MarkdownRenderChild} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {RedrawOption} from '../model/redraw-options'

export class ChartLifecycleComponent extends MarkdownRenderChild {
  private events: EventRef[] = []

  constructor(containerEl: HTMLElement,
              private readonly plugin: FantasyGanttPlugin,
              private readonly refreshChartCallback: (r: RedrawOption) => Promise<void>) {
    super(containerEl)
  }

  onload() {
    this.events.push(this.plugin.app.metadataCache.on('changed', () => this.refreshChartCallback(RedrawOption.DataReload)))
    this.events.push(this.plugin.app.metadataCache.on('resolved', () => this.refreshChartCallback(RedrawOption.DataReload)))
  }

  onunload() {
    this.events.forEach(eventRef => this.plugin.app.metadataCache.offref(eventRef))
    this.events = []
  }
}
