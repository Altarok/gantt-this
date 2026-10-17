import {GanttRenderEngine} from '../view/svg-drawer'
import {ChartContext} from '../model/chart-context'
import {GanttChartModel} from '../model/gantt-chart-model'

export type GanttEventManager = {
  /** Whether a drag or gesture interaction is currently in progress */
  isDragging: boolean
  /** Attaches or re-binds SVG event listeners */
  // attachSvgListeners(): void
  /** Unbinds all window and SVG listeners and cleans up pending animation frames */
  destroy(): void
}

/**
 * Event manager for panning, zooming, scrolling and so on.
 * Will be implemented by either a mobile version or a desktop version.
 * Shared code to be placed in here
 */
export abstract class GanttEventManagerBase implements GanttEventManager {
  /** Whether a drag or gesture interaction is currently in progress */
  public isDragging = false

  /** Absolute X-coordinate of mouse pointer at start of drag */
  protected startX = 0
  protected startTranslateX = 0

  /** Absolute Y-coordinate of mouse pointer at start of drag */
  protected startDragMouseY = 0
  /** Absolute Scroll-bar position at start of drag */
  protected startDragScrollTop = 0

  /** Reference to current */
  protected rafId: number | undefined = undefined

  protected readonly viewModel: GanttChartModel
  protected svg: SVGElement | null
  protected activeWindow: Window | null
  /**
   * Pointer to HTML element owning the scroll bar.
   * When window is popped out, this differs from the normale container.
   */
  protected readonly scrollableContainer: HTMLElement | null

  protected constructor(protected readonly chartCtx: ChartContext,
                        protected readonly engine: GanttRenderEngine) {
    this.viewModel = engine.viewModel
    this.svg = this.engine.view.svg
    this.activeWindow = this.svg.ownerDocument.defaultView ?? window
    this.scrollableContainer = this.getScrollableContainer()
  }

  protected abstract getScrollableContainer(): HTMLElement | null

  /** Attaches or re-binds SVG event listeners */
  protected abstract attachSvgListeners(svg: HTMLElement,
                                        activeWindow: Window): void

  protected abstract detachListeners(): void

  handleDragInteraction(x: number, y: number) {

    const deltaX = x - this.startX
    const deltaY = y - this.startDragMouseY
    const targetTranslateX = this.startTranslateX + deltaX

    this.rafId ??= this.activeWindow?.requestAnimationFrame(() => {
      if (this.scrollableContainer) {
        this.scrollableContainer.scrollTop = this.startDragScrollTop - deltaY
      }

      this.engine.panAbsoluteX(targetTranslateX)
      this.rafId = undefined
    })
  }

  protected openEventFileInNewTab(target?: HTMLElement): void {
    const dataID = target?.getAttribute?.('data-id')
    if (!dataID) return
    const link = this.engine.rawData.find(d => d.id === dataID)?.link
    if (link) void this.chartCtx.workspace.openLinkText(link, '', true)
  }

  /**
   * Does a final 0-diff pan after dragging events to re-draw event text and icons.
   * (which do not get drawn while panning)
   */
  protected handleEndInteraction() {
    if (this.isDragging) {
      this.isDragging = false
      this.engine.panDiff(0)
    }
    this.destroyAnimation()
  }

  /**
   * Unbinds all window and SVG listeners and cleans up pending animation frames
   * Fully unhook and release all window and SVG listeners to prevent leaks
   */
  public destroy() {
    this.destroyAnimation()
    this.detachListeners()
  }

  protected get settings() {
    return this.chartCtx.settings
  }

  protected destroyAnimation(): void {
    if (this.rafId) this.activeWindow?.cancelAnimationFrame(this.rafId)
    this.rafId = undefined
  }


}
