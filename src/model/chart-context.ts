import {MetadataCache, TFile} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {DiagnosticsContext} from './diagnostics-context'
import {SettingsContext} from './settings-context'
import {EventPropertyReader} from '../io/event-property-reader'
import BasesContext from './bases-context'
import TextWidthCache from '../view/text-space-cache'
import {CalendarConfig} from '../const/types'
import {SvgDrawerUtil} from '../view/svg-drawer-util'
import {GanttError} from "./gantt-error";
import {DiagnosticsModel} from "./diagnostics-model";

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

  get settings(): SettingsContext {
    return this.settingsContext
  }

  get propertyReader() {
    return this.eventPropertyReader
  }

  get textCache() {
    return this.textWidthCache
  }

  get diagnosticsCtx() {
    return this.diagnosticsContext
  }

  get diagnostics() {
    return this.diagnosticsContext.diagnostics
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

  parseRawChartInput() {
    this.settingsContext.parseRawChartInput(this)
  }

  addErr(error: GanttError) {
    this.diagnosticsContext.addErr(error)
  }

  getUdpatedDiagnostics(): DiagnosticsModel {
    const diagnostics: DiagnosticsModel = this.diagnostics
    diagnostics.loadedCalendars = this.calendarCache.size
    return diagnostics
  }
}
