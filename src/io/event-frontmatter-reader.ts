import {
  CalendarConfig,
  EventId,
  GanttItem,
  GanttItemDisplayType,
  GroupOrCalendarSettings,
  ParsedDate
} from '../const/types'
import {FrontMatterCache, Notice, TFile} from 'obsidian'
import {EventPropertyReader} from './event-property-reader'
import {parseEventDate} from '../date-calculations/event-date-input-calc'
import {findPredecessorsAndSuccessors} from './event-hierarchy-analysis'
import {getCalendarDefinition} from './calendar-reader'
import {GanttError, throwGanttError} from '../model/gantt-error'
import {ChartContext} from '../model/chart-context'

/**
 * Parse given files to {@link GanttItem}s.
 * Call from outside Obsidian's Bases.
 */
export async function parseFiles(files: TFile[],
                                 chartCtx: ChartContext): Promise<GanttItem[]> {
  const items: GanttItem[] = []
  let incrementalId = 0

  const mappedCalendarConfigs: Record<string, GroupOrCalendarSettings>
    = Object.fromEntries(chartCtx.settings.calendars.map((c) => [c.id, c]))

  for (const file of files) try {
    const cache = chartCtx.metadataCache.getFileCache(file)
    const frontMatter = cache?.frontmatter

    if (!frontMatter) continue

    let {startDate, endDate} = chartCtx.propertyReader.getEventTimestamps(frontMatter, file)

    if (startDate === undefined || startDate === null || startDate === '') {
      if (chartCtx.settings.useFilenameAsFallbackStartDate) startDate = file.basename
      else continue
    }

    const calendarId: string = chartCtx.propertyReader.getEventCalendarName(frontMatter, file)

    if (!calendarId || !mappedCalendarConfigs[calendarId]?.visible) continue

    const calendarConfig = await getCalendarDefinition(calendarId, chartCtx)

    const ganttItem: GanttItem | null = createItem(chartCtx.propertyReader, startDate, endDate, calendarId,
      calendarConfig, file, frontMatter, `${++incrementalId}`)
    if (!ganttItem) continue
    items.push(ganttItem)
  } catch (err) {
    if (err instanceof GanttError) chartCtx.addErr(err)
  }


  if (chartCtx.settings.uxHighlightRelatedEvents) findPredecessorsAndSuccessors(items, chartCtx.propertyReader)

  return items
}

function createItem(eventPropertyReader: EventPropertyReader,
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
    throwGanttError('eventDateParseFail', {dateStr: startDate, filename: file.name}, file)
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
