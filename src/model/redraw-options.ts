type Steps = 'resetCaches' | 'reloadData' | 'resetZoomAndPan' | 'resize' | 'redraw'

export class RedrawOption {
  constructor(private readonly options: Steps[]) {
  }

  toString(): string {
    return `RedrawOption: [${String(this.options)}]`
  }

  /** Do everything. Used once during creation. */
  static readonly Full = new RedrawOption(['resetCaches', 'reloadData', 'resetZoomAndPan', 'resize', 'redraw'])

  /**
   * Do everything except resetting current zoom and pan.
   * Manually triggered by clicking 'Reload data'. Resets all caches, especially calendar and diagnostics.
   */
  static readonly ManualReload = new RedrawOption(['resetCaches', 'reloadData', 'resize', 'redraw'])

  /**
   * Automatically triggered by base (or code block) through Obsidian's internal BTS trigger.
   * Updates data filtered by Base, which does not include calendars.
   * Does not affect current zoom or pan values.
   */
  static readonly DataReload = new RedrawOption(['reloadData', 'redraw'])

  /**
   * Manually triggered. Only resets view (zoom and pan values) to default.
   */
  static readonly ResetView = new RedrawOption(['resetZoomAndPan', 'redraw'])

  static readonly Resize = new RedrawOption(['resize', 'redraw'])

  /**
   * Indirectly manually triggered by changing settings. Triggers a redraw without resetting any cache.
   * Does not affect current zoom or pan values.
   */
  static readonly None = new RedrawOption(['redraw'])

  get resetCaches(): boolean {
    return this.options.includes('resetCaches')
  }

  get reloadData(): boolean {
    return this.options.includes('reloadData')
  }

  get resetZoomAndPan(): boolean {
    return this.options.includes('resetZoomAndPan')
  }

  get resize(): boolean {
    return this.options.includes('resize')
  }

  get redraw(): boolean {
    return this.options.includes('redraw')
  }

}
