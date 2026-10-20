const isDebug = true

export const debug = {
  log,
  info,
  trace,
}


function log(message: string): void {
  if (isDebug) logg('[L] ', message)
}

function info(message: string): void {
  if (isDebug) logg('[I] ', message)
}

function trace(message: string): void {
  if (isDebug) logg('[T] ', message)
}

function logg(prefix: string, message: string): void {
  if (isDebug) console.log(prefix + message)
}
