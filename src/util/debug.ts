const isDebug = true

export const debug = {
  log,
  debug: log,
  warn,
  info,
  trace,
}

const logger: Console | undefined = undefined // window.console

function log(message: string): void {
  if (isDebug) logger?.debug('[L] ', message)
}

function warn(message: string): void {
  if (isDebug) logger?.warn('[W] ', message)
}

function info(message: string): void {
  if (isDebug) logger?.info('[I] ', message)
}

function trace(message: string): void {
  if (isDebug) logger?.trace('[T] ', message)
}

