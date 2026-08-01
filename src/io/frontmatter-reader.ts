import {FrontMatterCache} from 'obsidian'
import {GanttItemDisplayType, isGanttItemDisplayType, PluginSettings} from '../const/types'

/*
 * Default key: 'gantt-item'
 */
function isFileRelevant(frontMatter: FrontMatterCache, settings: PluginSettings): boolean {
  return frontMatter[settings.frontMatterProperty_gantt_this] === true
}

/*
 * Default key: 'gantt-type'
 */
function getEventCalendarName(frontMatter: FrontMatterCache, settings: PluginSettings): string {
  return (frontMatter[settings.frontMatterProperty_event_calendar] as string ?? settings.defaultCalendar).trim().toLowerCase()
}

/*
 * Default key: 'gantt-color'
 */
function getEventColor(frontMatter: FrontMatterCache, settings: PluginSettings): string | undefined {
  return frontMatter[settings.frontMatterProperty_event_color] as string ?? undefined
}

/*
 * Default key: 'gantt-group'
 */
function getEventGroup(frontMatter: FrontMatterCache, settings: PluginSettings): string {
  return (frontMatter[settings.frontMatterProperty_event_group] as string ?? 'general').toLowerCase()
}

/*
 * Default key: 'gantt-name'
 */
function getEventName(frontMatter: FrontMatterCache, settings: PluginSettings): string | undefined {
  const key = settings.frontMatterProperty_event_name
  return frontMatter[key] as string ?? undefined
}

/*
 * Default key: 'gantt-displayIcon'
 */
function getEventIconID(frontMatter: FrontMatterCache, settings: PluginSettings): string | undefined {
  return frontMatter[settings.frontMatterProperty_event_icon_name] as string ?? undefined
}

/*
 * Default key: 'gantt-displayIconColor'
 */
function getEventIconColor(frontMatter: FrontMatterCache, settings: PluginSettings): string | undefined {
  return frontMatter[settings.frontMatterProperty_event_icon_color] as string ?? undefined
}

/*
 * Default key: 'gantt-symbol'
 * @param isTimeSpan true if event has two different timestamps
 */
function getEventSymbol(frontMatter: FrontMatterCache, settings: PluginSettings, isTimeSpan: boolean): GanttItemDisplayType {
  let value: string | undefined = frontMatter[settings.frontMatterProperty_event_symbol] as string ?? undefined
  if (value && !isGanttItemDisplayType(value)) value = undefined

  if (isTimeSpan) {
    return value === 'era' ? value : 'bar' /* fallback value for timespans */
  } else {
    return (value === 'icon' || value === 'diamond') ? value : 'point' /* fallback value for timestamps */
  }
}

/*
 * Default keys: 'gantt-start' & 'gantt-end'
 */
function getEventTimestamps(frontMatter: FrontMatterCache, settings: PluginSettings):
  { startDate?: string, endDate?: string } {
  const startDate = frontMatter[settings.frontMatterProperty_event_time_start] as string ?? undefined
  const endDate = frontMatter[settings.frontMatterProperty_event_time_end] as string ?? undefined
  return {startDate, endDate}
}

/*
 * Default key: 'gantt-linkToHeader'
 */
function getHeaderToLinkTo(frontMatter: FrontMatterCache, settings: PluginSettings): string {
  const value: string | undefined = frontMatter[settings.frontMatterProperty_note_header] as string
  return (value ? `#${value}` : '')
}

export const FrontMatterUtil = {
  isFileRelevant,
  getEventCalendarName,
  getEventColor,
  getEventGroup,
  getEventName,
  getEventIconID,
  getEventIconColor,
  getEventSymbol,
  getEventTimestamps,
  getHeaderToLinkTo
}
