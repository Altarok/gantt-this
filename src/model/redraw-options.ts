type RedrawStep =
  'resetCalendarCache'
  | 'resetDiagnosticCache'
  | 'reloadData'
  | 'resetZoomAndPan'
  | 'redraw'
  | 'calculateEventAreaWidth'
  | 'calculateEventAreaHeight'

export class RedrawOption {
  private readonly steps: Set<RedrawStep>

  private constructor(readonly isManual: boolean,
                      steps: RedrawStep[]) {
    this.steps = new Set(steps)
  }

  /**
   * Returns true if everything should be re-drawn, including static graphics which naturally do not change.
   */
  get redrawEverything(): boolean {
    return this.has('redraw')
  }

  /**
   * Returns true if data should be reloaded before redraw.
   */
  get reloadData(): boolean {
    return this.has('reloadData')
  }

  get resetCalendarCache(): boolean {
    return this.has('resetCalendarCache')
  }

  get resetDiagnosticCache(): boolean {
    return this.has('resetDiagnosticCache')
  }

  get resetZoomAndPan(): boolean {
    return this.has('resetZoomAndPan')
  }

  get changedHeight(): boolean {
    return this.has('calculateEventAreaHeight')
  }

  get changedWidth(): boolean {
    return this.has('calculateEventAreaWidth')
  }

  private has(step: RedrawStep): boolean {
    return this.steps.has(step)
  }

  toString(): string {
    return `RedrawOption: [${Array.from(this.steps).join(', ')}]`
  }

  /** Do everything. Used once during creation. */
  static readonly Full = new RedrawOption(true, ['resetCalendarCache', 'resetDiagnosticCache',
    'reloadData', 'resetZoomAndPan', 'calculateEventAreaWidth', 'redraw', 'calculateEventAreaHeight'])

  /** Do everything except resetting current zoom and pan. Manually triggered by clicking 'Reload data'. */
  static readonly ManualReload = new RedrawOption(true, ['resetCalendarCache',
    'resetDiagnosticCache', 'reloadData', 'calculateEventAreaWidth', 'redraw', 'calculateEventAreaHeight'])

  /**
   * Automatically triggered by Obsidian's Base internal BTS trigger.
   * Updates data filtered by Base, not including calendars.
   * Does not affect current zoom or pan values.
   */
  static readonly DataReload = new RedrawOption(false, ['reloadData', 'redraw',
    'calculateEventAreaHeight'])

  /** Manually triggered. Only resets view (zoom and pan values) to default. */
  static readonly ResetZoomAndPan = new RedrawOption(true, ['resetZoomAndPan'])

  /** Manually triggered. Changes frame size. */
  static readonly Resize = new RedrawOption(true, ['calculateEventAreaWidth',
    'calculateEventAreaHeight'])

  /** Manually triggered. Basic redraw, does not change or reset anything. */
  static readonly None = new RedrawOption(true, [])

  /** Manually triggered. No content change, but re-calculation of areas. */
  static readonly ToolbarFold = new RedrawOption(true, ['calculateEventAreaHeight'])

}
