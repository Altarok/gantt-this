import {
  CalendarConfig,
  CalendarIdentifier,
  GanttItem,
  GanttItemType, isCalendarIdentifier,
  PluginSettings
} from '../const/types'
import {getCalendarDefinition} from './calendar-frontmatter-reader'
import {Gregorian} from '../util/gregorian'
import FantasyGanttPlugin from '../main'
import {FrontMatterCache, TFile} from "obsidian";


/**
 * Search files and parse to GanttItem
 * @param plugin
 * @param partialPluginSettings partial plugin settings
 */
export async function getGanttDataFromFolder(
  plugin: FantasyGanttPlugin,
  partialPluginSettings: PluginSettings): Promise<GanttItem[]> {

  // debugger

  const items: GanttItem[] = []
  let incrementalId = 0

  const files: TFile[] = getFilteredFiles(plugin, partialPluginSettings)

  for (const file of files) {
    const cache = plugin.app.metadataCache.getFileCache(file)
    const frontMatter = cache?.frontmatter

    if (frontMatter?.['gantt-item'] !== true) continue

    const startInput = frontMatter['gantt-start'] as string
    const endInput = frontMatter['gantt-end'] as string

    if (startInput === undefined || startInput === null || startInput === '') continue

    const calendarTypeRaw: string = (frontMatter['gantt-type'] as string || plugin.settings.defaultType).trim()
    const calendarType: CalendarIdentifier = isCalendarIdentifier(calendarTypeRaw) ? calendarTypeRaw : plugin.settings.defaultType

    if (!calendarType || !plugin.settings.visibleCalendars[calendarType]) {
      // debugger
      continue
    }

    const config = await getCalendarDefinition(plugin, calendarType, partialPluginSettings)

    const ganttItem: GanttItem | null = createItem(plugin, startInput, endInput, calendarType, config, file, frontMatter, ++incrementalId)
    if (!ganttItem) continue

    items.push(ganttItem)
  }

  // debugger

  return items
}

function createItem(
  plugin: FantasyGanttPlugin,
  startInput: string,
  endInput: string,
  calendarType: CalendarIdentifier,
  config: CalendarConfig | null,
  file: TFile, frontMatter: FrontMatterCache, id: number): GanttItem | null {


  const startRes = Gregorian.parseToAbsoluteDays(startInput, config)
  if (!startRes) return null

  const endRes = endInput ? Gregorian.parseToAbsoluteDays(endInput, config) : startRes
  if (!endRes) return null

  const type: GanttItemType = (!endInput || startRes.days === endRes.days) ? 'point' : 'bar'
  const group = frontMatter['gantt-group'] as string || 'General'
  const color = getItemColor(frontMatter, plugin, group, calendarType)

  return {
    id,
    name: frontMatter['gantt-name'] as string || file.basename,
    startDateDisplay: startRes.display,
    endDateDisplay: endRes.display,
    startDays: startRes.days,
    endDays: endRes.days,
    group,
    type,
    calendarType,
    color,
    link: file.path
  }
}


function getFilteredFiles(plugin: FantasyGanttPlugin, partialPluginSettings: PluginSettings) {

  const allFiles = plugin.app.vault.getMarkdownFiles()
  const eventSourcePath = partialPluginSettings.eventPath === '/' ? '' : partialPluginSettings.eventPath

  return allFiles.filter(f => {
    const parentPath = f.parent?.path ?? ''

    if (partialPluginSettings.eventPathSearchRecursive) {
      return eventSourcePath === '' ||
        parentPath === eventSourcePath ||
        parentPath.startsWith(eventSourcePath + '/')
    }

    return parentPath === eventSourcePath
  })
}


/**
 * Returns event item color. In priority, if given, returns ..
 * * color read from file's frontmatter or ..
 * * color defined for event group or ..
 * * color
 * * global fallback color
 * @param frontMatter
 * @param plugin
 * @param group
 * @param calendarType
 */
function getItemColor(frontMatter: FrontMatterCache, plugin: FantasyGanttPlugin, group: string, calendarType: string) {
  return frontMatter['gantt-color'] as string ??
    plugin.settings.groupColors[group] ??
    plugin.settings.typeColors[calendarType] ??
    plugin.settings.fallbackColor
}
