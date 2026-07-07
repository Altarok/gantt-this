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

export type GanttItemType = 'bar' | 'point'

export type GanttItem = {
  id: number
  name: string
  startDateDisplay: string // human-readable for UI
  endDateDisplay: string
  startDays: number // Quantized timeline tracking unit: Days from default point zero
  endDays: number
  group: string
  type: GanttItemType
  calendarType: string
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

// TODO merge with PluginSettings as soon as code is able to work with it
export type PluginSettingsAlreadyUsedInCode = { // usable by code
  eventPath: string
  calendarPath: string
}

export type PluginSettings = PluginSettingsAlreadyUsedInCode & {
  defaultType: string
  fallbackColor: string
  eventPathSearchRecursive: boolean
  calendarPathSearchRecursive: boolean
  typeColors: Record<string, string>
  groupColors: Record<string, string>
  visibleCalendars: Record<string, boolean>
}

export const DEFAULT_SETTINGS: PluginSettings = {
  defaultType: 'iso-8601',
  fallbackColor: '#1565c0',
  eventPath: '/',
  eventPathSearchRecursive: true,
  calendarPath: '/',
  calendarPathSearchRecursive: false,
  typeColors: {} as Record<string, string>,
  groupColors: {} as Record<string, string>,
  visibleCalendars: {} as Record<string, boolean>
}

