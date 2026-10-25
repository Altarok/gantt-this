import {BasesView, Notice, QueryController} from 'obsidian'
import {ChartManager} from './ctrl/gantt-chart-manager'
import {BaseKeys, RawChartInput} from './types/settings-types'
import FantasyGanttPlugin from './main'
import BasesContext from './model/bases-context'
import {debug} from './util/debug'

/*
 * WNM-#v2: change to 'gantt-this-view'
 * Sadly, this is a breaking change for users!
 * They'd have to manually change the base file.
 */
export const GanttBaseViewExampleName = 'example-view'

export class GanttThisBasesView extends BasesView {
  readonly type = GanttBaseViewExampleName
  private readonly containerEl: HTMLElement
  private readonly basesCtx: BasesContext
  private chartManager?: ChartManager = undefined
  private lastRawChartInput?: RawChartInput

  constructor(readonly plugin: FantasyGanttPlugin,
              readonly controller: QueryController,
              parentEl: HTMLElement) {
    super(controller)
    this.containerEl = parentEl.createDiv('bases-example-view-container')
    this.basesCtx = new BasesContext(this.plugin, this)
  }


  public onDataUpdated(): void {

    debug.log('>> onDataUpdated')

    const rawChartInput = this.createRawChartInput()
    const isNewRawChartInput = this.isNewRawChartInput(rawChartInput)
    this.lastRawChartInput = rawChartInput

    if (!this.chartManager) {
      debug.log('-- onDataUpdated - redraw: complete')
      this.completeRedraw(rawChartInput)
    } else if (isNewRawChartInput) {
      debug.log('-- onDataUpdated - redraw: new base config')
      this.completeRedraw(rawChartInput)
    } else {
      debug.log('-- onDataUpdated - redraw: if query results changed')
      this.chartManager?.reset()
      void this.chartManager?.updateAfterReload()
    }

    debug.log('<< onDataUpdated')
  }

  private completeRedraw(rawChartInput: RawChartInput) {
    this.containerEl.empty()
    this.chartManager?.reset()
    this.chartManager = new ChartManager(this.plugin, this.containerEl, rawChartInput, this.basesCtx)
    try {
      void this.chartManager.renderGantt()
    } catch {
      new Notice('Failed to render Gantt chart base!')
    }
  }

  /** Omit event path stuff - use base filters instead! */
  private createRawChartInput(): RawChartInput {
    return {
      calendarPath: this.calendarPath,
      calendarPathSearchRecursive: this.calendarPathSearchRecursive,
      lowerBoundDate: this.lowerBoundDate,
      upperBoundDate: this.upperBoundDate,
      calendar: this.calendarForBounds
    }
  }

  private isNewRawChartInput(currRawChartInput: RawChartInput): boolean {
    if (!this.lastRawChartInput) return true

    const last = this.lastRawChartInput
    const curr = currRawChartInput

    return last.calendarPath !== curr.calendarPath
      || last.calendarPathSearchRecursive !== curr.calendarPathSearchRecursive
      || last.lowerBoundDate !== curr.lowerBoundDate
      || last.upperBoundDate !== curr.upperBoundDate
      || last.calendar !== curr.calendar
  }

  private get calendarPath(): string {
    return this.getStringValue(BaseKeys.calPath) ?? this.plugin.settings.calendarPath
  }

  private get calendarPathSearchRecursive(): boolean {
    return this.getBoolValue(BaseKeys.calPathRec) ?? this.plugin.settings.calendarPathSearchRecursive
  }

  private get lowerBoundDate(): string | undefined {
    return this.getStringValue(BaseKeys.lbd)
  }

  private get upperBoundDate(): string | undefined {
    return this.getStringValue(BaseKeys.ubd)
  }

  private get calendarForBounds(): string | undefined {
    return this.getStringValue(BaseKeys.cal)
  }

  private getStringValue(key: string): string | undefined {
    return this.config.get(key) ? String(this.config.get(key)) : undefined
  }

  private getBoolValue(key: string): boolean | undefined {
    return this.config.get(key) ? this.config.get(key) === true : undefined
  }

}
