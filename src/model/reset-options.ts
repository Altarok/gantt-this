export type ResetType = 'view' | 'data'

export class ResetPreset {
  constructor(public readonly options: ResetType[]) {
  }

  static readonly None = new ResetPreset([])
  static readonly View = new ResetPreset(['view'])
  static readonly Data = new ResetPreset(['data'])
  static readonly Full = new ResetPreset(['data', 'view'])

  get view(): boolean {
    return this.options.includes('view')
  }

  get data(): boolean {
    return this.options.includes('view')
  }

  get full(): boolean {
    return this === ResetPreset.Full
  }
}
