import {PluginSettings} from "../const/types";


export class SettingsContext {

  /**
   *
   * @param global plugin-wide global settings
   * @param local chart-related local settings
   */
  constructor(private readonly global: PluginSettings,
              private readonly local: Partial<PluginSettings>) {
  }

  get frontMatterProperty_event_time_start() {
    return this.local.frontMatterProperty_event_time_start ?? this.global.frontMatterProperty_event_time_start
  }

  get frontMatterProperty_event_time_end() {
    return this.local.frontMatterProperty_event_time_end ?? this.global.frontMatterProperty_event_time_end
  }

  get frontMatterProperty_calendar_name() {
    return this.local.frontMatterProperty_calendar_name ?? this.global.frontMatterProperty_calendar_name
  }

  get frontMatterProperty_gantt_this() {
    return this.local.frontMatterProperty_gantt_this ?? this.global.frontMatterProperty_gantt_this
  }

  get frontMatterProperty_event_calendar() {
    return this.local.frontMatterProperty_event_calendar ?? this.global.frontMatterProperty_event_calendar
  }

  get frontMatterProperty_event_color() {
    return this.local.frontMatterProperty_event_color ?? this.global.frontMatterProperty_event_color
  }

  get frontMatterProperty_event_name() {
    return this.local.frontMatterProperty_event_name ?? this.global.frontMatterProperty_event_name
  }

  get frontMatterProperty_event_group() {
    return this.local.frontMatterProperty_event_group ?? this.global.frontMatterProperty_event_group
  }

  get frontMatterProperty_event_icon_name() {
    return this.local.frontMatterProperty_event_icon_name ?? this.global.frontMatterProperty_event_icon_name
  }

  get frontMatterProperty_event_icon_color() {
    return this.local.frontMatterProperty_event_icon_color ?? this.global.frontMatterProperty_event_icon_color
  }

  get frontMatterProperty_event_symbol() {
    return this.local.frontMatterProperty_event_symbol ?? this.global.frontMatterProperty_event_symbol
  }

  get frontMatterProperty_note_header() {
    return this.local.frontMatterProperty_note_header ?? this.global.frontMatterProperty_note_header
  }

  get frontMatterProperty_event_predecessors() {
    return this.local.frontMatterProperty_event_predecessors ?? this.global.frontMatterProperty_event_predecessors
  }

  get frontMatterProperty_event_successors() {
    return this.local.frontMatterProperty_event_successors ?? this.global.frontMatterProperty_event_successors
  }

  get defaultCalendar() {
    return this.local.defaultCalendar ?? this.global.defaultCalendar
  }

  get uxDefaultTimespanEventSymbol() {
    return this.local.uxDefaultTimespanEventSymbol ?? this.global.uxDefaultTimespanEventSymbol
  }

  get uxDefaultTimestampEventSymbol() {
    return this.local.uxDefaultTimestampEventSymbol ?? this.global.uxDefaultTimestampEventSymbol
  }

  get fallbackColorForIcons() {
    return this.local.fallbackColorForIcons ?? this.global.fallbackColorForIcons
  }

  get fallbackColor() {
    return this.local.fallbackColor ?? this.global.fallbackColor
  }

  get groups() {
    return /* this.local.fallbackColor ?? */ this.global.groups
  }

  get calendars() {
    return /* this.local.fallbackColor ?? */ this.global.calendars
  }
}
