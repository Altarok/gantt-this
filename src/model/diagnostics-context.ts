import {TFile} from 'obsidian'
import {formatErrorMessage, GanttError} from './gantt-error'
import {ChartDiagnostics, ErrorEntry, ErrorId, ErrorSeverity, ErrorType, knownErrors} from '../const/error-types'
import {ResetPreset} from './reset-options'

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

  resetCache(reset: ResetPreset): void {
    /*
     * TODO: map which ErrorIDs should be reset
     */
    if (reset.isManualRefresh) {
      this.totalCalendars = 0
      this.loadedCalendars = 0
      this.contextFilesCount = 0
      this.contextEventCount = 0
      this.logs = []
      this.loggedIDs = []
    }
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

  /*
   * TODO add optional parameter msg
   */
  addErr(err: GanttError, file?: TFile) {
    this.add(err.id, err.logLevel, err.type, err.message, err.filepath ?? file?.path)
  }

  addLog(id: ErrorId, params?: Record<string, string | number>, filepath?: string): void {
    const errorDef = knownErrors[id]
    if (!errorDef) return this.add('fatal', 'fatal', 'unknown', 'Unknown error')

    const finalMessage = formatErrorMessage(errorDef.messageTemplate, params)
    this.add(id, errorDef.level, errorDef.type, finalMessage, filepath)
  }


}
