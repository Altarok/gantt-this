import {GanttRenderEngine} from './svg-drawer'
import {GanttEventManager} from './event-manager'

export class GanttMobileEventManager implements GanttEventManager {
  public isDragging = false

  private startX = 0
  private startTranslateX = 0
  private pinchDistance: number | null = null
  private initialZoomScale = 1
  private rafId: number | null = null
  private svg: SVGElement | null = null
  private readonly autoRestrictZoom: boolean

  private touchStartPos: { x: number; y: number } | null = null
  private isPinching = false
  private activeWindow: Window | null = null

  /* Bound handler references for clean removal */
  private readonly boundWindowTouchMove: (e: TouchEvent) => void
  private readonly boundWindowTouchEnd: (e: TouchEvent) => void
  private readonly boundSvgTouchStart: (e: TouchEvent) => void
  private readonly boundSvgClick: (e: MouseEvent) => void


  constructor(private engine: GanttRenderEngine) {
    this.autoRestrictZoom = this.engine.plugin.settings.autoRestrictZoom

    this.boundWindowTouchMove = this.handleTouchMove.bind(this)
    this.boundWindowTouchEnd = this.handleTouchEnd.bind(this)
    this.boundSvgTouchStart = this.handleTouchStart.bind(this)
    this.boundSvgClick = this.handleClick.bind(this)

    this.attachSvgListeners()
  }


  public attachSvgListeners() {
    this.detachListeners()

    this.svg = this.engine.svg
    if (!this.svg) return

    this.activeWindow = this.svg.ownerDocument.defaultView ?? window
    this.activeWindow.addEventListener('touchmove', this.boundWindowTouchMove, {passive: false})
    this.activeWindow.addEventListener('touchend', this.boundWindowTouchEnd)
    this.activeWindow.addEventListener('touchcancel', this.boundWindowTouchEnd)

    this.svg.addEventListener('touchstart', this.boundSvgTouchStart, {passive: true})
    this.svg.addEventListener('click', this.boundSvgClick)
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
      this.svg = null
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (e.touches.length === 1 && this.isDragging) {
      if (e.cancelable) e.preventDefault()
      this.engine.zoomTranslateX = this.startTranslateX + (e.touches[0]!.clientX - this.startX)
      this.scheduleRender()
    } else if (e.touches.length === 2 && this.pinchDistance) {
      if (e.cancelable) e.preventDefault()
      this.handlePinchZoom(e)
    }
  }

  private handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0]!
      this.isDragging = true
      this.isPinching = false
      this.startX = touch.clientX
      this.startTranslateX = this.engine.zoomTranslateX
      this.touchStartPos = {x: touch.clientX, y: touch.clientY}
    } else if (e.touches.length === 2) {
      this.isDragging = false
      this.isPinching = true
      this.pinchDistance = this.getTouchDistance(e.touches[0]!, e.touches[1]!)
      this.initialZoomScale = this.engine.zoomScale
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
    const touchMidX = (t1.clientX + t2.clientX) / 2 - rect.left - this.engine.config.margin.left

    const pinchFactor = currentDistance / this.pinchDistance
    let nextScale = this.initialZoomScale * pinchFactor

    if (this.autoRestrictZoom && this.engine.stepDays < 2 && nextScale > this.engine.zoomScale) {
      nextScale = this.engine.zoomScale
    }
    if (this.autoRestrictZoom && nextScale < 0.5) {
      nextScale = 0.5
    }

    this.engine.zoomTranslateX = touchMidX - (touchMidX - this.engine.zoomTranslateX) * (nextScale / this.engine.zoomScale)
    this.engine.zoomScale = nextScale

    this.scheduleRender()
  }

  private scheduleRender() {
    this.rafId ??= window.requestAnimationFrame(() => {
      const width = this.engine.container.clientWidth || 800
      this.engine.renderData(width)
      this.engine.drawAxes(width)
      this.rafId = null
    })
  }

  private handleTouchEnd() {
    this.isDragging = false
    this.pinchDistance = null
    this.touchStartPos = null
    this.destroyAnimation()
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

  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x1 - x2, y1 - y2)
  }

}
