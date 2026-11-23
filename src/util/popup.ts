import {Notice} from 'obsidian'
import {debug} from './debug'

/* Milliseconds to show popups */
const short = 1000
const long = 2000

export const Popup = {
  ok,
  warn,
  nok
}

function ok(input: string) {
  new Notice(input, short)
}

function warn(input: string) {
  new Notice(input, long)
}

/** Trigger standardized error Notice
 * @param input should not end on a dot
 * @param err should be a caught Error */
function nok(input: string, err: unknown) {
  const msg = err instanceof Error
    ? `${input}: ${err.message}`
    : `${input} due to an unknown error.`
  debug.info(msg)
  new Notice(msg, long)
}

