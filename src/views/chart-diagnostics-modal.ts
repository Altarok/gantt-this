import {Modal} from 'obsidian'
import FantasyGanttPlugin from '../main'
import {ChartContext} from '../model/chart-context'
import {ChartDiagnostics} from "../const/error-types";

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
    contentEl.addClass('gt-stats-modal')

    const diagnostics: ChartDiagnostics = this.chartCtx.getUpdatedDiagnostics()

    this.showProblems(contentEl, diagnostics)
    this.showStatistics(contentEl, diagnostics)
  }

  onClose() {
    this.contentEl.empty()
  }

  private showProblems(contentEl: HTMLElement, diagnostics: ChartDiagnostics) {
    const {logs/* , logTypes */} = diagnostics
    if (logs?.length === 0) {
      contentEl.createDiv({text: 'Set up correct, no known problems.', cls: 'gt-stats-row'})
      return
    }

    contentEl.createEl('h3', {text: 'Problems'})
    const logContainer = contentEl.createDiv({cls: 'gt-stats-log-container'})

    const list = logContainer.createEl('ul', {cls: 'gt-stats-error-list'})
    for (const entry of logs) {
      const filepath = entry.filepath
      const li = list.createEl('li', {text: entry.message})
      li.addClass(`gt-log-${entry.level}`)

      if (filepath) {
        li.createSpan({text: ' '})
        const link = li.createEl('a', {text: 'Open file', cls: 'gt-stats-open-file-link'})

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

    const g = contentEl.createDiv({cls: 'gt-stats-group'})
    createStatRow(g, `Calendars loaded: ${diagnostics.loadedCalendars} of ${diagnostics.totalCalendars}`)
    createStatRow(g, `Events loaded: ${diagnostics.contextEventCount} from ${diagnostics.contextFilesCount} files (in folder '${this.chartCtx.settings.eventPath}')`)
    createStatRow(g, `Current plugin version: ${this.chartCtx.version}`)
  }

}

function createStatRow(div: HTMLDivElement, label: string, value?: string | HTMLElement): void {

  const row = div.createDiv({cls: 'gt-stats-row'})

  if (!value) {
    row.createSpan({text: label})
  } else if (typeof value === 'string') {
    row.createSpan({text: `${label}: ${String(value)}`})
  } else {
    row.createSpan({text: label})
    row.appendChild(value)
  }
}
