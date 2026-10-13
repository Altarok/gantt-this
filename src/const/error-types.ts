export type ErrorSeverity = 'info' | 'warn' | 'error' | 'fatal'
export type ErrorType = 'general' | 'calendar' | 'event' | 'date' | 'bound' | 'unknown'

export type ErrorDef = {
  level: ErrorSeverity
  type: ErrorType
  messageTemplate: string // z.B. Invalid day '{day}' for year '{year}'.
}

export type ErrorEntry = {
  level: ErrorSeverity,
  type: ErrorType,
  message: string,
  filepath?: string
}

export type ChartDiagnostics = {
  totalCalendars: number
  loadedCalendars: number
  contextFilesCount: number
  contextEventCount: number
  logs: ErrorEntry[],
  logTypes: ErrorType[]
}

export const knownErrors: Record<string, ErrorDef> = {
  eventDirEmpty: {
    level: 'info',
    type: 'event',
    messageTemplate: `No files found in event directory '{dir}'.`
  },
  calendarDirEmpty: {
    level: 'info',
    type: 'calendar',
    messageTemplate: `No files found in calendar directory '{dir}'.`
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
    messageTemplate: `Can't parse date {date}. Day {day} is out of range for year {year}.`
  },
  illegalDay4Month: {
    level: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date {date}. Day {day} is out of range for month {month}.`
  }
} as const // = immutable

export type ErrorId = keyof typeof knownErrors
