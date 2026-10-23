type ResetType = 'view' | 'data' | 'full' | 'manualRefresh'

export class ResetPreset {
  constructor(public readonly options: ResetType[]) {
  }

  static readonly None = new ResetPreset([])
  static readonly Resize = new ResetPreset([])
  static readonly View = new ResetPreset(['view'])
  static readonly Data = new ResetPreset(['data'])
  static readonly ManualReload = new ResetPreset(['data', 'manualRefresh'])
  static readonly Full = new ResetPreset(['data', 'view', 'full'])

  get isManualRefresh(): boolean {
    return this.options.includes('manualRefresh')
  }

  get view(): boolean {
    return this.options.includes('view')
  }

  get data(): boolean {
    return this.options.includes('data')
  }

  get full(): boolean {
    return this.options.includes('full')
  }
}
