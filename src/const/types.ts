export type CalendarUnit = {
  name: string
  days: number
}

export type CalendarConfigType = 'positional' | 'gregorian'

export type CalendarConfig = {
  id: string
  name: string
  epochGregorian: string
  type: CalendarConfigType
  delimiter: string
  units: CalendarUnit[]
}

/** Calendar event type */
export type GanttItemType = 'bar' | 'point'

export type CalendarIdentifier = CalendarConfigType | 'iso-8601' | string


/** Calendar event */
export type GanttItem = {
  id: number
  name: string
  startDateDisplay: string // human-readable for UI
  endDateDisplay: string
  startDays: number // Quantized timeline tracking unit: Days from default point zero
  endDays: number
  group: string
  type: GanttItemType
  calendarType: CalendarIdentifier
  color?: string
  link?: string
  lane?: number
}

export type GanttGroup = {
  name: string
  items: GanttItem[]
  yOffset: number
  height: number
  lanes: number
}

export type PluginSettings = { // usable by code
  eventPath: string
  eventPathSearchRecursive: boolean
  calendarPath: string
  calendarPathSearchRecursive: boolean
  defaultType: string
  fallbackColor: string
  typeColors: Record<string, string>
  groupColors: Record<string, string>
  visibleCalendars: Record<string, boolean>
  placeholder: number
}

export const DEFAULT_SETTINGS: PluginSettings = {
  eventPath: '/',
  eventPathSearchRecursive: false,
  calendarPath: '/',
  calendarPathSearchRecursive: false,
  defaultType: 'iso-8601',
  fallbackColor: '#1565c0',
  typeColors: {},
  groupColors: {},
  visibleCalendars: {},
  placeholder: 0
}

