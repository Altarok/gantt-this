import {App, Modal} from 'obsidian'
import {ChartStatistics} from '../const/types'

export const mockStats: ChartStatistics = {
  diagnostics: {
    totalCalendars: 5,
    loadedCalendars: 4,
    failedCalendars: 1,
    contextFilesCount: 123,
    contextEventsCount: 84,
  },
  logs: [
    {level: 'warn', message: "Failed to parse 'gregorian' calendar. Will use pre-set fallback."},
    {level: 'fatal', message: 'fatal 2.'},
    {level: 'info', message: 'info 1.'},
    {level: 'error', message: 'Failed to parse event date: 2026-13+40 in file Campaign_Schedule.md'},
    {level: 'fatal', message: 'Calendar yaml broken: days in year does not match sum of days in months'},
    {level: 'info', message: 'info 2.'}
  ],
  logTypes: []
}


export class ChartStatisticsModal extends Modal {
  constructor(app: App,
              private readonly stats: ChartStatistics = mockStats) {
    super(app)
  }

  private createStatRow = (div: HTMLDivElement, label: string, value?: string | HTMLElement) => {
    const row = div.createDiv({cls: 'gt-stats-row'})
    // if (value) row.createSpan({text: `${label}: ${String(value)}`})
    // else row.createSpan({text: label})
    row.createSpan({text: label})

    if (value) {
      if (typeof value === 'string') row.createSpan({text: value})
      else row.appendChild(value)
    }
  }

  onOpen() {
    const {contentEl} = this
    contentEl.empty()
    contentEl.addClass('gt-stats-modal')

    this.showProblems(contentEl)
    this.showStatistics(contentEl)
  }

  onClose() {
    this.contentEl.empty()
  }

  private showProblems(contentEl: HTMLElement) {

    const {logs, logTypes} = this.stats

    contentEl.createEl('h3', {text: 'Logs & Diagnostics'})
    const logContainer = contentEl.createDiv({cls: 'gt-stats-log-container'})

    if (logs?.length === 0) {
      logContainer.createEl('p', {text: `'No problems recorded, you're all set up.'`, cls: 'gt-settings-empty-notice'})
      return
    }

    const list = logContainer.createEl('ul', {cls: 'gt-stats-error-list'})
    for (const entry of logs) {
      const li = list.createEl('li', {text: `${entry.level.toUpperCase()}: ${entry.message}`})
      li.addClass(`gt-log-${entry.level}`)
    }

    if (logTypes?.length > 0) {
      const tipps = contentEl.createDiv({cls: 'gt-stats-group'})

      for (const logType of logTypes) switch (logType) {
        case "calendar": {
          const helpLink = tipps.createEl('a', {
            text: 'Read this for help',
            href: 'https://altarok.github.io/quartz/calendars'
          })
          helpLink.setAttr('target', '_blank')
          this.createStatRow(tipps, 'Help', helpLink)
        }
          break
      }
    }


  }

  private showStatistics(contentEl: HTMLElement) {

    const {diagnostics: data} = this.stats

    contentEl.createEl('h3', {text: 'Statistics'})

    const statsGroup1 = contentEl.createDiv({cls: 'gt-stats-group'})
    this.createStatRow(statsGroup1, 'Calendars Loaded/Failed/Known', `${data.loadedCalendars}/${data.failedCalendars}/${data.totalCalendars}`)
    // this.createStatRow(statsGroup1, 'Files in Current Context', data.contextFilesCount)
    // this.createStatRow(statsGroup1, 'Events in Current Context', data.contextEventsCount)
    //
    // contentEl.createEl('h6', {text: 'Groups'})
    //
    // const statsGroup2 = contentEl.createDiv({cls: 'gt-stats-group'})
    // this.createStatRow(statsGroup2, 'Referenced groups', '6/25 (5 visible)')
    // this.createStatRow(statsGroup2, 'Astronomy', 13)
    // this.createStatRow(statsGroup2, 'Cosmology', 5)
    // this.createStatRow(statsGroup2, 'Geology', 250)
    // this.createStatRow(statsGroup2, 'Pre-historic', 123)
    // this.createStatRow(statsGroup2, 'Historic', 456)
  }
}
