import {Css, svgUrl} from '../const/constants'
import {GanttChartSettings, GanttItem, GroupOrCalendarSettings, PluginSettings} from '../const/types'

export const Util = {
  createSVGElement,
  filterActivelyShownEventData: filterActiveEventData,

  createVerticalLine
}

function createSVGElement<K extends keyof SVGElementTagNameMap>(tag: K, cssClass?: string): SVGElementTagNameMap[K] {
  const element = window.document.createElementNS(svgUrl, tag)
  if (cssClass) element.setAttribute('class', cssClass)
  return element
}

function filterActiveEventData(rawData: GanttItem[],
                               pluginSettings: PluginSettings,
                               ganttChartSettings: GanttChartSettings): GanttItem[] {

  const mappedGrpConfigs: Record<string, GroupOrCalendarSettings> = Object.fromEntries(pluginSettings.groups.map((g: GroupOrCalendarSettings) => [g.id, g]))
  const mappedCalConfigs: Record<string, GroupOrCalendarSettings> = Object.fromEntries(pluginSettings.calendars.map((c: GroupOrCalendarSettings) => [c.id, c]))

  let activeData: GanttItem[] = []

  if (ganttChartSettings.showEras) activeData = activeData.concat(rawData.filter(d => {
    const grp: GroupOrCalendarSettings | undefined = mappedGrpConfigs[d.group] ?? undefined
    const cal: GroupOrCalendarSettings | undefined = mappedCalConfigs[d.calendarType] ?? undefined

    return d.displayType === 'era' && (!grp || grp?.visible) && cal?.visible
  }))

  if (ganttChartSettings.showBars) activeData = activeData.concat(rawData.filter(d => {
    const grp: GroupOrCalendarSettings | undefined = mappedGrpConfigs[d.group] ?? undefined
    const cal: GroupOrCalendarSettings | undefined = mappedCalConfigs[d.calendarType] ?? undefined

    return d.displayType === 'bar' && (!grp || grp?.visible) && cal?.visible
  }))

  if (ganttChartSettings.showPoints) activeData = activeData.concat(rawData.filter(d => {
    const grp: GroupOrCalendarSettings | undefined = mappedGrpConfigs[d.group] ?? undefined
    const cal: GroupOrCalendarSettings | undefined = mappedCalConfigs[d.calendarType] ?? undefined

    return (d.displayType === 'point' || d.displayType === 'diamond' || d.displayType === 'vertical-line' || (d.displayType === 'icon' && !!d.displayIcon))
      && (!grp || grp?.visible) && cal?.visible
  }))

  return activeData
}

function createVerticalLine(pluginSettings: PluginSettings,
                            d: GanttItem,
                            x1: number,
                            width: number,
                            firstYValue: number, totalChartHeight: number): SVGLineElement {
  const line = Util.createSVGElement('line', Css.item.line)
  line.setAttribute('x1', x1.toString())
  line.setAttribute('x2', x1.toString())
  line.setAttribute('y1', String(firstYValue ?? 0))
  line.setAttribute('y2', totalChartHeight.toString())
  line.setAttribute('stroke-width', pluginSettings.uxVerticalLineEventWidth.toString())
  if (d.color) line.setAttribute('stroke', d.color ?? 'red')
  line.setAttribute('data-id', d.id.toString())
  return line
}
