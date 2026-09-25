import {GanttRenderEngine} from '../view/svg-drawer'
import {GanttEventManager} from './event-manager'
import {GanttChartViewModel} from "../model/gantt-chart-model";

export class GanttMobileEventManager implements GanttEventManager {
  public isDragging = false

  private startX = 0
  private startTranslateX = 0
  private pinchDistance: number | null = null
  private rafId: number | null = null
  private svg: SVGElement | null = null

  private touchStartPos: { x: number; y: number } | null = null
  private isPinching = false
  private activeWindow: Window | null = null

  /* Bound handler references for clean removal */
  private readonly boundWindowTouchMove: (e: TouchEvent) => void
  private readonly boundWindowTouchEnd: (e: TouchEvent) => void
  private readonly boundSvgTouchStart: (e: TouchEvent) => void
  private readonly boundSvgClick: (e: MouseEvent) => void
  private readonly boundSvgWheel: (e: WheelEvent) => void // todo test

  viewConfig: GanttChartViewModel

  constructor(private engine: GanttRenderEngine) {
    this.viewConfig = engine.viewConfig

    this.boundWindowTouchMove = this.handleTouchMove.bind(this)
    this.boundWindowTouchEnd = this.handleTouchEnd.bind(this)
    this.boundSvgTouchStart = this.handleTouchStart.bind(this)
    this.boundSvgClick = this.handleClick.bind(this)
    this.boundSvgWheel = this.handleWheel.bind(this) // todo test

    this.attachSvgListeners()
  }

  public attachSvgListeners() {
    this.detachListeners()

    this.svg = this.engine.view.svg
    if (!this.svg) return

    this.activeWindow = this.svg.ownerDocument.defaultView ?? window
    this.activeWindow.addEventListener('touchmove', this.boundWindowTouchMove, {passive: false})
    this.activeWindow.addEventListener('touchend', this.boundWindowTouchEnd)
    this.activeWindow.addEventListener('touchcancel', this.boundWindowTouchEnd)

    this.svg.addEventListener('touchstart', this.boundSvgTouchStart, {passive: false})
    this.svg.addEventListener('click', this.boundSvgClick)
    this.svg.addEventListener('wheel', this.boundSvgWheel, {passive: false}) //  todo test
  }

  private detachListeners() {
    if (this.activeWindow) {
      this.activeWindow.removeEventListener('touchmove', this.boundWindowTouchMove)
      this.activeWindow.removeEventListener('touchend', this.boundWindowTouchEnd)
      this.activeWindow.removeEventListener('touchcancel', this.boundWindowTouchEnd)
      this.activeWindow = null
    }

    if (this.svg) {
      this.svg.removeEventListener('touchstart', this.boundSvgTouchStart)
      this.svg.removeEventListener('click', this.boundSvgClick)
      this.svg.removeEventListener('wheel', this.boundSvgWheel) //  todo test
      this.svg = null
    }
  }


  private handleTouchMove(e: TouchEvent) {
    this.logTouchEvent('touchmove', e)
    if (e.touches.length === 1 && this.isDragging) {
      // Prevent default scroll / panel drag behavior
      e.preventDefault()
      e.stopPropagation()

      const deltaX = e.touches[0]!.clientX - this.startX
      const targetTranslateX = this.startTranslateX + deltaX
      this.rafId ??= window.requestAnimationFrame(() => {
        this.engine.panAbsolute(targetTranslateX)
        this.rafId = null
      })
    } else if (e.touches.length === 2 && this.pinchDistance) {
      if (e.cancelable) e.preventDefault()
      this.handlePinchZoom(e)
    }
  }

  private handleTouchStart(e: TouchEvent) {
    this.logTouchEvent('touchstart', e)
    // Prevent Obsidian from interpreting this swipe as a sidebar trigger
    e.stopPropagation()

    if (e.touches.length === 1) {
      const touch = e.touches[0]!
      this.isDragging = true
      this.isPinching = false
      this.startX = touch.clientX
      this.startTranslateX = this.viewConfig.panTranslateX
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

    const target = e.target as HTMLElement
    const rawId = target?.getAttribute?.('data-id')
    if (rawId === null || rawId === undefined) return

    const id = Number(rawId)
    const link = this.engine.rawData.find(d => d.id === id)?.link
    if (link) {
      void this.engine.plugin.app.workspace.openLinkText(link, '', true)
    }
  }

  private handlePinchZoom(e: TouchEvent) {
    if (!this.svg || e.touches.length < 2 || this.pinchDistance === null) return

    const t1 = e.touches[0]!
    const t2 = e.touches[1]!
    const currentDistance = this.getTouchDistance(t1, t2)

    if (currentDistance === 0) return

    const rect = this.svg.getBoundingClientRect()
    const touchMidX = (t1.clientX + t2.clientX) / 2 - rect.left - this.engine.viewConfig.margin.left

    const frameFactor = currentDistance / this.pinchDistance
    this.pinchDistance = currentDistance
    this.rafId ??= window.requestAnimationFrame(() => {
      this.engine.zoom(frameFactor, touchMidX) /* delegate to renderer */
      this.rafId = null
    })
  }

  private handleWheel(e: WheelEvent) {
    // DevTools pinch simulation & physical trackpads emit wheel events with ctrlKey = true
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      if (!this.svg) return

      const rect = this.svg.getBoundingClientRect()
      const focusX = e.clientX - rect.left - this.engine.viewConfig.margin.left
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92

      this.rafId ??= window.requestAnimationFrame(() => {
        this.engine.zoom(zoomFactor, focusX)
        this.rafId = null
      })
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    if (e) this.logTouchEvent('touchend', e)
    this.isDragging = false
    this.isPinching = false
    this.pinchDistance = null
    this.touchStartPos = null
    this.destroyAnimation()
  }

  private logTouchEvent(type: string, e: TouchEvent) {
    const formatTouches = (list: TouchList) =>
      Array.from(list).map(t => ({
        id: t.identifier,
        clientX: Math.round(t.clientX),
        clientY: Math.round(t.clientY),
        target: (t.target as HTMLElement)?.tagName ?? 'unknown'
      }))

    console.log(`[Touch Debug: ${type}]`, {
      cancelable: e.cancelable,
      defaultPrevented: e.defaultPrevented,
      touchesCount: e.touches.length,
      targetTouchesCount: e.targetTouches.length,
      changedTouchesCount: e.changedTouches.length,
      touches: formatTouches(e.touches),
      changedTouches: formatTouches(e.changedTouches)
    })
  }

  public destroy() {
    this.destroyAnimation()
    this.detachListeners()
  }

  private destroyAnimation() {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private getTouchDistance(t1: Touch, t2: Touch): number {
    return this.getDistance(t1.clientX, t1.clientY, t2.clientX, t2.clientY)
  }

  private getTouchDistanceHorizontal(t1: Touch, t2: Touch): number {
    return t2.clientX - t1.clientX
  }

  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x1 - x2, y1 - y2)
  }

}
