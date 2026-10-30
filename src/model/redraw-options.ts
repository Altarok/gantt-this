type RedrawStep = 'resetCalendarCache'
  | 'resetDiagnosticCache'
  | 'reloadData'
  | 'resetZoomAndPan'
  | 'resize'
  | 'redraw'

export class RedrawOption {
  private readonly steps: Set<RedrawStep>

  private constructor(readonly isManual: boolean,
                      steps: RedrawStep[]) {
    this.steps = new Set(steps)
  }

  has(step: RedrawStep): boolean {
    return this.steps.has(step)
  }

  toString(): string {
    return `RedrawOption: [${Array.from(this.steps).join(', ')}]`
  }

  /** Do everything. Used once during creation. */
  static readonly Full = new RedrawOption(true, ['resetCalendarCache', 'resetDiagnosticCache', 'reloadData', 'resetZoomAndPan', 'resize', 'redraw'])

  /** Do everything except resetting current zoom and pan. Manually triggered by clicking 'Reload data'. */
  static readonly ManualReload = new RedrawOption(true, ['resetCalendarCache', 'resetDiagnosticCache', 'reloadData', 'resize', 'redraw'])

  /**
   * Automatically triggered by Obsidian's Base internal BTS trigger.
   * Updates data filtered by Base, not including calendars.
   * Does not affect current zoom or pan values.
   */
  static readonly DataReload = new RedrawOption(false, ['reloadData', 'redraw'])

  /** Manually triggered. Only resets view (zoom and pan values) to default. */
  static readonly ResetView = new RedrawOption(true, ['resetZoomAndPan'])

  /** Manually triggered. Changes frame size. */
  static readonly Resize = new RedrawOption(true, ['resize'])

  /** Manually triggered. Basic redraw, does not change or reset anything. */
  static readonly None = new RedrawOption(true, [])

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
