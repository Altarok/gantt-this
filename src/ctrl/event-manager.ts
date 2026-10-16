export type GanttEventManager = {
  /** Whether a drag or gesture interaction is currently in progress */
  isDragging: boolean
  /** Attaches or re-binds SVG event listeners */
  attachSvgListeners(): void
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

  /** Reference to current */
  protected rafId: number | null = null
  protected svg: SVGElement | null = null

  constructor() {
    // do sth
  }

  /** Attaches or re-binds SVG event listeners */
  abstract attachSvgListeners(): void

  /** Unbinds all window and SVG listeners and cleans up pending animation frames */
  abstract destroy(): void


}
