import {ControlKey} from '../const/types'
import {GanttRenderEngine} from '../view/svg-drawer'
import {GanttEventManagerBase} from './event-manager'
import TooltipManager from './tooltip-manager-desktop'
import {ChartContext} from '../model/chart-context'

export class GanttDesktopEventManager extends GanttEventManagerBase {

  /* Bound handler references for clean removal */
  private readonly boundWindowMouseMove: (e: MouseEvent) => void
  private readonly boundWindowMouseUp: (e: MouseEvent) => void
  private readonly boundSvgMouseDown: (e: MouseEvent) => void
  private readonly boundSvgWheel: (e: WheelEvent) => void
  private readonly boundSvgMouseMove: () => void
  private readonly boundSvgClick: (e: MouseEvent) => void


  constructor(chartCtx: ChartContext, engine: GanttRenderEngine,
              private readonly tooltipManager: TooltipManager) {
    super(chartCtx, engine)

    /* Bind all handlers _once_ */
    this.boundWindowMouseMove = this.handleWindowMouseMove.bind(this)
    this.boundWindowMouseUp = this.handleWindowMouseUp.bind(this)
    this.boundSvgMouseDown = this.handleSvgMouseDown.bind(this)
    this.boundSvgWheel = this.handleSvgWheel.bind(this)
    this.boundSvgMouseMove = this.handleSvgMouseMove.bind(this)
    this.boundSvgClick = this.handleSvgClick.bind(this)

    if (this.svg && this.activeWindow)
      this.attachSvgListeners(this.svg as unknown as HTMLElement, this.activeWindow)
  }

  protected getScrollableContainer(): HTMLElement | null {
    const isPopout = this.activeWindow?.document.body.classList.contains('is-popout-window')
    return isPopout ? this.engine.view.chartContainer
      : this.engine.view.container.parentElement
  }

  public attachSvgListeners(svgEl: HTMLElement,
                            activeWindow: Window) {

    const plugin = this.chartCtx.plugin

    /* Placed on window for events to be able to end outside the chart */
    plugin.registerDomEvent(activeWindow, 'mousemove', this.boundWindowMouseMove)
    plugin.registerDomEvent(activeWindow, 'mouseup', this.boundWindowMouseUp)
    plugin.registerDomEvent(activeWindow, 'blur', () => this.tooltipManager.hideTooltip('blur'))

    /* Placed on chart for events to start inside the chart */
    plugin.registerDomEvent(svgEl, 'mousedown', this.boundSvgMouseDown)
    plugin.registerDomEvent(svgEl, 'wheel', this.boundSvgWheel, {passive: false})
    plugin.registerDomEvent(svgEl, 'mousemove', this.boundSvgMouseMove)
    plugin.registerDomEvent(svgEl, 'click', this.boundSvgClick)
  }

  detachListeners() {
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
    if (this.isDragging) super.handleDragInteraction(e.clientX, e.clientY)
  }

  private handleSvgMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).hasAttribute('data-id')) return

    this.isDragging = true
    this.startX = e.clientX

    if (this.scrollableContainer) {
      this.startDragMouseY = e.clientY
      this.startDragScrollTop = this.scrollableContainer.scrollTop
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
    this.rafId ??= this.activeWindow?.requestAnimationFrame(() => {
      this.engine.panDiff(deltaX)
      this.rafId = undefined
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

  private handleSvgClick(e: MouseEvent) {
    super.openEventFileInNewTab(e.target as HTMLElement)
  }

  private handleWindowMouseUp() {
    super.handleEndInteraction()
  }

  private handleSvgMouseMove(): void {
    /* needs to exist for drag events */
  }

}
