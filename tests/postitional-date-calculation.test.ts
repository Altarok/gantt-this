import {describe, expect, it} from 'vitest'
import {parseDaysToPositionalDateString} from '../src/date-calculations/positional-dates'
import {PositionalCalendarConfig} from '../src/types/calendar-types'
import {MockCalendarConfig} from './test-configs'
import {createParsedDate} from '../src/date-calculations/event-date-input-calc'

const nrToDate = parseDaysToPositionalDateString
const dateToNr = createParsedDate

const zotaranConfig: PositionalCalendarConfig = {
  ...MockCalendarConfig, id: 'zotaran', name: 'Zotaran Calendar',
  sharedOffset: 0,
  offsetToDayZero: 0,
  type: 'positional',
  delimiter: '.',
  positionalUnits: [
    {name: 'oniriririr', days: 6561},
    {name: 'oniririr', days: 729},
    {name: 'onirir', days: 81},
    {name: 'onir', days: 9},
    {name: 'on', days: 1}
  ]
}

const zotaranOneBasedConfig: PositionalCalendarConfig = {
  ...MockCalendarConfig, id: 'zotaran-no-zero', name: 'Zotaran Calendar without zero',
  sharedOffset: 0,
  offsetToDayZero: 0,
  type: 'positional',
  positionalDetails: {
    oneBased: true
  },
  delimiter: '.',
  positionalUnits: [
    {name: 'oniriririr', days: 6561},
    {name: 'oniririr', days: 729},
    {name: 'onirir', days: 81},
    {name: 'onir', days: 9},
    {name: 'on', days: 1}
  ]
}


describe('parseDateWithPositionalConfig zero-based dates', () => {

  const c = zotaranConfig

  it('parses absolute date 0.0.0.0.0 correctly -> 0', () => {
    const date = dateToNr('0.0.0.0.0', c)
    expect(date.days).toBe(0)
    expect(date.display).toBe('0.0.0.0.0')
  })
  it('parses absolute date 0.0.0.0.1 correctly -> 1', () => {
    const date = dateToNr('0.0.0.0.1', c)
    expect(date.days).toBe(1)
    expect(date.display).toBe('0.0.0.0.1')
  })
  it('parses absolute date 0.0.0.1.0 correctly -> 9', () => {
    const date = dateToNr('0.0.0.1.0', c)
    expect(date.days).toBe(9)
    expect(date.display).toBe('0.0.0.1.0')
  })
  it('parses absolute date 0.0.0.1.1 correctly -> 10', () => {
    const date = dateToNr('0.0.0.1.1', c)
    expect(date.days).toBe(10)
    expect(date.display).toBe('0.0.0.1.1')
  })
  it('parses absolute date 0.0.1.1.0 correctly -> 90', () => {
    const date = dateToNr('0.0.1.1.0', c)
    expect(date.days).toBe(90)
    expect(date.display).toBe('0.0.1.1.0')
  })
})

describe('parseDateWithPositionalConfig one-based dates', () => {

  const c = zotaranOneBasedConfig

  it('parses absolute date 1.1.1.1.1 correctly -> 1', () => {
    const date = dateToNr('1.1.1.1.1', c)
    expect(date.days).toBe(1)
    expect(date.display).toBe('1.1.1.1.1')
  })
  it('parses absolute date 1.1.1.2.1 correctly -> 10', () => {
    const date = dateToNr('1.1.1.2.1', c)
    expect(date.days).toBe(10)
    expect(date.display).toBe('1.1.1.2.1')
  })
  it('parses absolute date 1.1.2.2.1 correctly -> 91', () => {
    const date = dateToNr('1.1.2.2.1', c)
    expect(date.days).toBe(91)
    expect(date.display).toBe('1.1.2.2.1')
  })
})


describe('parseDaysToPositionalDateString zero-based ', () => {

  const c = zotaranConfig

  // it('parses absolute day -1 correctly -> -0.0.0.0.1', () => expect(nrToDate(-1, c)).toBe('-0.0.0.0.1'))
  // it('parses zero correctly 0 -> 0.0.0.0.0', () => expect(nrToDate(0, c)).toBe('0.0.0.0.0'))
  it('parses absolute day 1 correctly    1 -> 0.0.0.0.1', () => expect(nrToDate(1, c)).toBe('0.0.0.0.1'))
  it('parses interval start correctly    9 -> 0.0.0.1.0', () => expect(nrToDate(9, c)).toBe('0.0.0.1.0'))
  it('parses interval start correctly   81 -> 0.0.1.0.0', () => expect(nrToDate(81, c)).toBe('0.0.1.0.0'))
  it('parses interval start correctly  729 -> 0.1.0.0.0', () => expect(nrToDate(729, c)).toBe('0.1.0.0.0'))
  it('parses interval start correctly 6561 -> 1.0.0.0.0', () => expect(nrToDate(6561, c)).toBe('1.0.0.0.0'))

})

describe('parseDaysToPositionalDateString one-based ', () => {

  const c = zotaranOneBasedConfig

  // it('parses absolute day -1 correctly -> -1.1.1.1.1', () => expect(nrToDate(-1, c)).toBe('-1.1.1.1.1'))
  // it('parses zero correctly 0 -> 1.1.1.1.0', () => expect(nrToDate(0, c)).toBe('1.1.1.1.0'))
  it('parses absolute day 1 correctly    1 -> 1.1.1.1.1', () => expect(nrToDate(1, c)).toBe('1.1.1.1.1'))
  it('parses interval start correctly    2 -> 1.1.1.1.2', () => expect(nrToDate(2, c)).toBe('1.1.1.1.2'))
  it('parses interval start correctly    9 -> 1.1.1.1.9', () => expect(nrToDate(9, c)).toBe('1.1.1.1.9'))
  it('parses interval start correctly   10 -> 1.1.1.2.1', () => expect(nrToDate(10, c)).toBe('1.1.1.2.1'))
  it('parses interval start correctly   81 -> 1.1.1.9.9', () => expect(nrToDate(81, c)).toBe('1.1.1.9.9'))
  it('parses interval start correctly   82 -> 1.1.2.1.1', () => expect(nrToDate(82, c)).toBe('1.1.2.1.1'))
  it('parses interval start correctly  729 -> 1.1.9.9.9', () => expect(nrToDate(729, c)).toBe('1.1.9.9.9'))
  it('parses interval start correctly  730 -> 1.2.1.1.1', () => expect(nrToDate(730, c)).toBe('1.2.1.1.1'))
  it('parses interval start correctly 6561 -> 1.9.9.9.9', () => expect(nrToDate(6561, c)).toBe('1.9.9.9.9'))

})


// describe('parseDaysToPositionalDateString with noZero', () => {
//
//   it('parses absolute day one correctly', () => {
//     const result = parseDaysToPositionalDateString(1, zotaranNoZeroConfig)
//     expect(result).toBe('1.1.1.1.1')
//   })
//
//   // it('parses subsequent days correctly', () => {
//   //   const result = parseDaysToPositionalDateString(1, mayanNoZeroConfig)
//   //   expect(result).toBe('1.1.1.1.2')
//   // })
//   //
//   // it('parses a larger day offset correctly', () => {
//   //   // 20 days = 1 uinal increment
//   //   const result = parseDaysToPositionalDateString(20, mayanNoZeroConfig)
//   //   expect(result).toBe('1.1.1.2.1')
//   // })
// })
