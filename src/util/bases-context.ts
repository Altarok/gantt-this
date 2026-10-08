import {BasesEntry, BasesPropertyId, BasesQueryResult, BasesView, BasesViewConfig, TFile, Value} from 'obsidian'
import {GanttItem} from '../const/types'

export default class BasesContext {
  constructor(private readonly base: BasesView) {
  }

  /**
   * Returns true if any property is selected. This does not guarantee, that all selected properties would return a
   * truthy value when queried.
   */
  hasSelectedProperties() {
    return this.selectedPropertiesInOrder.length > 0
  }

  /**
   * Reads all properties selected in the Base in correct order.
   * @param item a Gantt chart event, pointing to a note
   * @return key value pairs where value is truthy
   */
  readPropertyValues(item: GanttItem): { key: string, value: string }[] {
    if (!item || this.selectedPropertiesInOrder.length === 0) return []

    const basesEntry: BasesEntry | undefined = this.getBasesEntryWithGanttItem(item)
    if (!basesEntry) return []

    const results: { key: string, value: string }[] = []

    this.selectedPropertiesInOrder.forEach((propertyKey: BasesPropertyId) => {
      const value: Value | null = basesEntry.getValue(propertyKey)
      /* isTruthy() should remove non-null empty values */
      if (value?.isTruthy()) {
        const key = this.trimPropertyKey(propertyKey)
        results.push({key, value: value.toString()})
      }
    })

    return results
  }

  readPropertyValue(file: TFile, key: string): string | null {
    if (this.selectedPropertiesInOrder.length === 0) return null
    const basesEntry: BasesEntry | undefined = this.getBasesEntryWithFile(file)
    if (!basesEntry) return null

    for (const propertyKey of this.selectedPropertiesInOrder) {
      if (!propertyKey.endsWith(key)) continue
      const value: Value | null = basesEntry.getValue(propertyKey)
      /* isTruthy() should remove non-null empty values */
      if (value?.isTruthy()) return value.toString()
    }

    return null
  }


  /**
   * Removes common prefixes 'note', 'file', and 'formula'.
   * Adds  suffix '(f)' to formula keys.
   */
  private trimPropertyKey(propertyKey: BasesPropertyId): string {
    const p = propertyKey.toString()
    return p.startsWith('formula.') ? `${p.slice(8)} (f)` : p.slice(5)
  }

  private getBasesEntryWithGanttItem(item: GanttItem): BasesEntry | undefined {
    return this.getBasesEntryWithFile(item.file)
  }

  private getBasesEntryWithFile(file: TFile): BasesEntry | undefined {
    return this.basesEntries.find(be => be.file === file)
  }

  /** Complete Bases query result split into file-related objects */
  private get basesEntries(): BasesEntry[] {
    return this.queryResult.data
  }

  /** Complete Bases query result */
  private get queryResult(): BasesQueryResult {
    return this.base.data
  }

  private get selectedPropertiesInOrder(): BasesPropertyId[] {
    return this.config.getOrder()
  }

  /** Bases config, basically the query parameters */
  private get config(): BasesViewConfig {
    return this.base.config
  }
}
