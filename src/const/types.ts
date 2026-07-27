export const CALENDAR_CONFIG_TYPES = [
  'positional',
  'rule-based',
  'gregorian' // default
] as const

// export type CalendarConfigType = 'positional' | 'rule-based' | 'gregorian'
export type CalendarConfigType = (typeof CALENDAR_CONFIG_TYPES)[number]

export function isCalendarIdentifier(value: string): value is CalendarConfigType {
  return (CALENDAR_CONFIG_TYPES as readonly string[]).includes(value)
}

export type DateFormatComponent = 'year' | 'month' | 'day' | 'intercalary'

export type MonthDefinition = {
  name: string
  shortname?: string
  days: number
  // For calendars like the Hobbit/Shire calendar where mid-year festivals or Yule days sit between months and don't belong to any month.
  isIntercalary?: boolean
}

export type LeapYearRule = {
  // 'gregorian' rule or a custom fantasy rule frequency like 'every-4-years-except-100'
  ruleType: 'gregorian' | 'interval' | 'none'
  intervalYears?: number
  extraDays?: number
  applyToMonthIndex?: number // Which month gets the leap day (e.g., February / index 1)
}

export type RuleBasedDetails = {
  months: MonthDefinition[]
  leapYearRule?: LeapYearRule
  daysInStandardYear: number
  /**
   * Defines the order of elements in the date string.
   * For "1420-Afterlithe-21", format is ['year', 'month', 'day']
   * For "195-2026" (Ordinal), format is ['day', 'year']
   */
  format: DateFormatComponent[]
}

export type CalendarConfig = {
  id: string
  name: string
  epochGregorian: string
  type: CalendarConfigType
  delimiter: string
  positionalUnits?: {
    name: string
    days: number
  }[]

  // Used if type === 'rule-based' (Gregorian, Hobbit, Elven, etc.)
  ruleBasedDetails?: RuleBasedDetails
}

/** Calendar event type */
export type GanttItemDisplayType = 'bar' | 'point' // | 'vertical-line'

/** Calendar event */
export type GanttItem = {
  id: number
  name: string
  startDateDisplay: string // human-readable for UI
  endDateDisplay: string
  startDays: number // Quantized timeline tracking unit: Days from default point zero
  endDays: number
  group: string
  displayType: GanttItemDisplayType
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


export type GroupOrCalendarSettings = {
  visible?: boolean
  color?: string
  priority?: number
}

export type PluginSettings = { // usable by code
  eventPath: string
  eventPathSearchRecursive: boolean
  calendarPath: string
  calendarPathSearchRecursive: boolean
  defaultCalendar: string
  fallbackColor: string
  calendars: Record<string, GroupOrCalendarSettings>
  groups: Record<string, GroupOrCalendarSettings>
  placeholder: number
}

export const DEFAULT_SETTINGS: PluginSettings = {
  eventPath: '/',
  eventPathSearchRecursive: false,
  calendarPath: '/',
  calendarPathSearchRecursive: false,
  defaultCalendar: 'gregorian',
  fallbackColor: '#1565c0',
  calendars: {
    'gregorian': {"visible": true, "color": "#1565c0", "priority": 0},
  },
  groups: {},
  placeholder: 0
}

