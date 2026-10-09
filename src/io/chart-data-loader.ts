import {TFile} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GanttItem} from '../const/types'
import {parseFiles} from './event-frontmatter-reader'
import {getFilteredFiles} from './file-collector'
import BasesContext from '../model/bases-context'
import {EventPropertyReader} from './event-property-reader'
import {SettingsContext} from '../model/settings-context'

export class ChartDataLoader {
  constructor(private readonly plugin: FantasyGanttPlugin,
              private readonly eventPropertyReader: EventPropertyReader,
              private readonly settingsContext: SettingsContext,
              private readonly basesCtx?: BasesContext) {
  }

  /**
   * Fetches and parses Gantt items from Bases query results or fallback file collections.
   */
  async getGanttItems(): Promise<GanttItem[]> {
    let files: TFile[]
    if (this.basesCtx) {
      files = this.basesCtx.filterQueryResults(this.eventPropertyReader)
    } else {
      files = getFilteredFiles(this.plugin, this.eventPropertyReader, this.settingsContext)
    }
    return parseFiles(files, this.plugin, this.eventPropertyReader, this.settingsContext)
  }
}
