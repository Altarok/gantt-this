import {FrontMatterCache, TFile} from 'obsidian'
import {GanttItemDisplayType, isTimespan, isTimestamp, NO_GROUP, PluginSettings} from '../const/types'
import BasesContext from '../util/bases-context'


export class FrontMatterUtil {
  constructor(private readonly settings: PluginSettings,
              private readonly basesCtx?: BasesContext) {
  }

  /**
   * First thing to check on any event note.
   * @param frontMatter
   * @param file
   * @return true if file needs to be sued in Gantt chart
   */
  hasStartDate(frontMatter: FrontMatterCache, file?: TFile): boolean {
    return Boolean(this.getStartDate(frontMatter, file))
  }

  getStartDate(frontMatter: FrontMatterCache, file?: TFile): string | undefined {
    const key = this.settings.frontMatterProperty_event_time_start
    return frontMatter[key] as string
      ?? (file && this.basesCtx?.readPropertyValue(file, key))
      ?? undefined
  }

  getEndDate(frontMatter: FrontMatterCache): string | undefined {
    return frontMatter[this.settings.frontMatterProperty_event_time_end] as string ?? undefined
  }


  /*
   * Default keys: 'gantt-start' & 'gantt-end'
   */
  getEventTimestamps(frontMatter: FrontMatterCache):
    { startDate?: string, endDate?: string } {
    const startDate = this.getStartDate(frontMatter)
    const endDate = this.getEndDate(frontMatter)
    return {startDate, endDate}
  }

  /*
   * Default key: 'gantt-type-definition'
   */
  isMatchingCalendarDefinition(frontMatter: FrontMatterCache, calendarId: string): boolean {
    return frontMatter[this.settings.frontMatterProperty_calendar_name] === calendarId
  }

  /*
   * Default key: 'gantt-item'
   */
  isFileMarkedAsEvent(frontMatter: FrontMatterCache): boolean {
    return frontMatter[this.settings.frontMatterProperty_gantt_this] === true
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

  /*
   * Default key: 'gantt-color'
   */
  getEventColor(frontMatter: FrontMatterCache, file: TFile): string | undefined {
    const key = this.settings.frontMatterProperty_event_color
    debugger
    return frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? undefined
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
  getEventIconColor(frontMatter: FrontMatterCache, file: TFile): string | undefined {
    const key = this.settings.frontMatterProperty_event_icon_color
    return frontMatter[key] as string
      ?? this.basesCtx?.readPropertyValue(file, key)
      ?? this.settings.fallbackColorForIcons
      ?? undefined
  }

  /*
   * Default key: 'gantt-symbol'
   * @param isTimeSpan true if event has two different timestamps
   */
  getEventSymbol(frontMatter: FrontMatterCache, isTimeSpan: boolean): GanttItemDisplayType {
    let value: string | undefined = frontMatter[this.settings.frontMatterProperty_event_symbol] as string ?? undefined
//  if (value && !isGanttItemDisplayType(value)) value = undefined

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
    return (value ? `#${value.trim()}` : '')
  }


  getPredecessors(frontMatter: FrontMatterCache): string[] {
    return frontMatter[this.settings.frontMatterProperty_event_predecessors] as string[] ?? []
  }


  getSuccessors(frontMatter: FrontMatterCache): string[] {
    return frontMatter[this.settings.frontMatterProperty_event_successors] as string[] ?? []
  }
}
