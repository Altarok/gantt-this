import {BasesEntry, BasesPropertyId, BasesQueryResult, BasesView, BasesViewConfig, Value} from 'obsidian'
import {GanttItem} from '../const/types'

export default class BasesContext {
  readonly selectedPropertiesInOrder: BasesPropertyId[]

  constructor(private readonly base: BasesView) {
    this.selectedPropertiesInOrder = this.config.getOrder()
  }

  hasSelectedProperties() {
    return this.selectedPropertiesInOrder.length > 0
  }

  readPropertyValues(item: GanttItem): { key: string, value: string }[] {
    if (!item || this.selectedPropertiesInOrder.length === 0) return []

    const results: { key: string, value: string }[] = []

    const basesEntry: BasesEntry | undefined = this.getBasesEntry(item)

    if (basesEntry) this.selectedPropertiesInOrder.forEach((propertyKey: BasesPropertyId) => {
      const value: Value | null = basesEntry.getValue(propertyKey)
      if (value?.isTruthy()) { // isTruthy() should remove non-null empty values
        /*
         * TODO @CePeU: replace started and end dates with output format
         */
        const key = this.trimPropertyKey(propertyKey)
        results.push({key, value: value.toString()})
      }
    })

    return results
  }

  /**
   * Removes common prefixes 'note', 'file', and 'formula'.
   * Adds  suffix '(f)' to formula keys.
   */
  private trimPropertyKey(propertyKey: BasesPropertyId): string {
    const p = propertyKey.toString()
    return p.startsWith('formula.') ? `${p.slice(8)} (f)` : p.slice(5)
  }

  private getBasesEntry(item: GanttItem): BasesEntry | undefined {
    return this.basesEntries.filter(be => be.file === item.file).first()
  }

  /** Complete Bases query result split into file-related objects */
  private get basesEntries(): BasesEntry[] {
    return this.queryResult.data
  }

  /** Complete Bases query result */
  private get queryResult(): BasesQueryResult {
    return this.base.data
  }

  /** Bases config, basically the query parameters */
  private get config(): BasesViewConfig {
    return this.base.config
  }
}
