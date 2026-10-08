import {FrontMatterCache, TFile} from 'obsidian'
import {GanttItemDisplayType, isTimespan, isTimestamp, NO_GROUP} from '../const/types'
import BasesContext from '../util/bases-context'
import {SettingsContext} from '../util/settings-context'


export class EventPropertyReader {
  // constructor(private readonly settings: PluginSettings,
  //             private readonly basesCtx?: BasesContext) {
  // }
  constructor(private readonly settings: SettingsContext,
              private readonly basesCtx?: BasesContext) {
  }

  /**
   * First thing to check on any event note.
   * @param frontMatter
   * @param file
   * @return true if file needs to be used in Gantt chart
   */
  hasStartDate(frontMatter: FrontMatterCache, file: TFile): boolean {
    return Boolean(this.getStartDate(frontMatter, file))
  }

  getStartDate(frontMatter: FrontMatterCache, file: TFile): string | undefined {
    const key = this.settings.frontMatterProperty_event_time_start
    return frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? undefined
  }

  getEndDate(frontMatter: FrontMatterCache, file: TFile): string | undefined {
    const key = this.settings.frontMatterProperty_event_time_end
    return frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? undefined
  }

  /*
   * Default keys: 'gantt-start' & 'gantt-end'
   */
  getEventTimestamps(frontMatter: FrontMatterCache, file: TFile):
    { startDate?: string, endDate?: string } {
    const startDate = this.getStartDate(frontMatter, file)
    const endDate = this.getEndDate(frontMatter, file)
    return {startDate, endDate}
  }

  /*
   * Default key: 'gantt-type-definition'
   */
  isMatchingCalendarDefinition(frontMatter: FrontMatterCache, file: TFile, calendarId: string): boolean {
    const key = this.settings.frontMatterProperty_calendar_name
    return frontMatter[key] === calendarId || this.basesCtx?.readPropertyValue(file, key) === calendarId
  }

  /*
   * Default key: 'gantt-item'
   */
  isFileMarkedAsEvent(frontMatter: FrontMatterCache, file: TFile): boolean {
    const key = this.settings.frontMatterProperty_gantt_this
    return frontMatter[key] === true || this.basesCtx?.readPropertyValue(file, key) === 'true'
  }

  /*
   * Default key: 'gantt-type'
   */
  getEventCalendarName(frontMatter: FrontMatterCache, file: TFile): string {
    const key = this.settings.frontMatterProperty_event_calendar
    return frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? this.settings.defaultCalendar
  }

  /**
   * Returns event item color. In priority, if given, returns ...
   * * color read from file's FrontMatter (default key: 'gantt-color') or ...
   * * color read from file's Bases formula or ...
   * * color defined for event's group or ...
   * * color defined for event's calendar group or ...
   * * global fallback color
   * @param frontMatter
   * @param file
   * @param group name of group, e.g. 'historic'
   * @param calendar name of calendar, e.g. 'mayan'
   */
  getEventColor(frontMatter: FrontMatterCache, file: TFile, group: string, calendar: string): string {
    const key = this.settings.frontMatterProperty_event_color
    return frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? this.settings.groups.find(value => value.id === group)?.color
      ?? this.settings.calendars.find(value => value.id === calendar)?.color
      ?? this.settings.fallbackColor
  }

  /*
   * Default key: 'gantt-group'
   */
  getEventGroup(frontMatter: FrontMatterCache, file: TFile): string {
    const key = this.settings.frontMatterProperty_event_group
    return frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? NO_GROUP
  }

  /*
   * Default key: 'gantt-name'
   */
  getEventName(frontMatter: FrontMatterCache, file: TFile): string {
    const key = this.settings.frontMatterProperty_event_name
    return frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? file.basename
  }

  /*
   * Default key: 'gantt-displayIcon'
   */
  getEventIconID(frontMatter: FrontMatterCache, file: TFile): string | undefined {
    const key = this.settings.frontMatterProperty_event_icon_name
    return frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? undefined
  }

  /*
   * Default key: 'gantt-displayIconColor'
   */
  getEventIconColor(frontMatter: FrontMatterCache, file: TFile): string {
    const key = this.settings.frontMatterProperty_event_icon_color
    return frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? this.settings.fallbackColorForIcons
  }

  /*
   * Default key: 'gantt-symbol'
   * @param isTimeSpan true if event has two different timestamps
   */
  getEventSymbol(frontMatter: FrontMatterCache, file: TFile, isTimeSpan: boolean): GanttItemDisplayType {
    const key = this.settings.frontMatterProperty_event_symbol
    const value: string | undefined = frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? undefined

    if (isTimeSpan) {
      return isTimespan(value) ? value : this.settings.uxDefaultTimespanEventSymbol
    } else {
      return isTimestamp(value) ? value : this.settings.uxDefaultTimestampEventSymbol
    }
  }


  /*
   * Default key: 'gantt-linkToHeader'
   */
  getHeaderToLinkTo(frontMatter: FrontMatterCache, file: TFile): string {
    const key = this.settings.frontMatterProperty_note_header
    const value: string | undefined = frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
    return value ? `#${value.trim()}` : ''
  }


  getPredecessors(frontMatter: FrontMatterCache, file: TFile): string[] {
    const key = this.settings.frontMatterProperty_event_predecessors
    return this.getStringArray(frontMatter, file, key)
  }


  getSuccessors(frontMatter: FrontMatterCache, file: TFile): string[] {
    const key = this.settings.frontMatterProperty_event_successors
    return this.getStringArray(frontMatter, file, key)
  }

  private getStringArray(frontMatter: FrontMatterCache, file: TFile, key: string): string[] {
    return frontMatter[key] as string[]
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? []
  }
}
