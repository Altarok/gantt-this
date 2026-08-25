import {
  CalendarConfig,
  CodeBlockContent,
  GanttItem,
  GanttItemDisplayType,
  GroupOrCalendarSettings,
  ParsedDate,
  PluginSettings
} from '../const/types'
import {getCalendarDefinition} from './calendar-frontmatter-reader'
import FantasyGanttPlugin from '../main'
import {FrontMatterCache, Notice, TFile} from 'obsidian'
import {Colors} from '../const/constants'
import {FrontMatterUtil} from './frontmatter-reader'
import {parseEventDate} from '../date-calculations/event-date-input-calc'
import {createAxisDateDescription} from '../util/dates'
import {getFilteredFiles} from './file-collector'
import {Experimental} from "./experimental-algorithms";

/**
 * Search and filter files, then parse to {@link GanttItem}s.
 * Call from outside Obsidian's Bases.
 * @param plugin
 * @param partialPluginSettings partial plugin settings
 * @param codeBlockContent user input in Markdown block
 */
export async function getGanttDataFromFolder(plugin: FantasyGanttPlugin,
                                             partialPluginSettings: PluginSettings,
                                             codeBlockContent: CodeBlockContent): Promise<GanttItem[]> {

  const files: TFile[] = getFilteredFiles(plugin, partialPluginSettings, codeBlockContent)
  return parseFiles(plugin, partialPluginSettings, codeBlockContent, files)
}

/**
 * Parse given files to {@link GanttItem}s.
 * Call from outside Obsidian's Bases.
 */
export async function parseFiles(plugin: FantasyGanttPlugin,
                                 partialPluginSettings: PluginSettings,
                                 codeBlockContent: CodeBlockContent, files: TFile[]): Promise<GanttItem[]> {
  const items: GanttItem[] = []
  let incrementalId = 0

  const mappedCalendarConfigs: Record<string, GroupOrCalendarSettings> = Object.fromEntries(
    plugin.settings.calendars.map((c) => [c.id, c])
  )

  for (const file of files) {
    const cache = plugin.app.metadataCache.getFileCache(file)
    const frontMatter = cache?.frontmatter

    if (!frontMatter) continue

    let {startDate, endDate} = FrontMatterUtil.getEventTimestamps(frontMatter, plugin.settings)

    if (startDate === undefined || startDate === null || startDate === '') {
      if ( plugin.settings.useFilenameAsFallbackStartDate) startDate = file.basename
      else continue
    }

    const calendarId: string = FrontMatterUtil.getEventCalendarName(frontMatter, plugin.settings)

    if (!calendarId || !mappedCalendarConfigs[calendarId]?.visible) continue

    const config = await getCalendarDefinition(plugin, calendarId, partialPluginSettings, codeBlockContent)

    const ganttItem: GanttItem | null = createItem(plugin, startDate, endDate ?? startDate, calendarId, config, file, frontMatter, ++incrementalId)
    if (!ganttItem) continue
    items.push(ganttItem)
  }

  parseCodeBlockContent(plugin, codeBlockContent)

  Experimental.findPredecessorsAndSuccessors(items)

  return items
}

function parseCodeBlockContent(plugin: FantasyGanttPlugin, codeBlockContent?: CodeBlockContent) {

  if (!codeBlockContent) return
  const calendarConfig = plugin.calendarConfigsCache.get(codeBlockContent.calendar ?? 'gregorian')
  if (!calendarConfig) return

  if (codeBlockContent.lowerBoundDate) codeBlockContent.lowerBoundDateParsed = parseCodeBlockDate(codeBlockContent.lowerBoundDate, calendarConfig)
  if (codeBlockContent.centerHereDate) codeBlockContent.centerHereDateParsed = parseCodeBlockDate(codeBlockContent.centerHereDate, calendarConfig)
  if (codeBlockContent.upperBoundDate) codeBlockContent.upperBoundDateParsed = parseCodeBlockDate(codeBlockContent.upperBoundDate, calendarConfig)
}

function parseCodeBlockDate(date: string | number, calendarConfig: CalendarConfig): ParsedDate | undefined {

  if (typeof date === 'string')
    return parseEventDate(date, calendarConfig) ?? undefined
  else
    return {days: date, display: createAxisDateDescription(date, calendarConfig)}
}

function createItem(plugin: FantasyGanttPlugin,
                    startDate: string,
                    endDate: string,
                    /** Calendar to use for event */
                    calendarId: string,
                    config: CalendarConfig | null,
                    file: TFile,
                    frontMatter: FrontMatterCache,
                    id: number): GanttItem | null {

  let startRes: ParsedDate | null = null
  let endRes: ParsedDate | null = null

  try {
    startRes = parseEventDate(startDate, config)
  } catch {
    new Notice(`Failed to parse event date: ${startDate} in file ${file.name}`)
  }

  try {
    endRes = endDate ? parseEventDate(endDate, config) : startRes
  } catch {
    new Notice(`Failed to parse event date: ${endDate} in file ${file.name}`)
  }

  if (!startRes) return null
  if (!endRes) return null

  const isTimeSpan: boolean = !!endDate && startRes.days < endRes.days

  let displayType: GanttItemDisplayType = FrontMatterUtil.getEventSymbol(frontMatter, plugin.settings, isTimeSpan)

  const group = FrontMatterUtil.getEventGroup(frontMatter, plugin.settings)
  const color = getItemColor(frontMatter, plugin.settings, group, calendarId)

  return {
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
    link: file.path + FrontMatterUtil.getHeaderToLinkTo(frontMatter, plugin.settings),
    frontMatter,
    file,
    _predecessors: [], _successors: []
  } // as GanttItem
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
