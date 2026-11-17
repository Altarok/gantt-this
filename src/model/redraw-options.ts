type RedrawStep =
  'resetCalendarCache' /* Reset calendar cache */
  | 'resetDiagCache' /* Reset error diagnostic cache */
  | 'reloadData'
  | 'resetZoomAndPan'
  | 'redraw'
  | 'calcEventAreaWidth'
  | 'calcEventAreaHeight'

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
    return this.has('resetDiagCache')
  }

  get resetZoomAndPan(): boolean {
    return this.has('resetZoomAndPan')
  }

  get changedHeight(): boolean {
    return this.has('calcEventAreaHeight')
  }

  get changedWidth(): boolean {
    return this.has('calcEventAreaWidth')
  }

  private has(step: RedrawStep): boolean {
    return this.steps.has(step)
  }

  toString(): string {
    return `RedrawOption: [${Array.from(this.steps).join(', ')}]`
  }

  /** Do everything. Used once during creation. */
  static readonly Full = new RedrawOption(true, ['resetCalendarCache', 'resetDiagCache',
    'reloadData', 'resetZoomAndPan', 'calcEventAreaWidth', 'redraw', 'calcEventAreaHeight'])

  /** Do everything except resetting current zoom and pan. Manually triggered by clicking 'Reload data'. */
  static readonly ManualReload = new RedrawOption(true,
    ['resetCalendarCache', 'resetDiagCache', 'reloadData', 'calcEventAreaWidth', 'redraw', 'calcEventAreaHeight'])

  /**
   * Automatically triggered by Obsidian's Base internal BTS trigger.
   * Updates data filtered by Base, not including calendars.
   * Does not affect current zoom or pan values.
   */
  static readonly DataReload = new RedrawOption(false,
    ['reloadData', 'redraw', 'calcEventAreaHeight'])

  /** Manually triggered. Only resets view (zoom and pan values) to default. */
  static readonly ResetZoomAndPan = new RedrawOption(true,
    ['resetZoomAndPan'])

  /** Manually triggered. Changes frame size. */
  static readonly ResizeContainer = new RedrawOption(true,
    ['calcEventAreaWidth', 'calcEventAreaHeight'])

  /** Manually triggered. Basic redraw, does not change or reset anything. */
  static readonly None = new RedrawOption(true, [])

  /** Manually triggered. No content change, but re-calculation of event area height. */
  static readonly HeightChange = new RedrawOption(true,
    ['calcEventAreaHeight'])

}
