import {
  CalendarConfig,
  CodeBlockContent,
  EventId,
  GanttItem,
  GanttItemDisplayType,
  GroupOrCalendarSettings,
  ParsedDate,
  PluginSettings
} from '../const/types'
import {getCalendarDefinition} from './calendar-reader'
import FantasyGanttPlugin from '../main'
import {FrontMatterCache, Notice, TFile} from 'obsidian'
import {EventPropertyReader} from './event-property-reader'
import {parseEventDate} from '../date-calculations/event-date-input-calc'
import {createAxisDateDescription} from '../date-calculations/dates'
import {getFilteredFiles} from './file-collector'
import {findPredecessorsAndSuccessors} from './event-hierarchy-analysis'

/**
 * Search and filter files, then parse to {@link GanttItem}s.
 * Call from outside Obsidian's Bases.
 * @param plugin
 * @param eventPropertyReader
 * @param partialPluginSettings partial plugin settings
 * @param codeBlockContent user input in Markdown block
 */
export async function getGanttDataFromFolder(plugin: FantasyGanttPlugin,
                                             eventPropertyReader: EventPropertyReader,
                                             partialPluginSettings: PluginSettings,
                                             codeBlockContent: CodeBlockContent): Promise<GanttItem[]> {

  const files: TFile[] = getFilteredFiles(plugin, eventPropertyReader, partialPluginSettings, codeBlockContent)
  return parseFiles(plugin, partialPluginSettings, codeBlockContent, files, eventPropertyReader)
}

/**
 * Parse given files to {@link GanttItem}s.
 * Call from outside Obsidian's Bases.
 */
export async function parseFiles(plugin: FantasyGanttPlugin,
                                 partialPluginSettings: PluginSettings,
                                 codeBlockContent: CodeBlockContent,
                                 files: TFile[],
                                 eventPropertyReader: EventPropertyReader): Promise<GanttItem[]> {
  const items: GanttItem[] = []
  let incrementalId = 0

  const mappedCalendarConfigs: Record<string, GroupOrCalendarSettings>
    = Object.fromEntries(plugin.settings.calendars.map((c) => [c.id, c]))

  for (const file of files) {
    const cache = plugin.app.metadataCache.getFileCache(file)
    const frontMatter = cache?.frontmatter

    if (!frontMatter) continue

    let {startDate, endDate} = eventPropertyReader.getEventTimestamps(frontMatter, file)

    if (startDate === undefined || startDate === null || startDate === '') {
      if (plugin.settings.useFilenameAsFallbackStartDate) startDate = file.basename
      else continue
    }

    const calendarId: string = eventPropertyReader.getEventCalendarName(frontMatter, file)

    if (!calendarId || !mappedCalendarConfigs[calendarId]?.visible) continue

    const calendarConfig = await getCalendarDefinition(plugin, eventPropertyReader, calendarId, partialPluginSettings, codeBlockContent)

    const ganttItem: GanttItem | null = createItem(plugin, eventPropertyReader, startDate, endDate, calendarId, calendarConfig, file, frontMatter, `${++incrementalId}`)
    if (!ganttItem) continue
    items.push(ganttItem)
  }

  parseCodeBlockContent(plugin, codeBlockContent)

  if (plugin.settings.uxHighlightRelatedEvents) findPredecessorsAndSuccessors(items, eventPropertyReader)

  return items
}

function parseCodeBlockContent(plugin: FantasyGanttPlugin, codeBlockContent?: CodeBlockContent) {

  if (!codeBlockContent) return
  const calendarConfig = plugin.calendarConfigsCache.get(codeBlockContent.calendar ?? plugin.settings.defaultCalendar)
  if (!calendarConfig) return

  if (codeBlockContent.lowerBoundDate) codeBlockContent.lowerBoundDateParsed = parseCodeBlockDate(codeBlockContent.lowerBoundDate, calendarConfig)
  if (codeBlockContent.centerHereDate) codeBlockContent.centerHereDateParsed = parseCodeBlockDate(codeBlockContent.centerHereDate, calendarConfig)
  if (codeBlockContent.upperBoundDate) codeBlockContent.upperBoundDateParsed = parseCodeBlockDate(codeBlockContent.upperBoundDate, calendarConfig)
}

function parseCodeBlockDate(date: string | number, calendarConfig: CalendarConfig): ParsedDate | undefined {

  if (typeof date === 'string')
    return parseEventDate(false, false /* not important in this case */, date, calendarConfig) ?? undefined
  else
    return {days: date, display: createAxisDateDescription(date, calendarConfig)}
}

function createItem(plugin: FantasyGanttPlugin,
                    eventPropertyReader: EventPropertyReader,
                    startDate: string,
                    endDate: string | undefined,
                    /** Calendar to use for event */
                    calendarId: string,
                    calendarConfig: CalendarConfig | null,
                    file: TFile,
                    frontMatter: FrontMatterCache,
                    id: EventId): GanttItem | null {

  let startRes: ParsedDate | null = null
  let endRes: ParsedDate | null = null

  try {
    startRes = parseEventDate(true, true, startDate, calendarConfig)
  } catch {
    new Notice(`Failed to parse event date: ${startDate} in file ${file.name}`)
  }

  if (!startRes) return null

  try {
    endRes = endDate ? parseEventDate(true, false, endDate, calendarConfig) :
      {days: startRes.days, display: startRes.display} // ParsedDate
  } catch {
    new Notice(`Failed to parse event date: ${endDate} in file ${file.name}`)
  }

  if (!endRes) return null

  const isTimeSpan: boolean = !!endDate && startRes.days < endRes.days

  let displayType: GanttItemDisplayType = eventPropertyReader.getEventSymbol(frontMatter, file, isTimeSpan)

  const group = eventPropertyReader.getEventGroup(frontMatter, file)
  const color = eventPropertyReader.getEventColor(frontMatter, file, group, calendarId)

  const item: GanttItem = {
    id: id,
    name: eventPropertyReader.getEventName(frontMatter, file),
    startDateDisplay: startRes.display,
    endDateDisplay: endRes.display,
    startDays: startRes.days,
    endDays: endRes.days,
    group: group,
    displayType,
    displayIcon: eventPropertyReader.getEventIconID(frontMatter, file),
    displayIconColor: eventPropertyReader.getEventIconColor(frontMatter, file),
    calendarType: calendarId,
    color,
    link: file.path + eventPropertyReader.getHeaderToLinkTo(frontMatter, file),
    frontMatter,
    file,
    predecessors: [],
    successors: [],
  }

  if (endDate && endRes.repeatRule) {
    item.repeatRule = endRes.repeatRule
  } else if (startRes.repeatRule) {
    item.repeatRule = startRes.repeatRule
  }

  delete endRes.repeatRule
  delete startRes.repeatRule

  return item
}
