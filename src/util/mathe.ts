/**
 * Calculates the Greatest Common Divisor using the Euclidean algorithm.
 * greatest common divisor = Groesster gemeinsamer Teiler
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
