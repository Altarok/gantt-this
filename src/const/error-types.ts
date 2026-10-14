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
    type: 'date',
    messageTemplate: `Can't parse positional calendar '{id}', missing date segments.`
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
    messageTemplate: `Calendar {id} has no today date.`
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
