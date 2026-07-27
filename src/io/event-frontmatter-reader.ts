import {
  CalendarConfig,
  GanttItem,
  GanttItemDisplayType,
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

    const calendarId: string = (frontMatter['gantt-type'] as string || plugin.settings.defaultCalendar).trim().toLowerCase()

    if (!calendarId || !plugin.settings.calendars[calendarId]?.visible) {
      continue
    }

    const config = await getCalendarDefinition(plugin, calendarId, partialPluginSettings)

    const ganttItem: GanttItem | null = createItem(plugin, startInput, endInput, calendarId, config, file, frontMatter, ++incrementalId)
    if (!ganttItem) continue

    items.push(ganttItem)
  }

  return items
}

function createItem(
  plugin: FantasyGanttPlugin,
  startInput: string,
  endInput: string,
  /** Calendar to use for event */
  calendarId: string,
  config: CalendarConfig | null,
  file: TFile, frontMatter: FrontMatterCache, id: number): GanttItem | null {


  const startRes = Gregorian.parseToAbsoluteDays(startInput, config)
  if (!startRes) return null

  const endRes = endInput ? Gregorian.parseToAbsoluteDays(endInput, config) : startRes
  if (!endRes) return null

  const displayType: GanttItemDisplayType = (!endInput || startRes.days === endRes.days) ? 'point' : 'bar'
  const group = (frontMatter['gantt-group'] as string || 'general').toLowerCase()
  const color = getItemColor(frontMatter, plugin.settings, group, calendarId)

  return {
    id,
    name: frontMatter['gantt-name'] as string || file.basename,
    startDateDisplay: startRes.display,
    endDateDisplay: endRes.display,
    startDays: startRes.days,
    endDays: endRes.days,
    group: group,
    displayType,
    calendarType: calendarId,
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
 * Returns event item color. In priority, if given, returns ...
 * * color read from file's FrontMatter or ...
 * * color defined for event group or ...
 * * color
 * * global fallback color
 * @param frontMatter
 * @param settings this plugin's settings
 * @param group name of group, e.g. 'historic'
 * @param calendar name of calendar, e.g. 'mayan'
 */
function getItemColor(frontMatter: FrontMatterCache, settings: PluginSettings, group: string, calendar: string) {

  return frontMatter['gantt-color'] as string ??
    settings.groups[group]?.color ??
    settings.calendars[calendar]?.color ??
    settings.fallbackColor
}
