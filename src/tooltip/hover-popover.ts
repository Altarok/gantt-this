import {HoverParent, HoverPopover} from 'obsidian'
import {GanttItem} from '../types/event-types'

/**
 * AI-assisted hell of a class which aligns itself to be contained on the screen.
 * Subclass of HoverPopover to populate content once, measure its actual height,
 * and position it correctly with boundary checking (no double creation / no flicker).
 */
export class SelfAligningHoverPopover extends HoverPopover {
  constructor(parent: HoverParent,
              private targetEl: HTMLElement,
              private ganttItem: GanttItem,
              private chartRect: DOMRect,
              private contentPopulator: (item: GanttItem, el: HTMLElement) => void) {
    super(parent, targetEl, -1)
  }

  onload() {
    super.onload()
    this.contentPopulator(this.ganttItem, this.hoverEl)
    this.hoverEl.setCssStyles({bottom: ''})
    // this.hoverEl.setCssStyles({outline: '1px solid red'})

    /*
     * TODO
     *
     * #9 (SelfAligningHoverPopover.onload bounds check): getBoundingClientRect() returns coordinates relative
     *  to the viewport, not the document. chartRect.height is just the element's height (for example, 500px).
     *  If the page is scrolled down so the chart's bottom is at 900px in the viewport and a hovered item is
     *  at y = 600px, comparing against chartRect.height - 10 (490px) treats 600px as past the bottom edge even
     * when space remains below (chartRect.bottom - 10).
     */

    const rect = this.hoverEl.getBoundingClientRect()
    const targetRect = this.targetEl.getBoundingClientRect()
    const spacing = 8

    let y = targetRect.top - rect.height - spacing
    let x = Math.max(targetRect.right, this.chartRect.left + 10)
    x = Math.min(x, this.chartRect.right - 10 - rect.width)

    if (y < 10) {
      y = targetRect.bottom + spacing
    }

    /*
     * - 1
     */
    if (y + rect.height > this.chartRect.height - 10) {
      y = Math.max(10, this.chartRect.height - rect.height - 10)
    }

    /*
     * - 2
     */
    // const maxBottom = Math.min(this.chartRect.bottom, window.innerHeight) - 10
    // if (y + rect.height > maxBottom) {
    //   y = Math.max(10, maxBottom - rect.height)
    // }


    if (x + rect.width > this.chartRect.right - 10) {
      x = Math.max(this.chartRect.left + 10, targetRect.right - rect.width - 10)
    }

    this.hoverEl.style.left = `${x}px`
    this.hoverEl.style.top = `${y}px`
  }
}
