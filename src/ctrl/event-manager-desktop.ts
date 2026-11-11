import {ControlKey} from '../types/settings-types'
import {GanttRenderEngine} from '../render/svg-drawer'
import {GanttEventManagerBase} from './event-manager'
import TooltipManager from './tooltip-manager-desktop'
import {ChartContext} from '../model/chart-context'

export class GanttDesktopEventManager extends GanttEventManagerBase {

  /* Bound handler references for clean removal */
  private readonly boundWindowMouseMove: (e: MouseEvent) => void
  private readonly boundWindowMouseUp: (e: MouseEvent) => void
  private readonly boundWindowMouseBlur: () => void
  private readonly boundSvgMouseDown: (e: MouseEvent) => void
  private readonly boundSvgWheel: (e: WheelEvent) => void
  private readonly boundSvgMouseMove: () => void
  private readonly boundSvgClick: (e: MouseEvent) => void


  constructor(chartCtx: ChartContext, engine: GanttRenderEngine,
              private readonly tooltipManager: TooltipManager) {
    super(chartCtx, engine, false)

    /* Bind all handlers _once_ */
    this.boundWindowMouseMove = this.handleWindowMouseMove.bind(this)
    this.boundWindowMouseUp = this.handleWindowMouseUp.bind(this)
    this.boundWindowMouseBlur = this.handleWindowMouseBlur.bind(this)
    this.boundSvgMouseDown = this.handleSvgMouseDown.bind(this)
    this.boundSvgWheel = this.handleSvgWheel.bind(this)
    this.boundSvgMouseMove = this.handleSvgMouseMove.bind(this)
    this.boundSvgClick = this.handleSvgClick.bind(this)


    this.attachListeners()
  }

  // protected getScrollableContainer(): HTMLElement | null {
  //   const isPopout = this.activeWindow?.document.body.classList.contains('is-popout-window')
  //   return isPopout ? this.engine.render.chartContainer
  //     : this.engine.view.container.parentElement
  // }

  public attachListeners() {

    const plugin = this.chartCtx.plugin

    if (this.activeWindow) {
      /* Placed on window for events to be able to end outside the chart */
      plugin.registerDomEvent(this.activeWindow, 'mousemove', this.boundWindowMouseMove)
      plugin.registerDomEvent(this.activeWindow, 'mouseup', this.boundWindowMouseUp)
      plugin.registerDomEvent(this.activeWindow, 'blur', this.boundWindowMouseBlur)
    }

    if (this.chartContainer) {
      // const svgEl: HTMLElement = this.svg as unknown as HTMLElement
      /* Placed on chart for events to start inside the chart */
      plugin.registerDomEvent(this.chartContainer, 'mousedown', this.boundSvgMouseDown)
      plugin.registerDomEvent(this.chartContainer, 'wheel', this.boundSvgWheel, {passive: false})
      plugin.registerDomEvent(this.chartContainer, 'mousemove', this.boundSvgMouseMove)
      plugin.registerDomEvent(this.chartContainer, 'click', this.boundSvgClick)
    }
  }

  detachListeners() {
    this.tooltipManager.destroy()

    if (this.activeWindow) {
      this.activeWindow.removeEventListener('mousemove', this.boundWindowMouseMove)
      this.activeWindow.removeEventListener('mouseup', this.boundWindowMouseUp)
      this.activeWindow.removeEventListener('blur', this.boundWindowMouseBlur)
      this.activeWindow = null
    }

    if (this.chartContainer) {
      this.chartContainer.removeEventListener('mousedown', this.boundSvgMouseDown)
      this.chartContainer.removeEventListener('wheel', this.boundSvgWheel)
      this.chartContainer.removeEventListener('mousemove', this.boundSvgMouseMove)
      this.chartContainer.removeEventListener('click', this.boundSvgClick)
      this.chartContainer = null
    }
  }

  private handleWindowMouseMove(e: MouseEvent) {
    if (this.isDragging) super.handleDragInteraction(e.clientX, e.clientY)
  }

  private handleSvgMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).hasAttribute('data-id')) return

    // /* Prevent Obsidian from interpreting this swipe as a sidebar trigger */
    // e.preventDefault()
    // e.stopPropagation()

    super.startDragInteraction(e.clientX, e.clientY)
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
    if (!this.chartContainer) return

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
    if (!this.chartContainer) return

    // Determine direction: positive factor zooms in (> 1), negative factor zooms out (< 1)
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15

    const rect = this.chartContainer.getBoundingClientRect()
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

  private handleWindowMouseBlur() {
    this.tooltipManager.hideTooltip('blur')
  }

  private handleSvgMouseMove(): void {
    /* needs to exist for drag events */
  }

}
