import {LogLevel, LogType} from '../const/types'

export class GanttError extends Error {
  constructor(public logLevel: LogLevel, message: string, readonly type?: LogType) {
    super(message)
    this.name = 'GanttError'
  }

}

