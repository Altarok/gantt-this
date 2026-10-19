import {GroupOrCalendarSettings} from './settings-types'

export function createFallbackGroupConfig(groupName: string): GroupOrCalendarSettings {
  return {
    id: groupName,
    visible: true,
    unknown: true
  }
}
