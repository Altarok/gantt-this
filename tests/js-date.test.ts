import {describe, expect, it} from 'vitest'

/*
  * 719162 = days between 1-1-1 and 1970-1-1
  */
const zeroOffset = -719162

describe('EpochGregorian date offset calculation', () => {

  it('works without offset', () => {

    let epochDate = new Date('0001-01-01')
    let epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))

    expect(epochDaysOffset).toBe(zeroOffset)

    epochDate = new Date('0001-01-02')
    epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))

    expect(epochDaysOffset).toBe(zeroOffset + 1)

    epochDate = new Date('0001-01-03')
    epochDaysOffset = Math.floor(epochDate.getTime() / (24 * 60 * 60 * 1000))

    expect(epochDaysOffset).toBe(zeroOffset + 2)

  })
})
