import {Modal} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {ChartContext} from '../model/chart-context'
import {ChartDiagnostics, ErrorEntry, ErrorSeverity} from '../const/error-types'
import {Css} from '../const/constants'

const cssClasses: Record<ErrorSeverity, string> = {
  info: Css.diagnostics.logInfo,
  warn: Css.diagnostics.logWarn,
  error: Css.diagnostics.logError,
  fatal: Css.diagnostics.logFatal
}

function loglevelToCssClass(errEntry: ErrorEntry) {
  return cssClasses[errEntry.level]
}

export class ChartDiagnosticsModal extends Modal {
  constructor(private readonly chartCtx: ChartContext) {
    super(chartCtx.plugin.app)
  }

  private get plugin(): FantasyGanttPlugin {
    return this.chartCtx.plugin
  }

  onOpen() {
    const {contentEl} = this
    contentEl.empty()
    // contentEl.addClass('gt-stats-modal') // TODO remove

    const diagnostics: ChartDiagnostics = this.chartCtx.getUpdatedDiagnostics()

    this.showProblems(contentEl, diagnostics)
    this.showStatistics(contentEl, diagnostics)
  }

  onClose() {
    this.contentEl.empty()
  }

  private showProblems(contentEl: HTMLElement, diagnostics: ChartDiagnostics) {
    const {logs} = diagnostics
    if (logs?.length === 0) {
      contentEl.createDiv({text: 'Setup correct, no known problems.', cls: Css.diagnostics.errorListRow})
      return
    }

    contentEl.createEl('h3', {text: 'Problems'})
    const logContainer = contentEl.createDiv({cls: Css.diagnostics.container})

    const list = logContainer.createEl('ul', {cls: Css.diagnostics.errorList})
    for (const entry of logs) {
      const filepath = entry.filepath
      const li = list.createEl('li', {text: entry.message, cls: loglevelToCssClass(entry)})

      if (filepath) {
        li.createSpan({text: ' '})
        const link = li.createEl('a', {text: 'Open file', cls: Css.diagnostics.openFileLink})

        this.plugin.registerDomEvent(link as HTMLElement, 'click', (e) => {
          e.preventDefault()
          void this.plugin.app.workspace.openLinkText(filepath, '', true)
        })
      }
    }

    /**
     * Potential overview of related documentation URLs
     */
    // if (logTypes?.length > 0) {
    //   const tipps = contentEl.createDiv({cls: 'gt-stats-group'})
    //
    //   for (const logType of logTypes) switch (logType) {
    //     case 'calendar': {
    //       const helpLink = tipps.createEl('a', {
    //         text: 'Read this for help',
    //         href: 'https://altarok.github.io/quartz/calendars'
    //       })
    //       helpLink.setAttr('target', '_blank')
    //       this.createStatRow(tipps, 'Help', helpLink)
    //     }
    //       break
    //   }
    // }


  }

  private showStatistics(contentEl: HTMLElement, diagnostics: ChartDiagnostics) {
    contentEl.createEl('h3', {text: 'Statistics'})

    const g = contentEl.createDiv() // TODO {cls: Css.diagnostics.group})
    createStatRow(g, `Calendars loaded: ${diagnostics.loadedCalendars} of ${diagnostics.totalCalendars}`)
    createStatRow(g, `Events loaded: ${diagnostics.contextEventCount} from ${diagnostics.contextFilesCount} files`)
    // folder '${this.chartCtx.settings.eventPath}'
    createStatRow(g, `Current plugin version: ${this.chartCtx.pluginVersion} - Obsidian: ${this.chartCtx.obsidianVersion}`)
  }

}

function createStatRow(div: HTMLDivElement, label: string, value?: string | HTMLElement): void {

  const row = div.createDiv({cls: Css.diagnostics.errorListRow})

  if (!value) {
    row.createSpan({text: label})
  } else if (typeof value === 'string') {
    row.createSpan({text: `${label}: ${String(value)}`})
  } else {
    row.createSpan({text: label})
    row.appendChild(value)
  }
}
