import {RepeatRule} from '../const/types'

// export type RepeatRule = {
//   delta: number
//   startDate?: number
//   endDate?: number
// }

/**
 * @param input suffix of a date, what came after `' repeat '`
 */
export function createRepeatRule( input:  string): RepeatRule | undefined {

  let repeatRule: RepeatRule | undefined = undefined

  if (/^every \d+ days$/.test(input)) {
    const value = input.replace(/every|days| /g, '')
    repeatRule = {delta: Number(value)}
  }

  if (repeatRule)
    console.info(`input(${input}) --> repeatRule: delta(${repeatRule.delta}), startDate(${repeatRule.startDate}), endDate(${repeatRule.endDate})`)
  else
    console.info(`input(${input}) --> repeatRule: undefined`)

  return repeatRule
}
