type Step = 'resetCalendarCache' | 'resetDiagnosticCache' | 'reloadData' | 'resetZoomAndPan' | 'resize' | 'redraw'

export class RedrawOption {
  private readonly steps: Set<Step>

  constructor(steps: Step[]) {
    this.steps = new Set(steps)
  }

  has(step: Step): boolean {
    return this.steps.has(step)
  }

  toString(): string {
    return `RedrawOption: [${Array.from(this.steps).join(', ')}]`
  }

  /** Do everything. Used once during creation. */
  static readonly Full = new RedrawOption(['resetCalendarCache', 'resetDiagnosticCache', 'reloadData', 'resetZoomAndPan', 'resize', 'redraw'])

  /** Do everything except resetting current zoom and pan. Manually triggered by clicking 'Reload data'. */
  static readonly ManualReload = new RedrawOption(['resetCalendarCache', 'resetDiagnosticCache', 'reloadData', 'resize', 'redraw'])

  /**
   * Automatically triggered by Obsidian's Base internal BTS trigger.
   * Updates data filtered by Base, not including calendars.
   * Does not affect current zoom or pan values.
   */
  static readonly DataReload = new RedrawOption(['reloadData', 'redraw'])

  /**
   * Manually triggered. Only resets view (zoom and pan values) to default.
   */
  static readonly ResetView = new RedrawOption(['resetZoomAndPan'])

  static readonly Resize = new RedrawOption(['resize'])

  /** Basic redraw, does not change or reset anything. */
  static readonly None = new RedrawOption([])

  // get resetCalendarCache(): boolean {
  //   return this.has('resetCalendarCache')
  // }
  //
  // get resetDiagnosticCache(): boolean {
  //   return this.has('resetDiagnosticCache')
  // }
  //
  // get reloadData(): boolean {
  //   return this.has('reloadData')
  // }
  //
  //
  // get resetZoomAndPan(): boolean {
  //   return this.has('resetZoomAndPan')
  // }
  //
  // get resize(): boolean {
  //   return this.has('resize')
  // }
  //
  // get redraw(): boolean {
  //   return this.has('redraw')
  // }

}
