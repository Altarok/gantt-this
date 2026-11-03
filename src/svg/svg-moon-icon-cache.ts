import {generateManualMoonSvg} from './svg-icon-creator'

/**
 * Caches dynamically generated moon phase icons to avoid redundant DOM allocations.
 */
export class MoonIconCache {
  private cache = new Map<string, DocumentFragment>()

  /**
   * Calculates the greatest common divisor using the Euclidean algorithm.
   * greatest common divisor = Groesster gemeinsamer Teiler
   */
  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b)
  }

  private getCacheKey(phaseCount: number, step: number, colorFg: string, colorBg: string): string {
    const normalizedStep = ((step % phaseCount) + phaseCount) % phaseCount

    const divisor = this.gcd(normalizedStep, phaseCount)
    const reducedStep = normalizedStep / divisor
    const reducedCount = phaseCount / divisor

    return `${reducedCount}:${reducedStep}:${colorFg}:${colorBg}`
  }

  /**
   * Retrieves a cached moon icon fragment or generates a new one.
   * Uses cloneNode to prevent fragment consumption upon DOM insertion.
   */
  public getMoonIcon(phaseCount: number, step: number, colorFg: string, colorBg: string): DocumentFragment {
    const key = this.getCacheKey(phaseCount, step, colorFg, colorBg)
    if (!this.cache.has(key)) {
      this.cache.set(key, generateManualMoonSvg(phaseCount, step, colorFg, colorBg))
    }
    return this.cache.get(key)!
  }

}
