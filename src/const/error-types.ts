export type ErrorSeverity = 'info' | 'warn' | 'error' | 'fatal'
export type ErrorType = 'general' | 'calendar' | 'event' | 'date' | 'bound' | 'unknown'

export type ErrorDef = {
  level: ErrorSeverity
  type: ErrorType
  messageTemplate: string // z.B. Invalid day '{day}' for year '{year}'.
}

export const knownErrors: Record<string, ErrorDef> = {
  eventDirEmpty: {
    level: 'warn',
    type: 'event',
    messageTemplate: `No event files found in directory: '{dir}'`
  },
  calendarDirEmpty: {
    level: 'warn',
    type: 'calendar',
    messageTemplate: `No calendar files found in directory: '{dir}'`
  },
  illegalChartBoundFormat: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Illegal format for chart's {bound} date: '{date}'`
  },
  noCalForChartBounds: {
    level: 'warn',
    type: 'calendar',
    messageTemplate: `Can't parse chart's bounds. No calendar matches your chart's bounds calendar id: '{calendarID}'`
  },
  calendarNotRegistered: {
    level: 'warn',
    type: 'calendar',
    messageTemplate: `No calendar registered in settings. Fallback '{fallback}' will be used.`
  },
  calendarDaysInStandardMismatch: {
    level: 'error',
    type: 'calendar',
    messageTemplate: `Days in standard year ({daysInStandardYear}) does not match sum of days of months for calendar: '{calendarID}'`
  },
  boundsCalendarNotFound: {
    level: 'warn',
    type: 'calendar',
    messageTemplate: `Can't parse bounds. No calendar matches ID: '{calendarId}'.`
  },
  codeBlockDateParseFail: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Could not parse chart's {description} date: '{dateValue}'.`
  },
  yamlCalendarParseFail: {
    level: 'error',
    type: 'calendar',
    messageTemplate: `Failed to parse YAML for calendar '{calendarId}'.`
  },
  eventDateParseFail: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Failed to parse event date: '{dateStr}' in file '{filename}'.`
  },
  reloadGanttFail: {
    level: 'error',
    type: 'general',
    messageTemplate: `Failed to reload Gantt chart.`
  },
  noRegisteredCalendar: {
    level: 'warn',
    type: 'calendar',
    messageTemplate: `There is no calendar registered in the plugin's settings. The only usable calendar ID will be 'gregorian'.`
  },
  illegalYear0InNoY0Cal: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date '{date}'. Year 0 invalid when 'noYearZero = true'.`
  },
  illegalDateOutOfBounds: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date '{date}'. Values out of bounds.`
  },
  illegalNegativeMonth: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date '{date}'. Month has a negative value.`
  },
  illegalNegativeDay: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date '{date}'. Day has a negative value.`
  },
  illegalMonth4Year: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date '{date}'. Month {month} is out of range for year {year}.`
  },
  illegalDay4Year: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date '{date}'. Day {day} is out of range for year {year}.`
  },
  illegalDay4Month: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date '{date}'. Day {day} is out of range for month {month}.`
  },
  unparseableDate: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date: '{date}'`
  },
  missingCalConfigForDate: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date '{date}' without calendar config.`
  },
  incompleteCalendar: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date '{date}' without calendar config.`
  },
  positionalDateWithoutDelimiter: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse positional date '{date}' without delimiter ('{delimiter}').`
  },
  positionalDateWithInvalidLength: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse positional date '{date}', should have {unitLength} units.`
  },
  positionalDateWithInvalidSegment: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse positional date '{date}', illegal segment: '{segment}'.`
  },
  positionalCalendarMissingSegments: {
    level: 'fatal',
    type: 'calendar',
    messageTemplate: `Can't parse positional calendar '{id}', missing date segments.`
  },
  ruleBasedCalendarMissingDetails: {
    level: 'fatal',
    type: 'calendar',
    messageTemplate: `Can't parse rule-based calendar '{id}', missing details.`
  },
  unknownCalendarType: {
    level: 'error',
    type: 'calendar',
    messageTemplate: `Unknown calendar type: {type}`
  },
  unregisteredCalendar: {
    level: 'warn',
    type: 'calendar',
    messageTemplate: `Calendar {calendarID} is not registered. Can't guarantee consistent order of calendars.`
  },
  missingTodayDate: {
    level: 'warn',
    type: 'calendar',
    messageTemplate: `Can't parse {date}. Calendar {id} has no today date.`
  },
  invalidFormatTodayDate: {
    level: 'info',
    type: 'date',
    messageTemplate: `Can't parse {date}. Invalid format.`
  }

} as const // = immutable

export type ErrorId = keyof typeof knownErrors

export type ErrorEntry = {
  id: ErrorId
  level: ErrorSeverity
  type: ErrorType
  message: string
  filepath?: string
}

export type ChartDiagnostics = {
  totalCalendars: number
  loadedCalendars: number
  contextFilesCount: number
  contextEventCount: number
  logs: ErrorEntry[]
}
