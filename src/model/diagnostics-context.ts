import {DiagnosticsModel} from './diagnostics-model'
import {ChartDiagnostics, LogEntry, LogLevel, LogType} from '../const/types'
import {GanttError} from './gantt-error'

const severity: Record<LogLevel, number> = {fatal: 0, error: 1, warn: 2, info: 3,}

function sortLogsBySeverity(logs: LogEntry[]) {
  return logs.sort((a, b) => severity[a.level] - severity[b.level])
}

export class DiagnosticsContext {
  diagnostics: DiagnosticsModel

  constructor() {
    this.diagnostics = new DiagnosticsModel()
  }

  getStatistics(): ChartDiagnostics {
    this.diagnostics.logs = sortLogsBySeverity(this.diagnostics.logs)
    return this.diagnostics
  }

  info(msg: string, type?: LogType) {
    this.diagnostics.addLog('info', msg, type ?? 'general')
  }

  warn(msg: string, type?: LogType) {
    this.diagnostics.addLog('warn', msg, type ?? 'general')
  }

  error(msg: string, type?: LogType) {
    this.diagnostics.addLog('error', msg, type ?? 'general')
  }

  fatal(msg: string, type?: LogType) {
    this.diagnostics.addLog('fatal', msg, type ?? 'general')
  }

  addErr(err: GanttError) {
    this.diagnostics.addLog(err.logLevel, err.message, err.type, err.filepath)
  }
}
