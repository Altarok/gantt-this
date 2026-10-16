import {ControlKey} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {GanttEventManager} from './event-manager'
import TooltipManager from './tooltip-manager-desktop'
import {GanttChartModel} from '../model/gantt-chart-model'
import {ChartContext} from '../model/chart-context'

export class GanttDesktopEventManager implements GanttEventManager {
  public isDragging = false

  /** Absolute X-coordinate of mouse pointer at start of drag */
  private startX = 0
  private startTranslateX = 0
  /** Absolute Y-coordinate of mouse pointer at start of drag */
  private startDragMouseY = 0
  /** Absolute Scroll-bar position at start of drag */
  private startDragScrollTop = 0

  private rafId: number | null = null
  private svg: SVGElement | null = null
  private activeWindow: Window | null = null

  /* Bound handler references for clean removal */
  private readonly boundWindowMouseMove: (e: MouseEvent) => void
  private readonly boundWindowMouseUp: (e: MouseEvent) => void
  private readonly boundSvgMouseDown: (e: MouseEvent) => void
  private readonly boundSvgWheel: (e: WheelEvent) => void
  private readonly boundSvgMouseMove: () => void
  private readonly boundSvgClick: (e: MouseEvent) => void

  viewModel: GanttChartModel

  constructor(private readonly chartCtx: ChartContext,
              private readonly engine: GanttRenderEngine,
              private readonly tooltipManager: TooltipManager) {
    this.viewModel = engine.viewModel

    /* Bind all handlers _once_ */
    this.boundWindowMouseMove = this.handleWindowMouseMove.bind(this)
    this.boundWindowMouseUp = this.handleWindowMouseUp.bind(this)
    this.boundSvgMouseDown = this.handleSvgMouseDown.bind(this)
    this.boundSvgWheel = this.handleSvgWheel.bind(this)
    this.boundSvgMouseMove = this.handleSvgMouseMove.bind(this)
    this.boundSvgClick = this.handleSvgClick.bind(this)

    this.initGlobalListeners()
    this.attachSvgListeners()
  }

  private initGlobalListeners() {
    window.addEventListener('mousemove', this.boundWindowMouseMove)
    window.addEventListener('mouseup', this.boundWindowMouseUp)
  }

  public attachSvgListeners() {

    this.detachListeners()

    this.svg = this.engine.view.svg
    if (!this.svg) return

    this.activeWindow = this.svg.ownerDocument.defaultView ?? window
    const plugin = this.chartCtx.plugin

    plugin.registerDomEvent(this.activeWindow, 'mousemove', this.boundWindowMouseMove)
    plugin.registerDomEvent(this.activeWindow, 'mouseup', this.boundWindowMouseUp)
    plugin.registerDomEvent(this.activeWindow, 'blur', () => this.tooltipManager.hideTooltip('blur'))

    const svgEl = this.svg as unknown as HTMLElement

    plugin.registerDomEvent(svgEl, 'mousedown', this.boundSvgMouseDown)
    plugin.registerDomEvent(svgEl, 'wheel', this.boundSvgWheel, {passive: false})
    plugin.registerDomEvent(svgEl, 'mousemove', this.boundSvgMouseMove)
    plugin.registerDomEvent(svgEl, 'click', this.boundSvgClick)
  }

  private detachListeners() {
    if (this.activeWindow) {
      this.activeWindow.removeEventListener('mousemove', this.boundWindowMouseMove)
      this.activeWindow.removeEventListener('mouseup', this.boundWindowMouseUp)
      this.activeWindow = null
    }

    if (this.svg) {
      this.svg.removeEventListener('mousedown', this.boundSvgMouseDown)
      this.svg.removeEventListener('wheel', this.boundSvgWheel)
      this.svg.removeEventListener('mousemove', this.boundSvgMouseMove)
      this.svg.removeEventListener('click', this.boundSvgClick)
      this.svg = null
    }
  }

  private handleWindowMouseMove(e: MouseEvent) {
    if (this.isDragging) {

      const deltaX = e.clientX - this.startX
      const deltaY = e.clientY - this.startDragMouseY
      const targetTranslateX = this.startTranslateX + deltaX

      this.rafId ??= window.requestAnimationFrame(() => {
        if (this.engine.view.container.parentElement) {
          this.engine.view.container.parentElement.scrollTop = this.startDragScrollTop - deltaY
        }

        this.engine.panAbsoluteX(targetTranslateX)
        this.rafId = null
      })
    }
  }

  private handleSvgMouseDown(e: MouseEvent) {
    // if (e) this.logTouchEvent('handleSvgMouseDown', e)
    // console.log(`handleSvgMouseDown`, e.target)
    if ((e.target as HTMLElement).hasAttribute('data-id')) return

    // console.log(e.clientX)

    this.isDragging = true
    this.startX = e.clientX

    if (this.engine.view.container.parentElement) {
      this.startDragMouseY = e.clientY
      this.startDragScrollTop = this.engine.view.container.parentElement.scrollTop
    }


    this.startTranslateX = this.viewModel.panTranslateX
    // this.startTranslateY = this.viewModel.panTranslateY
  }

  private isModifierActive(e: MouseEvent, key: ControlKey): boolean {
    switch (key) {
      case 'ctrl':
        return e.ctrlKey
      case 'alt':
        return e.altKey
      case 'shift':
        return e.shiftKey
    }
  }

  private handleSvgWheel(e: WheelEvent) {
    // if (e) this.logTouchEvent('handleSvgWheel', e)
    if (!this.svg) return

    if (this.isModifierActive(e, this.settings.uxZoomButton)) {
      e.preventDefault()
      this.mouseWheelZoom(e)
    } else if (this.isModifierActive(e, this.settings.uxPanButton)) {
      e.preventDefault()
      this.mouseWheelPan(e)
    }
  }

  private mouseWheelPan(e: WheelEvent) {
    const deltaX = -Math.floor(e.deltaY / 2)

    // Pan horizontally (and vertically if your timeline pans Y-axis too)
    this.rafId ??= window.requestAnimationFrame(() => {
      this.engine.panDiff(deltaX)
      this.rafId = null
    })
  }

  private mouseWheelZoom(e: WheelEvent) {
    if (!this.svg) return

    // Determine direction: positive factor zooms in (> 1), negative factor zooms out (< 1)
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15

    const rect = this.svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - this.viewModel.margin.left

    // Delegate to GanttRenderEngine
    this.engine.zoom(factor, mouseX)
  }

  private handleSvgClick(event: MouseEvent) {
    // if (event) this.logTouchEvent('handleSvgClick', event)
    const target = event.target as HTMLElement

    if (target?.hasAttribute('data-id')) {
      const id = target.getAttribute('data-id')
      if (id === null) return
      const link = this.engine.rawData.find(d => d.id === id)?.link
      if (link) void this.chartCtx.workspace.openLinkText(link, '', true)
    }
  }

  private handleWindowMouseUp() {
    // console.log(`handleWindowMouseUp`)
    if (this.isDragging) {
      this.isDragging = false
      /*
       * Doing a final 0-diff pan re-draws event text and icons
       * (which do not get drawn while panning)
       */
      this.engine.panDiff(0)
    }
    this.stopAnimation()
  }

  /** Fully unhook and release all window and SVG listeners to prevent leaks */
  public destroy() {
    this.stopAnimation()
    this.detachListeners()
  }

  private stopAnimation() {
    if (this.rafId) window.cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  private handleSvgMouseMove(): void {
    /* needs to exist for drag events */
  }

  private get settings() {
    return this.chartCtx.settings
  }

  // private logTouchEvent(type: string, e: MouseEvent) {
  //   const formatTouches = (list: TouchList) =>
  //     Array.from(list).map(t => ({
  //       id: t.identifier,
  //       clientX: Math.round(t.clientX),
  //       clientY: Math.round(t.clientY),
  //       target: (t.target as HTMLElement)?.tagName ?? 'unknown'
  //     }))
  //
  //   console.log(`[Touch Debug: ${type}]`, {
  //     cancelable: e.cancelable,
  //     defaultPrevented: e.defaultPrevented,
  //     // touchesCount: e.touches.length,
  //     // targetTouchesCount: e.targetTouches.length,
  //     // changedTouchesCount: e.changedTouches.length,
  //     // touches: formatTouches(e.touches),
  //     // changedTouches: formatTouches(e.changedTouches)
  //   })
  // }

}
