import {TFile} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {EventPropertyReader} from './event-property-reader'
import {getEventFiles} from './io-util'
import {GanttChartSources} from '../const/types'


/**
 * Search and filter files, then parse to {@link GanttItem}s.
 * Call from outside Obsidian's Bases.
 * @param plugin
 * @param eventPropertyReader
 * @param settingsContext
 */
export function getFilteredFiles(plugin: FantasyGanttPlugin,
                                 eventPropertyReader: EventPropertyReader,
                                 settingsContext: GanttChartSources): TFile[] {

  const allFiles = getEventFiles(plugin, settingsContext)

  const {frontMatterProperty_gantt_this_optional} = plugin.settings

  return allFiles.filter(f => {
    const cache = plugin.app.metadataCache.getFileCache(f)
    const frontMatter = cache?.frontmatter

    if (!frontMatter) return false

    return frontMatterProperty_gantt_this_optional || eventPropertyReader.isFileMarkedAsEvent(frontMatter, f)
  })
}
