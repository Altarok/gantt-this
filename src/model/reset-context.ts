export enum ResetOption {
  Zoom = 'ZOOM',
  Pan = 'PAN',
  Data = 'DATA',
  Selection = 'SELECTION'
}

export enum ResetPreset {
  ViewOnly = 'VIEW_ONLY',
  DataOnly = 'DATA_ONLY',
  Full = 'FULL'
}

type ResetCallback = () => void

export class ResetContext {
  private registry = new Map<ResetOption, Set<ResetCallback>>()

  public register(option: ResetOption, callback: ResetCallback): () => void {
    if (!this.registry.has(option)) {
      this.registry.set(option, new Set())
    }
    this.registry.get(option)?.add(callback)
    return () => this.unregister(option, callback)
  }

  public unregister(option: ResetOption, callback: ResetCallback): void {
    this.registry.get(option)?.delete(callback)
  }

  public reset(preset: ResetPreset): void {
    const options = this.resolvePreset(preset)
    options.forEach(option => {
      const callbacks = this.registry.get(option)
      if (callbacks) {
        callbacks.forEach(cb => cb())
      }
    })
  }

  private resolvePreset(preset: ResetPreset): ResetOption[] {
    switch (preset) {
      case ResetPreset.ViewOnly:
        return [ResetOption.Zoom, ResetOption.Pan]
      case ResetPreset.DataOnly:
        return [ResetOption.Data]
      case ResetPreset.Full:
        return [ResetOption.Zoom, ResetOption.Pan, ResetOption.Data, ResetOption.Selection]
      default:
        return []
    }
  }
}
