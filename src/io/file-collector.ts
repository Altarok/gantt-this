import {TFile} from 'obsidian'
import {getEventFiles} from './io-util'
import {ChartContext} from '../model/chart-context'


/**
 * Search and filter files, then parse to {@link GanttItem}s.
 * Call from outside Obsidian's Bases.
 * @param chartCtx
 */
export function getFilteredFiles(chartCtx: ChartContext): TFile[] {

  const allFiles = getEventFiles(chartCtx)

  const {frontMatterProperty_gantt_this_optional} = chartCtx.settings

  return allFiles.filter(f => {
    const cache = chartCtx.metadataCache.getFileCache(f)
    const frontMatter = cache?.frontmatter

    if (!frontMatter) return false

    return frontMatterProperty_gantt_this_optional || chartCtx.propertyReader.isFileMarkedAsEvent(frontMatter, f)
  })
}
