import {StatisticsModel} from './statistics-model'
import {ChartStatistics, LogEntry, LogLevel} from "../const/types"
import {GanttError} from "./gantt-error";

const severity: Record<LogLevel, number> = {fatal: 0, error: 1, warn: 2, info: 3,}

function sortLogsBySeverity(logs: LogEntry[]) {
  return logs.sort((a, b) => severity[a.level] - severity[b.level])
}

export class StatisticsContext {

  statistics: StatisticsModel

  constructor() {
    this.statistics = new StatisticsModel()
  }

  getStatistics(): ChartStatistics {
    this.statistics.logs = sortLogsBySeverity(this.statistics.logs)
    return this.statistics
  }

  info(msg: string) {
    this.statistics.addLog('info', msg)
  }

  warn(msg: string) {
    this.statistics.addLog('warn', msg)
  }

  error(msg: string) {
    this.statistics.addLog('error', msg)
  }

  fatal(msg: string) {
    this.statistics.addLog('fatal', msg)
  }

  addErr(err: GanttError) {
    this.statistics.addLog(err.logLevel, err.message, err.type)
  }
}
