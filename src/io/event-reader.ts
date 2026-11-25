import {
  EventId,
  GanttItem,
  GanttItemDisplayType,
  GroupOrCalendarSettings,
  ParsedDate,
  TimeOfDayParsed
} from '../types/settings-types'
import {CalendarConfig} from '../types/calendar-types'
import {FrontMatterCache, TFile} from 'obsidian'
import {EventPropertyReader} from './event-property-reader'
import {parseEventDate, parseTimeOfDay} from '../date-calculations/event-date-input-calc'
import {findPredecessorsAndSuccessors} from './event-hierarchy-analysis'
import {getCalendarDefinition} from './calendar-reader'
import {GanttError} from '../model/gantt-error'
import {ChartContext} from '../model/chart-context'
import {GanttItemImpl} from '../model/gantt-item'

const NO_TIME_OF_DAY: TimeOfDayParsed = {input: '', value: 0, timeOfDayFractions: []}

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
                    startDateInput: string,
                    endDateInput: string | undefined,
                    /** Calendar to use for event */
                    calendarId: string,
                    calendarConfig: CalendarConfig | null,
                    file: TFile,
                    frontMatter: FrontMatterCache,
                    id: EventId): GanttItem | null {

  const eventPropertyReader: EventPropertyReader = chartCtx.propertyReader

  let startDate: ParsedDate | undefined
  let endDate: ParsedDate | undefined

  try {
    startDate = parseEventDate(true, true, startDateInput, calendarConfig)
    if (!startDate) return null
    if (endDateInput) endDate = parseEventDate(true, false, endDateInput, calendarConfig)
  } catch (err) {
    if (err instanceof GanttError) chartCtx.addErr(err, file)
    return null
  }

  const fallbackTimeOfDay: TimeOfDayParsed = parseTimeOfDay(chartCtx.propertyReader.getEventTimeOfDay(frontMatter, file), calendarConfig)
    ?? NO_TIME_OF_DAY


  startDate.timeOfDay ??= fallbackTimeOfDay
  // startDate.days = startDate.days + (startDate.timeOfDay?.value ?? 0)

  let isTimeSpan = false

  if (endDateInput && endDate) {
    endDate.timeOfDay ??= fallbackTimeOfDay
    // endDate.days = endDate.days + (endDate.timeOfDay?.value ?? 0)

    if (endDate.days + (endDate.timeOfDay?.value ?? 0) > startDate.days + (startDate.timeOfDay?.value ?? 0)) {
      isTimeSpan = true
    } else {
      chartCtx.addLog('endDateNotAfterStartDate', {end: endDate.display, start: startDate.display}, file)
      endDate = startDate
    }
  }

  endDate ??= startDate
  endDate.timeOfDay ??= fallbackTimeOfDay

  let displayType: GanttItemDisplayType = eventPropertyReader.getEventSymbol(frontMatter, file, isTimeSpan)

  const group = eventPropertyReader.getEventGroup(frontMatter, file)
  const color = eventPropertyReader.getEventColor(frontMatter, file, group, calendarId)

  const item = new GanttItemImpl(id,
    eventPropertyReader.getEventName(frontMatter, file),
    // startDate, endDate,
    startDate.display,
    endDate.display,
    startDate.days,
    endDate.days,
    startDate.timeOfDay,
    endDate.timeOfDay,
    group,
    displayType,
    eventPropertyReader.getEventIconID(frontMatter, file),
    eventPropertyReader.getEventIconColor(frontMatter, file),
    calendarId,
    color,
    file.path + eventPropertyReader.getHeaderToLinkTo(frontMatter, file),
    frontMatter,
    file)

  if (endDateInput && endDate.repeatRule) item.repeatRule = endDate.repeatRule
  else if (startDate.repeatRule) item.repeatRule = startDate.repeatRule

  delete endDate.repeatRule
  delete startDate.repeatRule

  return item
}
