import {LogLevel, LogType} from '../const/types'
import {TFile} from 'obsidian'

type ErrorDef = {
  logLevel: LogLevel
  type: LogType
  messageTemplate: string // z.B. Invalid day '{day}' for year '{year}'.
}
const knownErrors: Record<string, ErrorDef> = {
  calendarNotRegistered: {
    logLevel: 'warn',
    type: 'calendar',
    messageTemplate: `No calendar registered in settings. Fallback '{fallback}' will be used.`
  },
  boundsCalendarNotFound: {
    logLevel: 'warn',
    type: 'calendar',
    messageTemplate: `Can't parse bounds. No calendar matches ID: '{calendarId}'.`
  },
  codeBlockDateParseFail: {
    logLevel: 'warn',
    type: 'date',
    messageTemplate: `Could not parse chart's {description} date: '{dateValue}'.`
  },
  yamlCalendarParseFail: {
    logLevel: 'error',
    type: 'calendar',
    messageTemplate: `Failed to parse YAML for calendar '{calendarId}'.`
  },
  eventDateParseFail: {
    logLevel: 'warn',
    type: 'date',
    messageTemplate: `Failed to parse event date: '{dateStr}' in file '{filename}'.`
  },
  reloadGanttFail: {
    logLevel: 'error',
    type: 'general',
    messageTemplate: `Failed to reload Gantt chart.`
  },
  noRegisteredCalendar: {
    logLevel: 'warn',
    type: 'calendar',
    messageTemplate: `There is no calendar registered in the plugin's settings. The only usable calendar will be 'gregorian'.`
  },
  illegalDay4Year: {
    logLevel: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date {date}. Day {day} is out of range for year {year}.`
  },
  illegalDay4Month: {
    logLevel: 'warn',
    type: 'date',
    messageTemplate: `Can't parse date {date}. Day {day} is out of range for month {month}.`
  }
} as const // = immutable

export type ErrorId = keyof typeof knownErrors

function formatErrorMessage(template: string, params?: Record<string, string | number>,): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return key in params ? String(params[key]) : `{${key}}`
  })
}

/**
 * @throws GanttError
 */
export function throwGanttError(id: ErrorId, params?: Record<string, string | number>, file?: TFile): void {
  const errorDef = knownErrors[id]
  if (!errorDef) throw new GanttError('error', 'Unknown error', 'unknown')

  const finalMessage = formatErrorMessage(errorDef.messageTemplate, params)
  throw new GanttError(errorDef.logLevel, finalMessage, errorDef.type, file?.path)
}

export class GanttError extends Error {
  constructor(readonly logLevel: LogLevel,
              message: string,
              readonly type: LogType,
              readonly filepath?: string) {
    super(message)
    this.name = 'GanttError'
  }
}

