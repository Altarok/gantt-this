import {
  CalendarConfig,
  EventId,
  GanttChartSources,
  GanttItem,
  GanttItemDisplayType,
  GroupOrCalendarSettings,
  ParsedDate
} from '../const/types'
import FantasyGanttPlugin from '../main'
import {FrontMatterCache, Notice, TFile} from 'obsidian'
import {EventPropertyReader} from './event-property-reader'
import {parseEventDate} from '../date-calculations/event-date-input-calc'
import {findPredecessorsAndSuccessors} from './event-hierarchy-analysis'
import {getCalendarDefinition} from './calendar-reader'

/**
 * Parse given files to {@link GanttItem}s.
 * Call from outside Obsidian's Bases.
 */
export async function parseFiles(files: TFile[],
                                 plugin: FantasyGanttPlugin,
                                 eventPropertyReader: EventPropertyReader,
                                 settingsContext: GanttChartSources): Promise<GanttItem[]> {
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

    const calendarConfig = await getCalendarDefinition(calendarId, plugin, eventPropertyReader, settingsContext)

    const ganttItem: GanttItem | null = createItem(plugin, eventPropertyReader, startDate, endDate, calendarId, calendarConfig, file, frontMatter, `${++incrementalId}`)
    if (!ganttItem) continue
    items.push(ganttItem)
  }

  // const localChartSettings =
  // parseCodeBlockContent(plugin, rawChartInput)

  if (plugin.settings.uxHighlightRelatedEvents) findPredecessorsAndSuccessors(items, eventPropertyReader)

  return items
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
