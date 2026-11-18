import {describe, expect, it} from 'vitest'
import {getDistinctPrimeFactors, getDivisors} from '../src/util/mathe'

describe('getDistinctPrimeFactors', () => {

  it('returns prime factors for prime numbers', () => {
    expect(getDistinctPrimeFactors(7)).toEqual([7])
    expect(getDistinctPrimeFactors(13)).toEqual([13])
  })

  it('returns distinct prime factors for composite numbers', () => {
    expect(getDistinctPrimeFactors(12)).toEqual([2, 3])
    expect(getDistinctPrimeFactors(100)).toEqual([2, 5])
  })

  it('handles powers of a single prime', () => {
    expect(getDistinctPrimeFactors(8)).toEqual([2])
    expect(getDistinctPrimeFactors(81)).toEqual([3])
  })

  it('handles edge cases like 1', () => {
    expect(getDistinctPrimeFactors(1)).toEqual([])
  })
})

describe('getDivisors', () => {
  it('returns divisors for prime numbers', () => {
    expect(getDivisors(7)).toEqual([1, 7])
  })

  it('returns all divisors for composite numbers sorted', () => {
    expect(getDivisors(12)).toEqual([1, 2, 3, 4, 6, 12])
    expect(getDivisors(100)).toEqual([1, 2, 4, 5, 10, 20, 25, 50, 100])
  })

  it('handles squares correctly', () => {
    expect(getDivisors(9)).toEqual([1, 3, 9])
  })

  it('handles 1', () => {
    expect(getDivisors(1)).toEqual([1])
  })

  it('reverts order properly', () => {
    expect(getDivisors(12, false)).toEqual([12, 6, 4, 3, 2, 1])
    expect(getDivisors(100, false)).toEqual([100, 50, 25, 20, 10, 5, 4, 2, 1])
  })
})
