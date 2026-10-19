import {MetadataCache, PluginManifest, TFile} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {DiagnosticsContext} from './diagnostics-context'
import {SettingsContext} from './settings-context'
import {EventPropertyReader} from '../io/event-property-reader'
import BasesContext from './bases-context'
import TextWidthCache from '../view/text-space-cache'
import {CalendarConfig} from '../types/calendar-types'
import {SvgDrawerUtil} from '../view/svg-drawer-util'
import {GanttError} from './gantt-error'
import {ChartDiagnostics} from '../const/error-types'

/**
 * Each chart has 1 of these
 */
export class ChartContext {
  readonly svgDrawerUtil: SvgDrawerUtil

  constructor(readonly plugin: FantasyGanttPlugin,
              private readonly diagnosticsContext: DiagnosticsContext,
              private readonly settingsContext: SettingsContext,
              private readonly eventPropertyReader: EventPropertyReader,
              private readonly textWidthCache: TextWidthCache,
              private readonly basesCtx?: BasesContext) {
    this.svgDrawerUtil = new SvgDrawerUtil(this)
  }

  resetCaches(): void {
    this.diagnosticsContext.resetCache()
  }

  get settings(): SettingsContext {
    return this.settingsContext
  }

  get propertyReader() {
    return this.eventPropertyReader
  }

  get textCache() {
    return this.textWidthCache
  }

  get diagnostics(): DiagnosticsContext {
    return this.diagnosticsContext
  }

  get hasBasesContext(): boolean {
    return !!this.basesCtx
  }

  get bases(): BasesContext | undefined {
    return this.basesCtx
  }

  get getFilesFilteredByBase(): TFile[] {
    return this.basesCtx!.filterQueryResults(this.eventPropertyReader)
  }

  // --- plugin stuff
  get version(): string {
    return this.manifest.version
  }

  private get manifest(): PluginManifest {
    return this.plugin.manifest
  }

  get metadataCache(): MetadataCache {
    return this.plugin.app.metadataCache
  }

  get allMarkdownFiles(): TFile[] {
    return this.plugin.app.vault.getMarkdownFiles()
  }

  get vault() {
    return this.plugin.app.vault
  }

  // TODO used only for linking, move inside
  get workspace() {
    return this.plugin.app.workspace
  }

  get calendarCache(): Map<string, CalendarConfig> {
    return this.plugin.calendarConfigsCache
  }

  parseRawChartInput(): void {
    this.settingsContext.parseRawChartInput(this)
  }

  addErr(error: GanttError): void {
    this.diagnosticsContext.addErr(error)
  }

  getUpdatedDiagnostics(): ChartDiagnostics {
    const diagnostics: DiagnosticsContext = this.diagnostics
    diagnostics.sortLogs()
    diagnostics.loadedCalendars = this.calendarCache.size
    return diagnostics
  }


}
