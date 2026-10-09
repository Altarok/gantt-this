import {EventRef, MarkdownRenderChild} from 'obsidian'
import FantasyGanttPlugin from '../main'

export class ChartLifecycleComponent extends MarkdownRenderChild {
  private events: EventRef[] = []

  constructor(containerEl: HTMLElement,
              private readonly plugin: FantasyGanttPlugin,
              private readonly refreshChartCallback: () => void) {
    super(containerEl)
  }

  onload() {
    this.events.push(this.plugin.app.metadataCache.on('changed', this.refreshChartCallback))
    this.events.push(this.plugin.app.metadataCache.on('resolved', this.refreshChartCallback))
  }

  onunload() {
    this.events.forEach(eventRef => this.plugin.app.metadataCache.offref(eventRef))
    this.events = []
  }
}
