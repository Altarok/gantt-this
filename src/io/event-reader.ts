import {
  EventId,
  GanttItem,
  GanttItemDisplayType,
  GroupOrCalendarSettings,
  ParsedDate,
  TypeOfDayParsed
} from '../types/settings-types'
import {CalendarConfig} from '../types/calendar-types'
import {FrontMatterCache, TFile} from 'obsidian'
import {EventPropertyReader} from './event-property-reader'
import {parseEventDate, parseTimeOfDay} from '../date-calculations/event-date-input-calc'
import {findPredecessorsAndSuccessors} from './event-hierarchy-analysis'
import {getCalendarDefinition} from './calendar-reader'
import {GanttError} from '../model/gantt-error'
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

    if (!calendarId || (mappedCalendarConfigs[calendarId] && !mappedCalendarConfigs[calendarId].visible)) continue

    const calendarConfig = await getCalendarDefinition(calendarId, chartCtx)

    const ganttItem: GanttItem | null = createItem(chartCtx, startDate, endDate, calendarId,
      calendarConfig, file, frontMatter, `${++incrementalId}`)
    if (!ganttItem) continue
    items.push(ganttItem)
  } catch (err) {
    if (err instanceof GanttError) chartCtx.addErr(err)
  }

  findPredecessorsAndSuccessors(items, chartCtx.propertyReader)

  return items
}

function createItem(chartCtx: ChartContext,
                    startDate: string,
                    endDate: string | undefined,
                    /** Calendar to use for event */
                    calendarId: string,
                    calendarConfig: CalendarConfig | null,
                    file: TFile,
                    frontMatter: FrontMatterCache,
                    id: EventId): GanttItem | null {

  const eventPropertyReader: EventPropertyReader = chartCtx.propertyReader
  let startRes: ParsedDate | undefined
  let endRes: ParsedDate | undefined

  try {
    startRes = parseEventDate(true, true, startDate, calendarConfig)
    if (!startRes) return null
    if (endDate) endRes = parseEventDate(true, false, endDate, calendarConfig)

  } catch (err) {
    // new Notice(`Failed to parse event date: ${endDate} in file ${file.name}`)
    if (err instanceof GanttError) chartCtx.addErr(err, file)
    return null
  }

  if (endRes) {
    if (endRes.days <= startRes.days) {
      chartCtx.addLog('endDateNotAfterStartDate', {end: endRes.display, start: startRes.display}, file)
      endRes = {days: startRes.days, display: startRes.display, typeOfDay: startRes.typeOfDay}
    }
  } else {
    endRes = {days: startRes.days, display: startRes.display, typeOfDay: startRes.typeOfDay}
  }


  const isTimeSpan: boolean = !!endDate && startRes.days < endRes.days

  let startTimeOfDay: TypeOfDayParsed | undefined = undefined
  let endTimeOfDay: TypeOfDayParsed | undefined = undefined

  if (isTimeSpan) {
    if (startRes.typeOfDay) {
      startTimeOfDay = startRes.typeOfDay
      startRes.days = startRes.days + startRes.typeOfDay.value
    }
    if (endRes.typeOfDay) {
      endTimeOfDay = endRes.typeOfDay
      endRes.days = endRes.days + endRes.typeOfDay.value
    }
  } else /* timestamp */ {

    if (startRes.typeOfDay) {
      startTimeOfDay = startRes.typeOfDay
    } else {
      const timeOfDay = chartCtx.propertyReader.getEventTimeOfDay(frontMatter, file)
      startTimeOfDay = parseTimeOfDay(timeOfDay, calendarConfig)
    }

    if (startTimeOfDay) {
      endTimeOfDay = startTimeOfDay
      startRes.days = startRes.days + startTimeOfDay.value
      endRes.days = endRes.days + startTimeOfDay.value
    }
  }


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
    startTimeOfDay: startTimeOfDay ?? undefined,
    endTimeOfDay: endTimeOfDay ?? undefined,
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
