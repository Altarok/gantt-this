import {CalendarConfig, GanttItem, GanttItemDisplayType, GroupOrCalendarSettings, PluginSettings} from '../const/types'
import {getCalendarDefinition} from './calendar-frontmatter-reader'
import {Dates} from '../util/dates'
import FantasyGanttPlugin from '../main'
import {FrontMatterCache, TFile} from 'obsidian'
import {Colors} from "../const/strings";
import {FrontMatterUtil} from "./frontmatter-reader";


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

  const mappedCalendarConfigs: Record<string, GroupOrCalendarSettings> = Object.fromEntries(
    plugin.settings.calendars.map((c) => [c.id, c])
  )

  for (const file of files) {
    const cache = plugin.app.metadataCache.getFileCache(file)
    const frontMatter = cache?.frontmatter

    if (!frontMatter) continue
    if (!FrontMatterUtil.isFileRelevant(frontMatter, plugin.settings)) continue

    const {startDate, endDate} = FrontMatterUtil.getEventTimestamps(frontMatter, plugin.settings)

    if (startDate === undefined || startDate === null || startDate === '') continue

    const calendarId: string = FrontMatterUtil.getEventCalendarName(frontMatter, plugin.settings)

    if (!calendarId || !mappedCalendarConfigs[calendarId]?.visible) continue

    const config = await getCalendarDefinition(plugin, calendarId, partialPluginSettings)

    const ganttItem: GanttItem | null = createItem(plugin, startDate, endDate ?? startDate, calendarId, config, file, frontMatter, ++incrementalId)
    if (!ganttItem) continue

    items.push(ganttItem)
  }

  return items
}

function createItem(
  plugin: FantasyGanttPlugin,
  startDate: string,
  endDate: string,
  /** Calendar to use for event */
  calendarId: string,
  config: CalendarConfig | null,
  file: TFile, frontMatter: FrontMatterCache, id: number): GanttItem | null {

  const startRes = Dates.parseToAbsoluteDays(startDate, config)
  if (!startRes) return null

  const endRes = endDate ? Dates.parseToAbsoluteDays(endDate, config) : startRes
  if (!endRes) return null

  const isTimeSpan: boolean = !!endDate && startRes.days < endRes.days

  let displayType: GanttItemDisplayType = FrontMatterUtil.getEventSymbol(frontMatter, plugin.settings, isTimeSpan)

  const group = FrontMatterUtil.getEventGroup(frontMatter, plugin.settings)
  const color = getItemColor(frontMatter, plugin.settings, group, calendarId)

  return /* GanttItem */ {
    id,
    name: FrontMatterUtil.getEventName(frontMatter, plugin.settings) ?? file.basename,
    startDateDisplay: startRes.display,
    endDateDisplay: endRes.display,
    startDays: startRes.days,
    endDays: endRes.days,
    group: group,
    displayType,
    displayIcon: FrontMatterUtil.getEventIconID(frontMatter, plugin.settings),
    displayIconColor: FrontMatterUtil.getEventIconColor(frontMatter, plugin.settings),
    calendarType: calendarId,
    color,
    link: file.path + FrontMatterUtil.getHeaderToLinkTo(frontMatter, plugin.settings)
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

  let clr = FrontMatterUtil.getEventColor(frontMatter, settings) ??
    settings.groups.filter((value) => value.id === group)?.[0]?.color ??
    settings.calendars.filter((value) => value.id === calendar)?.[0]?.color ??
    settings.fallbackColor

  if (!clr.startsWith('#') && clr in Object.keys(Colors)) {
    clr = Colors[clr] ?? settings.fallbackColor
  }

  return clr
}
