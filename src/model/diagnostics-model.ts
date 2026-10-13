import {ChartDiagnostics, LogEntry, LogLevel, LogType} from '../const/types'

export class DiagnosticsModel implements ChartDiagnostics {
  totalCalendars = 0
  loadedCalendars = 0
  failedCalendars = 0
  contextFilesCount = 0
  contextEventCount = 0
  logs: LogEntry[] = []
  logTypes: LogType[] = []

  addLog(level: LogLevel, message: string, type: LogType, filepath?: string) {
    this.logs.push({level, message, type, filepath})
    if (type && !this.logTypes.includes(type)) this.logTypes.push(type)
  }

}
