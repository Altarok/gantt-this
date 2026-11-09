const isDebug = true

export const debug = {
  log,
  debug: log,
  warn,
  info,
  trace,
}

const logger: Console | undefined = // undefined //
  window.console

function log(message: string): void {
  if (isDebug) logger?.info('[L] ', message)
}

function warn(message: string): void {
  if (isDebug) logger?.info('[W] ', message)
}

function info(message: string): void {
  if (isDebug) logger?.info('[I] ', message)
}

function trace(message: string): void {
  if (isDebug) logger?.info('[T] ', message)
}

