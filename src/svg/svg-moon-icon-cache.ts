import {generateManualMoonSvg} from './svg-icon-creator'

export class MoonIconCache {
  private cache = new Map<string, DocumentFragment>()

  private groesterGemeinsamerTeiler(a: number, b: number): number {
    return b === 0 ? a : this.groesterGemeinsamerTeiler(b, a % b)
  }

  private getCacheKey(phaseCount: number, step: number, colorFg: string, colorBg: string): string {
    const normalizedStep = ((step % phaseCount) + phaseCount) % phaseCount

    const divisor = this.groesterGemeinsamerTeiler(normalizedStep, phaseCount)
    const reducedStep = normalizedStep / divisor
    const reducedCount = phaseCount / divisor

    return `${reducedCount}:${reducedStep}:${colorFg}:${colorBg}`
  }

  public getMoonIcon(phaseCount: number, step: number, colorFg: string, colorBg: string): DocumentFragment {
    const key = this.getCacheKey(phaseCount, step, colorFg, colorBg)
    if (!this.cache.has(key)) {
      this.cache.set(key, generateManualMoonSvg(phaseCount, step, colorFg, colorBg))
    }
    return this.cache.get(key)!
  }

}
