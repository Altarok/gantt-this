import {TFile} from 'obsidian'
import {GanttItem} from '../const/types'
import {parseFiles} from './event-frontmatter-reader'
import {getFilteredFiles} from './file-collector'
import {ChartContext} from '../model/chart-context'

export class ChartDataLoader {
  constructor(private readonly chartCtx: ChartContext) {
  }

  /**
   * Fetches and parses Gantt items from Bases query results or fallback file collections.
   */
  async getGanttItems(): Promise<GanttItem[]> {
    let files: TFile[]
    if (this.chartCtx.hasBasesContext) {
      files = this.chartCtx.getFilesFilteredByBase
    } else {
      files = getFilteredFiles(this.chartCtx)
    }

    const events = await parseFiles(files, this.chartCtx)

    this.chartCtx.diagnostics.contextFilesCount = files.length
    this.chartCtx.diagnostics.contextEventCount = events.length
    
    return events
  }
}
