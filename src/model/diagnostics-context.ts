import {formatErrorMessage, GanttError} from './gantt-error'
import {ChartDiagnostics, ErrorEntry, ErrorId, ErrorSeverity, ErrorType, knownErrors} from '../const/error-types'

const severity: Record<ErrorSeverity, number> = {fatal: 0, error: 1, warn: 2, info: 3,}

function sortLogsBySeverity(logs: ErrorEntry[]) {
  return logs.sort((a, b) => severity[a.level] - severity[b.level])
}

export class DiagnosticsContext implements ChartDiagnostics {
  totalCalendars = 0
  loadedCalendars = 0
  contextFilesCount = 0
  contextEventCount = 0
  logs: ErrorEntry[] = []
  logTypes: ErrorType[] = []

  sortLogs(): void {
    this.logs = sortLogsBySeverity(this.logs)
  }

  private add(level: ErrorSeverity, type: ErrorType, message: string, filepath?: string) {
    this.logs.push({level, type, message, filepath})
    if (!this.logTypes.includes(type)) this.logTypes.push(type)
  }

  addInfo(msg: string, type?: ErrorType, filepath?: string) {
    this.add('info', type ?? 'unknown', msg, filepath)
  }

  addWarn(msg: string, type?: ErrorType, filepath?: string) {
    this.add('warn', type ?? 'general', msg, filepath)
  }

  addError(msg: string, type?: ErrorType, filepath?: string) {
    this.add('error', type ?? 'general', msg, filepath)
  }

  addFatal(msg: string, type?: ErrorType, filepath?: string) {
    this.add('fatal', type ?? 'general', msg, filepath)
  }

  addErr(err: GanttError) {
    this.add(err.logLevel, err.type, err.message, err.filepath)
  }

  addLog(id: ErrorId, params?: Record<string, string | number>, filepath?: string): void {
    const errorDef = knownErrors[id]
    if (!errorDef) return this.add('fatal', 'unknown', 'Unknown error')

    const finalMessage = formatErrorMessage(errorDef.messageTemplate, params)
    this.add(errorDef.level, errorDef.type, finalMessage, filepath)
  }

}
