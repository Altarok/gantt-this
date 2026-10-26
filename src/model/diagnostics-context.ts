import {formatErrorMessage, GanttError} from './gantt-error'
import {ChartDiagnostics, ErrorEntry, ErrorId, ErrorSeverity, ErrorType, knownErrors} from '../const/error-types'

const severity: Record<ErrorSeverity, number> = {fatal: 0, error: 1, warn: 2, info: 3,}

function sortLogsBySeverity(logs: ErrorEntry[]): ErrorEntry[] {
  return logs.sort((a, b) => severity[a.level] - severity[b.level])
}

export class DiagnosticsContext implements ChartDiagnostics {
  totalCalendars = 0
  loadedCalendars = 0
  contextFilesCount = 0
  contextEventCount = 0
  logs: ErrorEntry[] = []
  loggedIDs: ErrorId[] = []

  resetCache(): void {
    this.totalCalendars = 0
    this.loadedCalendars = 0
    this.contextFilesCount = 0
    this.contextEventCount = 0
    this.logs = []
    this.loggedIDs = []
  }

  get hasWarnings(): boolean {
    return this.logs.length > 0
  }

  sortLogs(): void {
    this.logs = sortLogsBySeverity(this.logs)
  }

  private add(id: ErrorId, level: ErrorSeverity, type: ErrorType, message: string, filepath?: string) {
    const newEntry: ErrorEntry = {id, level, type, message, filepath}
    const isDuplicate = this.logs.some(old =>
      old.id === newEntry.id
      && old.message === newEntry.message
      && old.filepath === newEntry.filepath)
    if (isDuplicate) return

    this.loggedIDs.push(id)
    this.logs.push(newEntry)
  }

  addError(err: GanttError, filepath?: string) {
    this.add(err.id, err.logLevel, err.type, err.message, err.filepath ?? filepath)
  }

  addErrorLog(id: ErrorId, params?: Record<string, string | number>, filepath?: string): void {
    const errorDef = knownErrors[id]
    if (!errorDef) return this.add('fatal', 'fatal', 'unknown', 'Unknown error')

    const finalMessage = formatErrorMessage(errorDef.messageTemplate, params)
    this.add(id, errorDef.level, errorDef.type, finalMessage, filepath)
  }


}
