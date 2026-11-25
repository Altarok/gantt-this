import {GanttItem} from '../types/settings-types'

function findAvailableLane(lanes: GanttItem[][], item: GanttItem): number | undefined {
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i]
    if (!lane) continue
    const lastItem = lane[lane.length - 1]
    if (lastItem && lastItem.endDayWithTimeOfDay < item.startDayWithTimeOfDay - 1) return i
  }
  return undefined
}


/**
 * Assigns vertical lane indices to timeline items and returns them in render order.
 */
export class LaneAssigner {

  /**
   * Packs standalone non-era items into lanes with a 1-day minimum gap,
   * attaches recurring instances to their parent event's lane, and preserves
   * era items at the front of the output list.
   *
   * @param items - Timeline items to arrange into vertical lanes.
   * @returns Ordered items and the total number of lanes created.
   */
  static sortEventsIntoLanes(items: GanttItem[]): { sortedItems: GanttItem[], totalLanes: number } {

    const eraEvents = items.filter(i => i.displayType === 'era')
    const sortableEvents = items
    .filter(i => i.displayType !== 'era' && !i.isRecurringInstance)
    .sort((a, b) => a.startDayWithTimeOfDay - b.startDayWithTimeOfDay)

    const laneIndexByEventId = new Map<string, number>()
    const lanes: GanttItem[][] = []

    /* find a lane for each event to be placed in */
    for (const item of sortableEvents) {
      const laneIndex = findAvailableLane(lanes, item)
      if (laneIndex !== undefined) {
        /* add to existing lane */
        lanes[laneIndex]?.push(item)
        item.lane = laneIndex
        laneIndexByEventId.set(item.id, laneIndex)
      } else {
        /* create new lane */
        const newLaneIndex = lanes.length
        lanes.push([item])
        item.lane = newLaneIndex
        laneIndexByEventId.set(item.id, newLaneIndex)
      }
    }

    const recurringInstances = items.filter(i => i.displayType !== 'era' && i.isRecurringInstance === true)
    recurringInstances.forEach(item => {
      item.lane = (item.parentEventId !== undefined) ? (laneIndexByEventId.get(item.parentEventId) ?? 0) : 0
    })

    const sortedItems = [...eraEvents, ...sortableEvents, ...recurringInstances]
    return {
      sortedItems,
      totalLanes: lanes.length
    }

  }


}
