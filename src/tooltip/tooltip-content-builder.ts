import {ChartContext} from '../model/chart-context'
import {GanttRenderEngine} from '../render/svg-drawer'
import {GanttItem, RepeatRule, TimeOfDayParsed} from '../types/event-types'
import {Css} from '../const/constants'
import {TooltipRendererHelper} from './tooltip-renderer-helper'
import {CalendarConfig} from '../types/calendar-types'
import {createAxisDateDescription} from '../date-calculations/dates'
import {formatIntegerWithCommas} from '../util/mathe'
import {Time} from '../date-calculations/time'

export class TooltipContentBuilder extends TooltipRendererHelper {

  constructor(chartCtx: ChartContext, engine: GanttRenderEngine) {
    super(chartCtx, engine)
  }

  destroy(): void {
    /* do nothing */
  }

  /**
   * Create tooltip content. Used as callback by {@link SelfAligningHoverPopover}.
   * @param tooltip the popover's main div: hoverEl
   * @param event currently hovered by your mouse
   */
  render(tooltip: HTMLElement, event: GanttItem): void {

    const innerContent = tooltip.createDiv({cls: Css.tooltip.tooltip})

    /* Keep method order! */
    this.addTitle(innerContent, event)
    this.addSelectedBasePropertiesTable(innerContent, event)
    this.addClickToOpenHint(innerContent)
    this.addDetailedDate(innerContent, event)
  }

  /** Adds title to tooltip. This is either the event's name or its filename. */
  private addTitle(innerContent: HTMLDivElement, event: GanttItem) {
    const tooltipTitle = (event.name || event.file.basename)
    innerContent.createDiv({text: tooltipTitle, cls: Css.tooltip.title})
  }

  /** Creates table and fills it with properties selected in the surrounding base. */
  private addSelectedBasePropertiesTable(innerContent: HTMLDivElement, event: GanttItem) {
    if (!this.hasSelectedBaseProperties) return /* fast-fail */

    const selectedProperties: { key: string, value: string }[] | undefined
      = this.chartCtx.bases?.readPropertyValues(event)
    if (!selectedProperties || selectedProperties.length === 0) return

    innerContent.createDiv({text: 'Selected Base properties:', cls: Css.tooltip.dateDetails})
    const table = innerContent.createEl('table', {cls: Css.tooltip.table})

    for (const property of selectedProperties) {
      const row = table.insertRow()
      const cellKey = row.insertCell()
      cellKey.textContent = property.key
      const cellVal = row.insertCell()
      cellVal.textContent = property.value
    }

  }

  /** Adds hint 'Click to open in new tab' to tooltip. */
  private addClickToOpenHint(innerContent: HTMLDivElement) {
    innerContent.createDiv({text: 'Click to open in new tab', cls: Css.tooltip.link})
  }

  /**
   * Add event date details to bottom of tooltip.
   * Dates get parsed to output format in all their glory. Every optional parameter gets pumped into this one.
   * @param innerContent where to add the tooltip
   * @param item
   */
  private addDetailedDate(innerContent: HTMLDivElement, item: GanttItem) {

    const calendarConfig = this.chartCtx.calendarCache.get(item.calendarType)
    if (!calendarConfig) return
    const datesContainer = innerContent.createDiv({cls: Css.tooltip.dateDetails})

    /* Add current date */
    this.addEventDateBelowTableRow(datesContainer, item, calendarConfig)

    /* If event repeats, add repeating event metadata */
    if (item.repeatRule) this.addRepetitionMetadata(datesContainer, item.repeatRule)

    /* If user wants to see the internal absolute day, add it to the very bottom. */
    if (this.addDaySuffixToTooltipTitle) this.addAbsoluteDayCount(datesContainer, item)
  }


  private addEventDateBelowTableRow(container: HTMLDivElement,
                                    item: GanttItem,
                                    calConfig: CalendarConfig) {
    if (item.isTimeSpan) {
      const dateRow1 = container.createDiv({cls: Css.tooltip.repeatRow})
      dateRow1.createSpan({
        text: `From: ${dateInExtensiveFormat(item.startDay, item.startTimeOfDay, calConfig)}`,
        cls: Css.tooltip.suffixRow
      })
      const dateRow2 = container.createDiv({cls: Css.tooltip.repeatRow})
      dateRow2.createSpan({
        text: `To: ${dateInExtensiveFormat(item.endDay, item.endTimeOfDay, calConfig)}`,
        cls: Css.tooltip.suffixRow
      })
    } else {
      const dateRow = container.createDiv({cls: Css.tooltip.repeatRow})
      dateRow.createSpan({
        text: `Date: ${dateInExtensiveFormat(item.startDay, item.startTimeOfDay, calConfig)}`,
        cls: Css.tooltip.suffixRow
      })
    }
  }

  private addRepetitionMetadata(container: HTMLDivElement, repeatRule: RepeatRule) {
    const {delta, step} = repeatRule
    /*
     * TODO: if delta is very big and step = `day` -> round down to years
     */
    const text = delta > 1 ? `Repeats every ${formatIntegerWithCommas(delta)} ${step}s` : `Repeats every ${step}`
    container.createDiv({text, cls: Css.tooltip.suffixRow})
  }

  /** Adds absolute start and end day to tooltip. Use to compare events. */
  private addAbsoluteDayCount(container: HTMLDivElement, item: GanttItem) {
    const {startDay, endDay} = item
    const text = (!Number.isNaN(endDay) && endDay > startDay)
      ? `Absolute days: ${formatIntegerWithCommas(startDay)} to ${formatIntegerWithCommas(endDay)}`
      : `Absolute day: ${formatIntegerWithCommas(startDay)}`
    container.createDiv({text, cls: Css.tooltip.suffixRow})
  }

  private get addDaySuffixToTooltipTitle(): boolean {
    return this.settings.uxAddDaySuffixToTooltipTitle
  }

  private get hasSelectedBaseProperties(): boolean {
    return this.chartCtx.bases?.hasSelectedProperties() ?? false
  }
}

function dateInExtensiveFormat(days: number, timeOfDay: TimeOfDayParsed, cc: CalendarConfig): string {
  const date = createAxisDateDescription(days, cc, false, false, false, true)
  const time = Time.toHumanReadableTime(timeOfDay, cc, true)
  return date + (time ? ` at ${time}` : '')
}
