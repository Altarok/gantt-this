import {svgUrl} from '../const/constants'
import {GanttChartSettings, GanttItem, GroupOrCalendarSettings, PluginSettings} from '../const/types'

export const Util = {
  createSVGElement,
  filterActivelyShownEventData: filterActiveEventData
}

function createSVGElement<K extends keyof SVGElementTagNameMap>(tag: K, cssClass?: string): SVGElementTagNameMap[K] {
  const element = window.document.createElementNS(svgUrl, tag)
  if (cssClass) element.setAttribute('class', cssClass)
  return element
}


function filterActiveEventData(rawData: GanttItem[],
                               pluginSettings: PluginSettings,
                               ganttChartSettings: GanttChartSettings): GanttItem[] {

//  const {groups: groupConfigs, calendars: calendarConfigs} = pluginSettings

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
