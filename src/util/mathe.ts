/**
 * Calculates the Greatest Common Divisor using the Euclidean algorithm.
 * greatest common divisor = größter gemeinsamer Teiler
 */
export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * Calculates the distinct prime factors of a given positive integer.
 * @param n - The positive integer to factorize
 * @returns An array of distinct prime factors in ascending order
 */
export function getDistinctPrimeFactors(n: number): number[] {
  const factors: number[] = []
  let current = n

  for (let i = 2; i * i <= current; i++) {
    if (current % i === 0) {
      factors.push(i)
      while (current % i === 0) {
        current /= i
      }
    }
  }

  if (current > 1) {
    factors.push(current)
  }

  return factors
}

/**
 * Calculates all divisors of a positive integer.
 * @param n - The positive integer
 * @param ascending - True -> result will be returned in Ascending order. False -> Descending order
 * @returns An array of divisors sorted accordingly
 */
export function getDivisors(n: number, ascending = true): number[] {
  const divisors: number[] = []
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) {
      divisors.push(i)
      if (i * i !== n) {
        divisors.push(n / i)
      }
    }
  }
  return divisors.sort((a, b) => ascending ? a - b : b - a)
}

/**
 * Helper to format large numbers (like years) with commas or dynamic compact units (M/B).
 */
export function shortenLargeNumber(rawVal: number): string {
  const value = Math.abs(rawVal)
  const prefix = rawVal < 0 ? '-' : ''
  if (value >= 1_000_000_000) return `${prefix}${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M`
  if (value >= 100_000) return `${prefix}${(value / 1_000).toFixed(1)}K`
  if (value >= 10_000) return `${prefix}${value.toLocaleString('en-US')}`
  return `${prefix}${value.toString().padStart(4, '0')}`
}

/**
 * Formats an integer number with commas every three digits from the right.
 * Usage of regex OK, since this is only used to create tooltips.
 */
export function formatIntegerWithCommas(integerPart: number): string {
  return String(integerPart).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// /**
//  * Formats a number or bigint with commas every three digits from the right.
//  */
// function formatWithCommas(value: number | bigint): string {
//   const [integerPart, decimalPart] = value.toString().split('.')
//   const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
//
//   return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger
// }
