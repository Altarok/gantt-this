import {ChartDiagnostics, ChartStatistics, LogEntry, LogLevel, LogType} from '../const/types'

export class StatisticsModel implements ChartStatistics {

  diagnostics: ChartDiagnostics
  logs: LogEntry[]
  logTypes: LogType[]

  constructor() {
    this.diagnostics = {
      totalCalendars: 0,
      loadedCalendars: 0,
      failedCalendars: 0,
      contextFilesCount: 0,
      contextEventsCount: 0
    }
    this.logs = []
    this.logTypes = []
  }

  addLog(level: LogLevel, message: string, type?: LogType) {
    this.logs.push({level, message})
    if (type && !this.logTypes.includes(type)) this.logTypes.push(type)
  }

}
