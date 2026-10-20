const isDebug = true

export function debug(message?: any,
                      ...optionalParams: any[]): void {

  if (isDebug) console.log(message, optionalParams)

}
