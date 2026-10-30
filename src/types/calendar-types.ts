import {Moon} from "./moon-types"

export type DateFormatComponent = 'year' | 'month' | 'day' | 'intercalary'

export type EpochOffsetDefinition = { year: number, month: number, day: number } | number

export type CalendarColor = string

export type CalendarColors = {
  axis: CalendarColor
  ticks: CalendarColor
  dates: CalendarColor
}

export type MonthDefinition = {
  name?: string
  shortname?: string
  days: number
  /* For calendars like the Hobbit/Shire calendar where mid-year festivals or Yule days sit between months and don't belong to any month. */
  isIntercalary?: boolean
}

/*
 * 'gregorian' rule or a custom fantasy rule frequency like 'every-4-years-except-100'
 */
export type LeapYearRule = {
  ruleType: 'gregorian' | 'interval' | 'none'
  intervalYears?: number
  extraDays?: number
  applyToMonthIndex?: number /* Which month gets the leap day (e.g., February / index 1) */
}

export type RuleBasedDetails = {
  daysInStandardYear: number
  noYearZero?: boolean // default false
  leapYearRule?: LeapYearRule
  months: MonthDefinition[]
  /**
   * Defines the order of elements in the date string.
   * For '1420-Afterlithe-21', format is ['year', 'month', 'day']
   * For '195-2026' (Ordinal), format is ['day', 'year']
   */
  format: DateFormatComponent[]
  outputFormat: DateFormatComponent[]
}

/**
 * This one has to be implemented by the user inside a Markdown note.
 */
type BaseCalendarConfig = {
  /** Mandatory, unique, and case-sensitive identifier. */
  id: string
  name?: string
  displayName?: string
  /** Defined by user, in Markdown file. Not to be used during zooming/panning calculation. */
  sharedOffset: EpochOffsetDefinition
  startDay?: EpochOffsetDefinition
  endDay?: EpochOffsetDefinition
  /** Not defined by user, calculated based on shared offset */
  offsetToDayZero: number /* offset to 1 AD January 1, calculated by plugin, not defined in Markdown */
  delimiter: string
  bcSuffix?: string
  adSuffix?: string
  moons?: Moon[]
  /** Filepath or calendar note, used for click listener. */
  link: string
  /** Current date in fantasy world. MUST match the calendar's date format. */
  today?: number
  colors?: CalendarColor | {
    axis?: CalendarColor
    dates?: CalendarColor //
    ticks?: CalendarColor
  }
}

/* e.g. Mayan */
export type PositionalCalendarConfig = BaseCalendarConfig & {
  type: 'positional',
  positionalDetails?: {
    oneBased?: boolean
  }
  positionalUnits: { name: string, days: number }[]
}

/* e.g. Gregorian */
export type RuleBasedCalendarConfig = BaseCalendarConfig & {
  type: 'rule-based',
  ruleBasedDetails: RuleBasedDetails
}

export type CalendarConfig = PositionalCalendarConfig | RuleBasedCalendarConfig
