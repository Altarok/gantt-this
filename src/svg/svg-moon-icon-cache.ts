import {generateManualMoonSvg} from './svg-icon-creator'
import {gcd} from '../util/mathe'

/**
 * Caches dynamically generated moon phase icons to avoid redundant DOM allocations.
 */
export class MoonIconCache {
  private cache = new Map<string, DocumentFragment>()


  private getCacheKey(phaseCount: number, step: number, colorFg: string, colorBg: string): string {
    const normalizedStep = ((step % phaseCount) + phaseCount) % phaseCount

    const divisor = gcd(normalizedStep, phaseCount)
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
