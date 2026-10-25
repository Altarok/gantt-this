type RedrawStep = 'redraw' | 'data' | 'full' | 'manualRefresh'

export class RedrawOption {
  constructor(public readonly options: RedrawStep[]) {
  }

  static readonly None = new RedrawOption([])
  static readonly Resize = new RedrawOption([])
  static readonly View = new RedrawOption(['redraw'])
  static readonly Data = new RedrawOption(['data'])
  static readonly ManualReload = new RedrawOption(['data', 'manualRefresh'])
  static readonly Full = new RedrawOption(['data', 'redraw', 'full'])

  get isManualRefresh(): boolean {
    return this.options.includes('manualRefresh')
  }

  get view(): boolean {
    return this.options.includes('redraw')
  }

  get data(): boolean {
    return this.options.includes('data')
  }

  get full(): boolean {
    return this.options.includes('full')
  }
}
