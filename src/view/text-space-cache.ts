/**
 * Tracks rendered label positions per horizontal timeline row to prevent overlap.
 */
export default class TextWidthCache {
  private cache: Record<string, number>
  private svgCache: Record<string, number>

  constructor(readonly badgePadding = 12) {
    this.cache = {}
    this.svgCache = {}
  }

  getSvgWidth(svg: SVGTextElement, groupName: string): number {
    const text = groupName.toUpperCase()
    // svg.textContent = text
    if (this.svgCache[text] !== undefined) return this.svgCache[text]

    const w = (svg.getComputedTextLength() || text.length * 6.5) + 20

    this.svgCache[text] = w
    return w
  }

  getWidth(text: string): number {
    if (this.cache[text] !== undefined) return this.cache[text]

    const w = this.measureTextWidth(text)
    this.cache[text] = w
    return w
  }

  private measureTextWidth(text: string): number {
    const canvas = window.createEl('canvas')
    const context = canvas.getContext('2d')
    if (!context) return text.length * 8

    /* Match: font-size: 0.75em (~12px in default Obsidian), font-weight: bold */
    context.font = 'bold 12px sans-serif'

    /* Explicitly measure uppercase because CSS applies text-transform: uppercase */
    return context.measureText(text.toUpperCase()).width + this.badgePadding
  }

  public reset(): void {
    this.cache = {}
    this.svgCache = {}
  }

}
