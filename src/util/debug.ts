const isDebug = true

export const debug = {
  log,
  warn,
  info,
  trace,
}

function log(message: string): void {
  if (isDebug) logg('[L] ', message)
}

function warn(message: string): void {
  if (isDebug) logg('[W] ', message)
}

function info(message: string): void {
  if (isDebug) logg('[I] ', message)
}

function trace(message: string): void {
  if (isDebug) logg('[T] ', message)
}

function logg(_prefix: string, _message: string): void {
  // if (isDebug) console.log(_prefix + _message)
}
