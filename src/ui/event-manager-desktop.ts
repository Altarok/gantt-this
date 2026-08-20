import {ControlKey} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {GanttEventManager} from './event-manager'
import {TooltipManager} from './tooltip-manager-desktop'

export class GanttDesktopEventManager implements GanttEventManager {
  public isDragging = false

  private startX = 0
  private startTranslateX = 0
  private rafId: number | null = null
  private currentSvg: SVGElement | null = null
  private activeWindow: Window | null = null

  /* Bound handler references for clean removal */
  private readonly boundWindowMouseMove: (e: MouseEvent) => void
  private readonly boundWindowMouseUp: (e: MouseEvent) => void
  private readonly boundSvgMouseDown: (e: MouseEvent) => void
  private readonly boundSvgWheel: (e: WheelEvent) => void
  private readonly boundSvgMouseMove: () => void
  private readonly boundSvgClick: (e: MouseEvent) => void

  constructor(private engine: GanttRenderEngine,
              readonly autoRestrictZoom: boolean,
              readonly mouseOverEventShowBox: boolean,
              readonly mouseOverEventShowVerticalLine: boolean,
              readonly uxZoomKey: ControlKey,
              readonly uxPanKey: ControlKey) {
    // this.currentSvg = this.engine.svg
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

    const tooltipManager = new TooltipManager(this.engine, this.mouseOverEventShowBox, this.mouseOverEventShowVerticalLine);

    this.detachListeners()

    this.currentSvg = this.engine.svg
    if (!this.currentSvg) return

    this.activeWindow = this.currentSvg.ownerDocument.defaultView ?? window
    const plugin = this.engine.plugin

    plugin.registerDomEvent(this.activeWindow, 'mousemove', this.boundWindowMouseMove)
    plugin.registerDomEvent(this.activeWindow, 'mouseup', this.boundWindowMouseUp)
    plugin.registerDomEvent(this.activeWindow, 'blur', () => tooltipManager.hideTooltip())

    const svgEl = this.currentSvg as unknown as HTMLElement

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

    if (this.currentSvg) {
      this.currentSvg.removeEventListener('mousedown', this.boundSvgMouseDown)
      this.currentSvg.removeEventListener('wheel', this.boundSvgWheel)
      this.currentSvg.removeEventListener('mousemove', this.boundSvgMouseMove)
      this.currentSvg.removeEventListener('click', this.boundSvgClick)
      this.currentSvg = null
    }
  }

  private handleWindowMouseMove(e: MouseEvent) {
    /* Set coordinates for tooltip*/
    // const doc = this.activeDocument
    // doc.documentElement.style.setProperty('--mouse-x', `${e.clientX + 15}px`)
    // doc.documentElement.style.setProperty('--mouse-y', `${e.clientY + 15}px`)

    if (this.isDragging) {
      const deltaX = e.clientX - this.startX
      this.engine.zoomTranslateX = this.startTranslateX + deltaX

      this.rafId ??= window.requestAnimationFrame(() => {
        const width = this.engine.container.clientWidth || 800
        this.engine.renderData(width)
        this.engine.drawAxes(width)
        this.rafId = null
      })
    }
  }

  private handleSvgMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).hasAttribute('data-id')) return
    this.isDragging = true
    this.startX = e.clientX
    this.startTranslateX = this.engine.zoomTranslateX
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
    if (!this.currentSvg) return

    if (this.isModifierActive(e, this.uxZoomKey)) {
      e.preventDefault()
      this.zoom(e)
    } else if (this.isModifierActive(e, this.uxPanKey)) {
      e.preventDefault()
      this.pan(e)
    }
  }

  private pan(e: WheelEvent) {
    this.engine.zoomTranslateX = this.engine.zoomTranslateX - Math.floor(e.deltaY / 2)

    // Pan horizontally (and vertically if your timeline pans Y-axis too)
    this.rafId ??= window.requestAnimationFrame(() => {
      const width = this.engine.container.clientWidth || 800
      this.engine.renderData(width)
      this.engine.drawAxes(width)
      this.rafId = null
    })
  }

  private zoom(e: WheelEvent) {
    if (!this.currentSvg) return
    const width = this.engine.container.clientWidth || 800
    const rect = this.currentSvg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - this.engine.config.margin.left

    let zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    if (this.autoRestrictZoom && this.engine.stepDays < 2 && zoomFactor > 1) zoomFactor = 1
    let nextScale = this.engine.zoomScale * zoomFactor
    if (this.autoRestrictZoom && nextScale < 0.5) nextScale = 0.5

    this.engine.zoomTranslateX = mouseX - (mouseX - this.engine.zoomTranslateX) * (nextScale / this.engine.zoomScale)
    this.engine.zoomScale = nextScale

    this.engine.renderData(width)
    this.engine.drawAxes(width)
  }

  private handleSvgClick(event: MouseEvent) {
    const target = event.target as HTMLElement

    if (target?.hasAttribute('data-id')) {
      const rawId = target.getAttribute('data-id')
      if (rawId === null) return
      const id = Number(rawId)
      const link = this.engine.rawData.find(d => d.id === id)?.link
      if (link) {
        void this.engine.plugin.app.workspace.openLinkText(link, '', true)
      }
    }
  }

  private handleWindowMouseUp() {
    if (this.isDragging) {
      this.isDragging = false
    }
    this.stopAnimation()
  }

  /** Fully unhook and release all window and SVG listeners to prevent leaks */
  public destroy() {
    this.stopAnimation()
    this.detachListeners()
  }

  private stopAnimation() {
    if (this.rafId === null) return
    window.cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  private handleSvgMouseMove(): void {
    /* needs to exist for drag events */
  }
}
