export type CalendarConfigType = 'positional' | 'rule-based'

export type MonthDefinition = {
  name: string
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

export type DateFormatComponent = 'year' | 'month' | 'day' | 'intercalary'

export type RuleBasedDetails = {
  months: MonthDefinition[]
  leapYearRule: LeapYearRule
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
  epochGregorian: string // Anchor point to map to absolute timeline days
  type: CalendarConfigType
  delimiter: string

  // Used if type === 'positional'
  positionalUnits?: {
    name: string
    days: number
  }[]

  // Used if type === 'rule-based' (Gregorian, Hobbit, Elven, etc.)
  ruleBasedDetails?: RuleBasedDetails
}
