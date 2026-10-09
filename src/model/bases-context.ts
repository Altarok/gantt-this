import {
  BasesEntry,
  BasesPropertyId,
  BasesQueryResult,
  BasesView,
  BasesViewConfig,
  ListValue,
  PrimitiveValue,
  TFile,
  Value
} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {GanttItem} from '../const/types'
import {EventPropertyReader} from '../io/event-property-reader'

export default class BasesContext {
  constructor(private readonly plugin: FantasyGanttPlugin,
              private readonly base: BasesView) {
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

  /**
   * Reads a single property value for a file from the base query results.
   * @return The value as a string, an array of strings, or null if not found/empty.
   */
  readPropertyValue(file: TFile, key: string): string[] | string | null {
    if (this.selectedPropertiesInOrder.length === 0) return null
    const basesEntry: BasesEntry | undefined = this.getBasesEntryWithFile(file)
    if (!basesEntry) return null

    for (const propertyKey of this.selectedPropertiesInOrder) {
      if (!propertyKey.endsWith(`.${key}`)) continue
      const value: Value | null = basesEntry.getValue(propertyKey)
      /* isTruthy() should remove non-null empty values */
      if (!value?.isTruthy()) return null
      /*
       * TODO make other types possible (not only string)
       */
      if (value instanceof PrimitiveValue) /* includes string and boolean */
        return value.toString()
      if (value instanceof ListValue) {
        const strings: string[] = []
        for (let i = 0; i < value.length(); i++) {
          const valueI = value.get(i)
          strings.push(valueI.toString())
        }
        return strings
      }
      return null

    }

    return null
  }

  /** Filter base's query results by start date and checkbox */
  filterQueryResults(eventPropertyReader: EventPropertyReader) {
    const isCheckboxMarkerOptional = this.plugin.settings.frontMatterProperty_gantt_this_optional

    return this.queryResults.filter(entry => {
      const cache = this.plugin.app.metadataCache.getFileCache(entry.file)
      const frontmatter = cache?.frontmatter
      if (!frontmatter) return false

      const hasStartDate = this.plugin.settings.useFilenameAsFallbackStartDate || eventPropertyReader.hasStartDate(frontmatter, entry.file)
      const hasValidMarker = isCheckboxMarkerOptional || eventPropertyReader.isFileMarkedAsEvent(frontmatter, entry.file)

      // Check if note contains the required frontmatter properties
      return hasStartDate && hasValidMarker
    }).map(entry => entry.file)
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
    if (!item?.file) return undefined
    return this.getBasesEntryWithFile(item.file)
  }

  private getBasesEntryWithFile(file: TFile): BasesEntry | undefined {
    return this.queryResults.find(be => be.file === file)
  }

  /** Complete Bases query result split into file-related objects */
  private get queryResults(): BasesEntry[] {
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
