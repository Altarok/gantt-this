import {describe, expect, it} from 'vitest'

/*
  * 719162 = days between 1-1-1 and 1970-1-1
  */
const zeroOffset = -719162

/**
 * @param epochGregorian beware that month has an offset of 1 -> month input = 1 -> january
 */
const newOffsetDate = (epochGregorian: { year: number, month: number, day: number } | number = 0) => {
  /* Always start with Monday, 1 AD January 1st */
  const date = new Date('0001-01-01')

  if (typeof epochGregorian === 'number') {
    date.setDate(date.getDate() + epochGregorian as number)
  } else {
    date.setFullYear(epochGregorian.year, epochGregorian.month - 1, epochGregorian.day)
  }
  return date
}


describe('EpochGregorian date offset calculation', () => {

  it('works without offset', () => {

    let epochDate = newOffsetDate()
    let epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))

    expect(epochDaysOffset).toBe(zeroOffset)
    expect(epochDate.getFullYear()).toBe(1)
    expect(epochDate.getMonth()).toBe(0) /* 0 is January */
    expect(epochDate.getDay()).toBe(1)

    epochDate = newOffsetDate({year: 1, month: 1, day: 1})
    epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))

    expect(epochDaysOffset).toBe(zeroOffset)
    expect(epochDate.getFullYear()).toBe(1)
    expect(epochDate.getMonth()).toBe(0) /* 0 is January */
    expect(epochDate.getDay()).toBe(1)


    epochDate = newOffsetDate({year: 1, month: 1, day: 3})
    epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))

    expect(epochDaysOffset).toBe(zeroOffset + 2)
    expect(epochDate.getFullYear()).toBe(1)
    expect(epochDate.getMonth()).toBe(0) /* 0 is January */
    expect(epochDate.getDay()).toBe(3)

  })
})
