import {FrontMatterCache} from 'obsidian'
import {PluginSettings} from '../const/types'

/*
 * Default key: 'gantt-item'
 */
function isFileRelevant(frontMatter: FrontMatterCache, settings: PluginSettings): boolean {
  const key = settings.frontMatterProperties['gantt.this']!
  return frontMatter[key] === true
}

/*
 * Default key: 'gantt-type'
 */
function getEventCalendarName(frontMatter: FrontMatterCache, settings: PluginSettings): string {
  const key = settings.frontMatterProperties['event.calendar']!
  return (frontMatter[key] as string ?? settings.defaultCalendar).trim().toLowerCase()
}

/*
 * Default key: 'gantt-color'
 */
function getEventColor(frontMatter: FrontMatterCache, settings: PluginSettings): string | undefined {
  const key = settings.frontMatterProperties['event.color']!
  return frontMatter[key] as string ?? undefined
}

/*
 * Default key: 'gantt-group'
 */
function getEventGroup(frontMatter: FrontMatterCache, settings: PluginSettings): string {
  const key = settings.frontMatterProperties['event.group']!
  return (frontMatter[key] as string ?? 'general').toLowerCase()
}

/*
 * Default key: 'gantt-name'
 */
function getEventName(frontMatter: FrontMatterCache, settings: PluginSettings): string | undefined {
  const key = settings.frontMatterProperties['event.name']!
  return frontMatter[key] as string ?? undefined
}

/*
 * Default key: 'gantt-displayIcon'
 */
function getEventIconID(frontMatter: FrontMatterCache, settings: PluginSettings): string | undefined {
  const key = settings.frontMatterProperties['event.icon.name']!
  return frontMatter[key] as string ?? undefined
}

/*
 * Default key: 'gantt-displayIconColor'
 */
function getEventIconColor(frontMatter: FrontMatterCache, settings: PluginSettings): string | undefined {
  const key = settings.frontMatterProperties['event.icon.color']!
  return frontMatter[key] as string ?? undefined
}

/*
 * Default keys: 'gantt-start' & 'gantt-end'
 */
function getEventTimestamps(frontMatter: FrontMatterCache, settings: PluginSettings):
  { startDate?: string, endDate?: string } {
  const keyStartDate = settings.frontMatterProperties['event.time.start']!
  const keyEndDate = settings.frontMatterProperties['event.time.end']!

  const startDate = frontMatter[keyStartDate] as string ?? undefined
  const endDate = frontMatter[keyEndDate] as string ?? undefined

  return {startDate, endDate}
}

/*
 * Default key: 'gantt-linkToHeader'
 */
function getHeaderToLinkTo(frontMatter: FrontMatterCache, settings: PluginSettings): string | undefined {
  const key = settings.frontMatterProperties['note.header']!
  return (frontMatter[key] ? `#${frontMatter[key] as string}` : '')
}

export const FrontMatterUtil = {
  isFileRelevant,
  getEventCalendarName,
  getEventColor,
  getEventGroup,
  getEventName,
  getEventIconID,
  getEventIconColor,
  getEventTimestamps,
  getHeaderToLinkTo
}
