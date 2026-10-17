import {GanttRenderEngine} from '../view/svg-drawer'
import {GanttEventManagerBase} from './event-manager'
import {ChartContext} from '../model/chart-context'

export class GanttMobileEventManager extends GanttEventManagerBase {

  private isPinching = false
  private pinchDistance: number | null = null
  private touchStartPos: { x: number; y: number } | null = null

  /* Bound handler references for clean removal */
  private readonly boundWindowTouchMove: (e: TouchEvent) => void
  private readonly boundWindowTouchEnd: (e: TouchEvent) => void
  private readonly boundSvgTouchStart: (e: TouchEvent) => void
  private readonly boundSvgClick: (e: MouseEvent) => void

  constructor(chartCtx: ChartContext, engine: GanttRenderEngine) {
    super(chartCtx, engine)

    this.boundWindowTouchMove = this.handleTouchMove.bind(this)
    this.boundWindowTouchEnd = this.handleTouchEnd.bind(this)
    this.boundSvgTouchStart = this.handleTouchStart.bind(this)
    this.boundSvgClick = this.handleClick.bind(this)

    if (this.svg && this.activeWindow)
      this.attachListeners(this.svg as unknown as HTMLElement, this.activeWindow)
  }

  protected getScrollableContainer(): HTMLElement | null {
    return this.engine.view.container.parentElement
  }

  public attachListeners(svgEl: HTMLElement, activeWindow: Window) {

    const plugin = this.chartCtx.plugin

    /* Placed on window for events to be able to end outside the chart */
    plugin.registerDomEvent(activeWindow, 'touchmove', this.boundWindowTouchMove, {passive: false})
    plugin.registerDomEvent(activeWindow, 'touchend', this.boundWindowTouchEnd)
    plugin.registerDomEvent(activeWindow, 'touchcancel', this.boundWindowTouchEnd)

    /* Placed on chart for events to start inside the chart */
    plugin.registerDomEvent(svgEl, 'touchstart', this.boundSvgTouchStart, {passive: false})
    plugin.registerDomEvent(svgEl, 'click', this.boundSvgClick)
  }

  detachListeners() {
    if (this.activeWindow) {
      this.activeWindow.removeEventListener('touchmove', this.boundWindowTouchMove)
      this.activeWindow.removeEventListener('touchend', this.boundWindowTouchEnd)
      this.activeWindow.removeEventListener('touchcancel', this.boundWindowTouchEnd)
      this.activeWindow = null
    }

    if (this.svg) {
      this.svg.removeEventListener('touchstart', this.boundSvgTouchStart)
      this.svg.removeEventListener('click', this.boundSvgClick)
      this.svg = null
    }
  }

  /**
   * Default swipe interaction has to be prevented,
   * otherwise the left and reight ribbons would open all the time.
   */
  private handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault()
      e.stopPropagation()

      const touch = e.touches[0]!
      super.handleDragInteraction(touch.clientX, touch.clientY)

    } else if (e.touches.length === 2 && this.pinchDistance) {
      if (e.cancelable) e.preventDefault()
      this.handlePinchZoom(e)
    }
  }

  private handleTouchStart(e: TouchEvent) {
    // Prevent Obsidian from interpreting this swipe as a sidebar trigger
    e.stopPropagation()

    if (e.touches.length === 1) {
      const touch = e.touches[0]!
      this.isPinching = false

      super.startDragInteraction(touch.clientX, touch.clientY)

      this.touchStartPos = {x: touch.clientX, y: touch.clientY}
    } else if (e.touches.length === 2) {
      this.isDragging = false
      this.isPinching = true
      this.pinchDistance = this.getTouchDistance(e.touches[0]!, e.touches[1]!)
    }
  }

  private handleClick(e: MouseEvent) {
    if (this.isPinching) return

    if (this.touchStartPos) {
      const dist = this.getDistance(e.clientX, e.clientY, this.touchStartPos.x, this.touchStartPos.y)
      if (dist > 10) return // Slop threshold in pixels
    }

    super.openEventFileInNewTab(e.target as HTMLElement)
  }

  private handlePinchZoom(e: TouchEvent) {
    if (!this.svg || e.touches.length < 2 || this.pinchDistance === null) return

    const t1 = e.touches[0]!
    const t2 = e.touches[1]!
    const currentDistance = this.getTouchDistance(t1, t2)

    if (currentDistance === 0) return

    const rect = this.svg.getBoundingClientRect()
    const touchMidX = (t1.clientX + t2.clientX) / 2 - rect.left - this.engine.viewModel.margin.left

    const frameFactor = currentDistance / this.pinchDistance
    this.pinchDistance = currentDistance
    this.rafId ??= this.activeWindow?.requestAnimationFrame(() => {
      this.engine.zoom(frameFactor, touchMidX) /* delegate to renderer */
      this.rafId = undefined
    })
  }

  private handleTouchEnd() {
    this.isPinching = false
    this.pinchDistance = null
    this.touchStartPos = null
    super.handleEndInteraction()
  }

  private getTouchDistance(t1: Touch, t2: Touch): number {
    return this.getDistance(t1.clientX, t1.clientY, t2.clientX, t2.clientY)
  }

  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x1 - x2, y1 - y2)
  }

}
