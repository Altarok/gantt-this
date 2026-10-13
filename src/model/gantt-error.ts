import {TFile} from 'obsidian'
import {ErrorId, ErrorSeverity, ErrorType, knownErrors} from '../const/error-types'

export function formatErrorMessage(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)}/g, (_, key: string) => {
    return key in params ? String(params[key]) : `{${key}}`
  })
}

/**
 * @throws GanttError
 */
export function throwGanttError(id: ErrorId,
                                params?: Record<string, string | number>,
                                file?: TFile): void {
  const errorDef = knownErrors[id]
  if (!errorDef) throw new GanttError('error', 'Unknown error', 'unknown')

  const finalMessage = formatErrorMessage(errorDef.messageTemplate, params)
  throw new GanttError(errorDef.level, finalMessage, errorDef.type, file?.path)
}

export class GanttError extends Error {
  constructor(readonly logLevel: ErrorSeverity,
              message: string,
              readonly type: ErrorType,
              readonly filepath?: string) {
    super(message)
    this.name = 'GanttError'
  }
}

